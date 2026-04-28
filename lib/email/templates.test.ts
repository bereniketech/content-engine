import { describe, it, expect } from 'vitest';
import { buildEmail } from './templates';

describe('buildEmail', () => {
  it('builds magic_link email', () => {
    const { subject, html } = buildEmail('magic_link', { magicUrl: 'https://example.com/link' });
    expect(subject).toBe('Your login link');
    expect(html).toContain('https://example.com/link');
  });

  it('builds signup_verify_otp with code', () => {
    const { html } = buildEmail('signup_verify_otp', { otp: '123456' });
    expect(html).toContain('123456');
  });

  it('builds all 14 templates without throwing', () => {
    const templates = [
      ['magic_link', { magicUrl: 'u' }],
      ['signup_verify_otp', { otp: '123' }],
      ['signup_verify_resend', { otp: '456' }],
      ['welcome', { email: 'x@y.z', credits: 50 }],
      ['payment_captured', { currency: 'INR', amount: 900 }],
      ['payment_failed', { reason: 'Insufficient funds' }],
      ['subscription_activated', {}],
      ['subscription_renewed', {}],
      ['subscription_past_due', {}],
      ['subscription_cancelled', { periodEnd: '2026-05-01' }],
      ['low_credits_alert', { balance: 5, topupUrl: 'https://x/pricing' }],
      ['team_invite', { team_name: 'Acme', inviter: 'boss@acme.com', accept_url: 'https://x/accept' }],
      ['team_member_removed', { team_name: 'Acme' }],
      ['account_blocked', {}],
    ] as const;

    for (const [template, data] of templates) {
      const result = buildEmail(template, data as Record<string, unknown>);
      expect(result.subject).toBeTruthy();
      expect(result.html).toBeTruthy();
      expect(result.text).toBeTruthy();
    }
  });

  it('throws on unknown template', () => {
    expect(() => buildEmail('unknown' as never, {})).toThrow('Unknown template');
  });
});
