import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      incr: async (k: string) => { const n = ((store.get(k) as number) ?? 0) + 1; store.set(k, n); return n; },
      expire: async () => 1,
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: unknown) => { store.set(k, v); return 'OK'; },
    }),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => Promise.resolve({ count: 0, data: [] }),
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
        count: 'exact',
        head: true,
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  }),
}));

vi.mock('@/lib/abuse/trust', () => ({
  applyTrustEvent: vi.fn().mockResolvedValue(undefined),
}));

import { checkIpSignupLimit, detectVpn, checkDeviceFingerprint } from './ipControl';

describe('checkIpSignupLimit', () => {
  beforeEach(() => { store.clear(); });

  it('allows first 3 signups from same IP', async () => {
    const a = await checkIpSignupLimit('1.2.3.4');
    const b = await checkIpSignupLimit('1.2.3.4');
    const c = await checkIpSignupLimit('1.2.3.4');
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    expect(c.allowed).toBe(true);
  });

  it('returns count > 3 on 4th signup from same IP', async () => {
    await checkIpSignupLimit('5.6.7.8');
    await checkIpSignupLimit('5.6.7.8');
    await checkIpSignupLimit('5.6.7.8');
    const fourth = await checkIpSignupLimit('5.6.7.8');
    expect(fourth.count).toBeGreaterThan(3);
  });
});

describe('detectVpn', () => {
  beforeEach(() => {
    store.clear();
    global.fetch = vi.fn();
  });

  it('returns isVpn=true when IPQS reports vpn', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vpn: true, proxy: false }),
    });
    const r = await detectVpn('11.22.33.44');
    expect(r.isVpn).toBe(true);
    expect(r.cached).toBe(false);
  });

  it('fail-opens when IPQS errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('timeout'));
    const r = await detectVpn('22.33.44.55');
    expect(r.isVpn).toBe(false);
  });

  it('returns cached value on second call', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ vpn: false, proxy: false }) });
    await detectVpn('33.44.55.66');
    const r2 = await detectVpn('33.44.55.66');
    expect(r2.cached).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('checkDeviceFingerprint', () => {
  it('allows first device occurrence', async () => {
    const r = await checkDeviceFingerprint('fp-new-1', 'user-1');
    expect(r.blocked).toBe(false);
    expect(r.accountCount).toBe(0);
  });
});
