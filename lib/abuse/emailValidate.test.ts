jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('node:dns/promises', () => ({
  default: {
    resolveMx: jest.fn(),
  },
  resolveMx: jest.fn(),
}));

import dns from 'node:dns/promises';
import { createClient } from '@/lib/supabase/server';
import { validateEmail, suggestDomain, levenshtein } from './emailValidate';

function mockSupabaseBlock(domain: string | null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: domain ? { id: 'x' } : null,
      error: null,
    }),
  };
  (createClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });
}

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('gmail.com','gmail.com')).toBe(0);
  });
  it('counts single substitution', () => {
    expect(levenshtein('gmail.com','gmaul.com')).toBe(1);
  });
  it('handles empty', () => {
    expect(levenshtein('','abc')).toBe(3);
    expect(levenshtein('abc','')).toBe(3);
  });
});

describe('suggestDomain', () => {
  it('suggests gmail.com for gmial.com', () => {
    expect(suggestDomain('gmial.com')).toBe('gmail.com');
  });
  it('suggests yahoo.com for yaho.com', () => {
    expect(suggestDomain('yaho.com')).toBe('yahoo.com');
  });
  it('returns null when distance > 2', () => {
    expect(suggestDomain('completelydifferent.io')).toBeNull();
  });
  it('returns gmail.com itself unchanged (distance 0)', () => {
    expect(suggestDomain('gmail.com')).toBe('gmail.com');
  });
});

describe('validateEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns valid:false for malformed email', async () => {
    mockSupabaseBlock(null);
    const r = await validateEmail('not-an-email');
    expect(r).toEqual({
      valid: false, mx: false, disposable: false,
      suggestion: null, domain_reputation_score: 0,
    });
  });

  it('flags disposable domain (mailinator.com)', async () => {
    mockSupabaseBlock('mailinator.com');
    (dns.resolveMx as jest.Mock).mockResolvedValue([{ exchange: 'mx.mailinator.com', priority: 10 }]);
    const r = await validateEmail('foo@mailinator.com');
    expect(r.disposable).toBe(true);
    expect(r.domain_reputation_score).toBe(0);
  });

  it('reputation 90 for top provider with MX', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as jest.Mock).mockResolvedValue([{ exchange: 'gmail-smtp-in.l.google.com', priority: 5 }]);
    const r = await validateEmail('user@gmail.com');
    expect(r.valid).toBe(true);
    expect(r.mx).toBe(true);
    expect(r.disposable).toBe(false);
    expect(r.domain_reputation_score).toBe(90);
    expect(r.suggestion).toBeNull();
  });

  it('reputation 60 for unknown domain with MX', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as jest.Mock).mockResolvedValue([{ exchange: 'mail.acme.io', priority: 10 }]);
    const r = await validateEmail('user@acme.io');
    expect(r.domain_reputation_score).toBe(60);
  });

  it('reputation 10 when MX lookup fails', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as jest.Mock).mockRejectedValue(new Error('ENOTFOUND'));
    const r = await validateEmail('user@no-such-domain.test');
    expect(r.mx).toBe(false);
    expect(r.domain_reputation_score).toBe(10);
  });

  it('suggests gmail.com for typo gmial.com', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as jest.Mock).mockResolvedValue([{ exchange: 'mx.gmial.com', priority: 10 }]);
    const r = await validateEmail('user@gmial.com');
    expect(r.suggestion).toBe('gmail.com');
  });

  it('does not suggest when domain is itself a top provider', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as jest.Mock).mockResolvedValue([{ exchange: 'mx', priority: 10 }]);
    const r = await validateEmail('user@gmail.com');
    expect(r.suggestion).toBeNull();
  });
});
