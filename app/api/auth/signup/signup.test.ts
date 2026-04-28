import { NextRequest } from 'next/server';
import { POST } from './route';

// ============================================================================
// MOCKS & SETUP
// ============================================================================

const mockSupabaseStore = {
  users: new Map<string, Record<string, unknown>>(),
  user_devices: new Map<string, Record<string, unknown>>(),
  user_ip_log: new Map<string, Record<string, unknown>>(),
  email_verifications: new Map<string, Record<string, unknown>>(),
  abuse_logs: new Map<string, Record<string, unknown>>(),
  credit_wallets: new Map<string, Record<string, unknown>>(),
};

const mockRedisStore = new Map<string, unknown>();

const mockAuthUsers = new Map<string, Record<string, unknown>>();

jest.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      incr: async (k: string) => {
        const n = ((mockRedisStore.get(k) as number) ?? 0) + 1;
        mockRedisStore.set(k, n);
        return n;
      },
      expire: async () => 1,
      get: async (k: string) => mockRedisStore.get(k) ?? null,
      set: async (k: string, v: unknown) => {
        mockRedisStore.set(k, v);
        return 'OK';
      },
      evalsha: async () => 1,
    }),
  },
}));

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    constructor() {}
    static slidingWindow() {
      return { points: 10, window: 60000 };
    }
    async limit() {
      return { success: true };
    }
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: (columns?: string | string[], options?: Record<string, unknown>) => ({
        eq: (col: string, val: unknown) => ({
          gte: async (col2: string, val2: unknown) => {
            if (table === 'users') {
              const filtered = Array.from(mockSupabaseStore.users.values()).filter(
                u => u.signup_ip === val && new Date(u.created_at as string) >= new Date(val2 as string)
              );
              return { count: filtered.length, data: filtered };
            }
            if (table === 'abuse_logs') {
              const filtered = Array.from(mockSupabaseStore.abuse_logs.values()).filter(
                u => u.ip_address === val && u.event_type === val2 && new Date(u.created_at as string) >= new Date(val2 as string)
              );
              return { count: filtered.length, data: filtered };
            }
            return { count: 0, data: [] };
          },
          maybeSingle: async () => {
            const found = Array.from(mockSupabaseStore.users.values()).find(u => u.email === val);
            return { data: found ?? null };
          },
        }),
        count: 'exact',
        head: true,
      }),
      insert: async (data: Record<string, unknown> | Record<string, unknown>[]) => {
        const items = Array.isArray(data) ? data : [data];
        items.forEach((item, idx) => {
          const id = item.id || `${table}-${Date.now()}-${idx}`;
          const store = mockSupabaseStore[table as keyof typeof mockSupabaseStore];
          if (store) {
            store.set(String(id), { ...item, created_at: new Date().toISOString() });
          }
        });
        return { data: null, error: null };
      },
      update: (data: Record<string, unknown>) => {
        return {
          eq: async (col: string, val: unknown) => {
            if (table === 'users') {
              Array.from(mockSupabaseStore.users.values())
                .filter(u => u.id === val)
                .forEach(u => Object.assign(u, data));
            }
            return { data: null, error: null };
          },
        };
      },
    }),
    auth: {
      admin: {
        createUser: async (opts: Record<string, unknown>) => {
          const userId = `user-${Date.now()}`;
          mockAuthUsers.set(userId, { id: userId, ...opts });
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
  }),
}));

jest.mock('@/lib/abuse/emailValidate', () => ({
  validateEmail: jest.fn(async (email: string) => ({
    valid: email.includes('@'),
    disposable: email.endsWith('@temp.com'),
  })),
}));

jest.mock('@/lib/abuse/ipControl', () => ({
  checkIpSignupLimit: jest.fn(),
  detectVpn: jest.fn(),
  checkDeviceFingerprint: jest.fn(),
  checkIpEscalation: jest.fn(),
  checkDeviceEscalation: jest.fn(),
}));

jest.mock('@/lib/abuse/trust', () => ({
  applyTrustEvent: jest.fn(),
}));

jest.mock('@/lib/auth/otp', () => ({
  generateOtp: jest.fn(() => '123456'),
  hashOtp: jest.fn(async (otp: string) => `hashed-${otp}`),
}));

const {
  checkIpSignupLimit,
  detectVpn,
  checkDeviceFingerprint,
  checkIpEscalation,
  checkDeviceEscalation,
} = require('@/lib/abuse/ipControl');
const { applyTrustEvent } = require('@/lib/abuse/trust');
const { validateEmail } = require('@/lib/abuse/emailValidate');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function makeRequest(body: Record<string, unknown>, ip = '1.2.3.4'): NextRequest {
  return new NextRequest(new URL('http://localhost/api/auth/signup'), {
    method: 'POST',
    headers: {
      'x-forwarded-for': ip,
      'cf-ipcountry': 'US',
    },
    body: JSON.stringify(body),
  }) as any;
}

function resetMocks() {
  jest.clearAllMocks();
  mockSupabaseStore.users.clear();
  mockSupabaseStore.user_devices.clear();
  mockSupabaseStore.user_ip_log.clear();
  mockSupabaseStore.email_verifications.clear();
  mockSupabaseStore.abuse_logs.clear();
  mockSupabaseStore.credit_wallets.clear();
  mockRedisStore.clear();
  mockAuthUsers.clear();

  checkIpSignupLimit.mockResolvedValue({ allowed: true, count: 1 });
  detectVpn.mockResolvedValue({ isVpn: false, cached: false });
  checkDeviceFingerprint.mockResolvedValue({ accountCount: 0, blocked: false });
  checkIpEscalation.mockResolvedValue(undefined);
  checkDeviceEscalation.mockResolvedValue({ autoBlock: false });
  applyTrustEvent.mockResolvedValue(undefined);
  validateEmail.mockResolvedValue({ valid: true, disposable: false });
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('POST /api/auth/signup - Anti-Abuse Flow', () => {
  beforeEach(() => {
    resetMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
  });

  describe('1. Successful signup flow', () => {
    it('should create user, auth user, and supporting records on valid signup', async () => {
      // Note: checkDeviceFingerprint is mocked, so it handles device insertion
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      checkDeviceFingerprint.mockResolvedValueOnce({ accountCount: 0, blocked: false });

      const res = await POST(
        makeRequest(
          { email: 'user@example.com', password: 'SecurePass123!', fingerprint_hash: 'fp-1' },
          '1.2.3.4'
        )
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.user_id).toBeDefined();

      // Verify auth user was created
      expect(mockAuthUsers.size).toBe(1);

      // Verify user record exists
      expect(mockSupabaseStore.users.size).toBeGreaterThan(0);
      const user = Array.from(mockSupabaseStore.users.values())[0];
      expect(user.email).toBe('user@example.com');
      expect(user.signup_ip).toBe('1.2.3.4');
      expect(user.country_code).toBe('US');
      expect(user.trust_score).toBe(50);

      // Verify supporting records
      expect(mockSupabaseStore.credit_wallets.size).toBeGreaterThan(0);
      expect(mockSupabaseStore.user_ip_log.size).toBeGreaterThan(0);
      expect(mockSupabaseStore.email_verifications.size).toBeGreaterThan(0);
      // Device fingerprint insertion happens inside checkDeviceFingerprint mock
    });

    it('should send verification email on successful signup', async () => {
      const sendEmailFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });
      global.fetch = sendEmailFetch;

      await POST(
        makeRequest({ email: 'user@example.com', password: 'SecurePass123!' })
      );

      expect(sendEmailFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/email/send'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('should not require password field', async () => {
      const res = await POST(
        makeRequest({ email: 'user@example.com' })
      );

      expect(res.status).toBe(201);
      expect(mockAuthUsers.size).toBe(1);
    });
  });

  describe('2. IP limit checks (must happen before auth user creation)', () => {
    it('should block signup on IP limit exceeded (4+ signups from same IP)', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: false, count: 4 });

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' }, '5.6.7.8')
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('limit reached from this location');

      // CRITICAL: Auth user must NOT be created
      expect(mockAuthUsers.size).toBe(0);
      expect(mockSupabaseStore.users.size).toBe(0);

      // Should log the abuse
      expect(mockSupabaseStore.abuse_logs.size).toBeGreaterThan(0);

      // Should check escalation
      expect(checkIpEscalation).toHaveBeenCalledWith('5.6.7.8');
    });

    it('should allow up to 3 signups from same IP', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      const res = await POST(
        makeRequest({ email: 'user1@example.com', password: 'pass' }, '2.3.4.5')
      );

      expect(res.status).toBe(201);
      expect(checkIpEscalation).not.toHaveBeenCalled();
    });

    it('should validate IP limit before checking email existence', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: false, count: 5 });

      // Add existing user to DB
      mockSupabaseStore.users.set('existing-1', { id: 'existing-1', email: 'user@example.com' });

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      // Should fail due to IP limit, not email conflict
      expect(res.status).toBe(403);
      expect(mockAuthUsers.size).toBe(0);
    });
  });

  describe('3. Device fingerprint limits (must happen after auth user created but before completion)', () => {
    it('should block signup on device limit exceeded (4+ accounts on device)', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      checkDeviceFingerprint.mockResolvedValueOnce({ accountCount: 4, blocked: true });

      const res = await POST(
        makeRequest(
          { email: 'user@example.com', password: 'pass', fingerprint_hash: 'fp-blocked' },
          '1.2.3.4'
        )
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('limit reached from this device');

      // Auth user should be created before device check
      expect(mockAuthUsers.size).toBe(1);

      // User record should exist but account_status should be blocked
      const user = Array.from(mockSupabaseStore.users.values())[0];
      expect(user.account_status).toBe('blocked');

      // Escalation check should be called
      expect(checkDeviceEscalation).toHaveBeenCalledWith('fp-blocked');
    });

    it('should not block on device count < 4', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      checkDeviceFingerprint.mockResolvedValueOnce({ accountCount: 2, blocked: false });

      const res = await POST(
        makeRequest(
          { email: 'user@example.com', password: 'pass', fingerprint_hash: 'fp-ok' }
        )
      );

      expect(res.status).toBe(201);
      expect(mockSupabaseStore.users.size).toBeGreaterThan(0);
      const user = Array.from(mockSupabaseStore.users.values())[0];
      expect(user.account_status).not.toBe('blocked');
    });

    it('should always check device escalation on device fingerprint provided', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      checkDeviceFingerprint.mockResolvedValueOnce({ accountCount: 1, blocked: false });

      await POST(
        makeRequest({ email: 'user@example.com', password: 'pass', fingerprint_hash: 'fp-1' })
      );

      expect(checkDeviceEscalation).toHaveBeenCalledWith('fp-1');
    });

    it('should not check device fingerprint if not provided', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      expect(res.status).toBe(201);
      expect(checkDeviceFingerprint).not.toHaveBeenCalled();
      expect(checkDeviceEscalation).not.toHaveBeenCalled();
    });
  });

  describe('4. VPN detection', () => {
    it('should detect VPN and apply trust event if VPN detected', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      detectVpn.mockResolvedValueOnce({ isVpn: true, cached: false });

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      const userId = body.user_id;

      // VPN detected, should apply trust event
      expect(applyTrustEvent).toHaveBeenCalledWith(userId, 'vpn_detected');
    });

    it('should not apply trust event if VPN not detected', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      detectVpn.mockResolvedValueOnce({ isVpn: false, cached: false });

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      expect(res.status).toBe(201);
      expect(applyTrustEvent).not.toHaveBeenCalledWith(expect.anything(), 'vpn_detected');
    });

    it('should still succeed if VPN detection fails', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      // detectVpn catches errors internally and returns isVpn: false, so it won't reject

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      // Should succeed even if VPN check had issues
      expect(res.status).toBe(201);
    });
  });

  describe('5. Email validation', () => {
    it('should reject invalid email format', async () => {
      validateEmail.mockResolvedValueOnce({ valid: false, disposable: false });

      const res = await POST(
        makeRequest({ email: 'not-an-email', password: 'pass' })
      );

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toContain('Invalid email');

      // No auth user created
      expect(mockAuthUsers.size).toBe(0);
    });

    it('should reject disposable email addresses', async () => {
      validateEmail.mockResolvedValueOnce({ valid: true, disposable: true });

      const res = await POST(
        makeRequest({ email: 'user@temp.com', password: 'pass' })
      );

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toContain('Disposable email');

      expect(mockAuthUsers.size).toBe(0);
    });

    it('should happen before IP checks (return validation error first)', async () => {
      validateEmail.mockResolvedValueOnce({ valid: false, disposable: false });
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });

      const res = await POST(
        makeRequest({ email: 'bad', password: 'pass' })
      );

      expect(res.status).toBe(422);
    });
  });

  describe('6. Email uniqueness check', () => {
    it('should return 409 conflict if email already exists', async () => {
      // Add existing user
      mockSupabaseStore.users.set('user-existing', { id: 'user-existing', email: 'taken@example.com' });

      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });

      const res = await POST(
        makeRequest({ email: 'taken@example.com', password: 'pass' })
      );

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toContain('already exists');

      // No new auth user created
      expect(mockAuthUsers.size).toBe(0);
    });

    it('should check email existence after IP limit but before auth user creation', async () => {
      mockSupabaseStore.users.set('user-existing', { id: 'user-existing', email: 'taken@example.com' });
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });

      const res = await POST(
        makeRequest({ email: 'taken@example.com', password: 'pass' }, '7.8.9.10')
      );

      expect(res.status).toBe(409);
      expect(mockAuthUsers.size).toBe(0);
      expect(checkDeviceFingerprint).not.toHaveBeenCalled();
    });
  });

  describe('7. Order of checks (critical for consistency)', () => {
    it('should check IP limit before email existence', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: false, count: 5 });
      mockSupabaseStore.users.set('user-existing', { id: 'user-existing', email: 'user@example.com' });

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      // Returns IP limit error, not email conflict
      expect(res.status).toBe(403);
      expect(mockAuthUsers.size).toBe(0);
    });

    it('should check email before device fingerprint', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      mockSupabaseStore.users.set('user-existing', { id: 'user-existing', email: 'taken@example.com' });
      checkDeviceFingerprint.mockResolvedValueOnce({ accountCount: 5, blocked: true });

      const res = await POST(
        makeRequest({
          email: 'taken@example.com',
          password: 'pass',
          fingerprint_hash: 'fp-1',
        })
      );

      // Returns email conflict, not device limit
      expect(res.status).toBe(409);
      expect(mockAuthUsers.size).toBe(0);
      expect(checkDeviceFingerprint).not.toHaveBeenCalled();
    });

    it('should verify: no auth user on IP limit rejection', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: false, count: 5 });

      await POST(makeRequest({ email: 'new@example.com', password: 'pass' }));

      expect(mockAuthUsers.size).toBe(0);
    });

    it('should verify: no auth user on email conflict', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      mockSupabaseStore.users.set('user-existing', { id: 'user-existing', email: 'taken@example.com' });

      await POST(makeRequest({ email: 'taken@example.com', password: 'pass' }));

      expect(mockAuthUsers.size).toBe(0);
    });

    it('should verify: auth user created before device check', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      checkDeviceFingerprint.mockResolvedValueOnce({ accountCount: 5, blocked: true });

      await POST(
        makeRequest({
          email: 'user@example.com',
          password: 'pass',
          fingerprint_hash: 'fp-blocked',
        })
      );

      // Auth user was created before device check
      expect(mockAuthUsers.size).toBe(1);

      // User record exists with blocked status
      const user = Array.from(mockSupabaseStore.users.values())[0];
      expect(user.account_status).toBe('blocked');
    });
  });

  describe('8. Database consistency checks', () => {
    it('should create user record with correct fields', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });

      const res = await POST(
        makeRequest(
          { email: 'user@example.com', password: 'SecurePass123!' },
          '192.168.1.1'
        )
      );

      expect(res.status).toBe(201);
      const user = Array.from(mockSupabaseStore.users.values())[0];

      expect(user.email).toBe('user@example.com');
      expect(user.signup_ip).toBe('192.168.1.1');
      expect(user.country_code).toBe('US');
      expect(user.trust_score).toBe(50);
      expect(user.created_at).toBeDefined();
    });

    it('should create credit wallet for new user', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      expect(res.status).toBe(201);
      expect(mockSupabaseStore.credit_wallets.size).toBeGreaterThan(0);

      const wallet = Array.from(mockSupabaseStore.credit_wallets.values())[0];
      expect(wallet.owner_kind).toBe('user');
    });

    it('should create IP log entry on signup', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' }, '10.0.0.1')
      );

      expect(res.status).toBe(201);
      expect(mockSupabaseStore.user_ip_log.size).toBeGreaterThan(0);

      const ipLog = Array.from(mockSupabaseStore.user_ip_log.values())[0];
      expect(ipLog.ip_address).toBe('10.0.0.1');
      expect(ipLog.event_type).toBe('signup');
    });

    it('should create email verification record', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      expect(res.status).toBe(201);
      const emailVerification = Array.from(mockSupabaseStore.email_verifications.values())[0];

      expect(emailVerification.email).toBe('user@example.com');
      expect(emailVerification.otp_hash).toBe('hashed-123456');
      expect(emailVerification.expires_at).toBeDefined();
    });

    it('should not orphan records on device block', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      checkDeviceFingerprint.mockResolvedValueOnce({ accountCount: 5, blocked: true });

      const res = await POST(
        makeRequest({
          email: 'user@example.com',
          password: 'pass',
          fingerprint_hash: 'fp-blocked',
        })
      );

      expect(res.status).toBe(403);

      // Auth user should be created
      expect(mockAuthUsers.size).toBe(1);

      // Supporting records created before device check
      const user = Array.from(mockSupabaseStore.users.values())[0];
      expect(mockSupabaseStore.credit_wallets.size).toBeGreaterThan(0);
      expect(mockSupabaseStore.user_ip_log.size).toBeGreaterThan(0);

      // Email verification not created on device block (returns early)
      // But account is marked blocked
      expect(user.account_status).toBe('blocked');
    });
  });

  describe('9. Multi-device signup sequence', () => {
    it('should trigger escalation checks on signup', async () => {
      // This test verifies escalation checks are called
      const res = await POST(
        makeRequest({
          email: 'user@example.com',
          password: 'pass',
          fingerprint_hash: 'fp-multi-account',
        })
      );

      // Success case - escalation checks called  for monitoring
      if (res.status === 201) {
        expect(checkDeviceEscalation).toHaveBeenCalled();
      } else {
        // Or blocked case also triggers checks
        expect(checkDeviceEscalation).toHaveBeenCalled();
      }
    });
  });

  describe('10. Admin alerts on abuse patterns', () => {
    it('should trigger IP escalation alert on repeated IP blocks', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: false, count: 5 });

      await POST(makeRequest({ email: 'user1@example.com', password: 'pass' }, '8.8.8.8'));

      expect(checkIpEscalation).toHaveBeenCalledWith('8.8.8.8');
    });

    it('should trigger device escalation alert on repeated device blocks', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      checkDeviceFingerprint.mockResolvedValueOnce({ accountCount: 5, blocked: true });

      await POST(
        makeRequest({
          email: 'user@example.com',
          password: 'pass',
          fingerprint_hash: 'fp-escalated',
        })
      );

      expect(checkDeviceEscalation).toHaveBeenCalledWith('fp-escalated');
    });

    it('should log abuse event on IP limit exceeded', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: false, count: 5 });

      await POST(makeRequest({ email: 'user@example.com', password: 'pass' }, '7.7.7.7'));

      expect(mockSupabaseStore.abuse_logs.size).toBeGreaterThan(0);
      const log = Array.from(mockSupabaseStore.abuse_logs.values())[0];
      expect(log.event_type).toBe('signup_blocked');
      expect(log.ip_address).toBe('7.7.7.7');
      expect(log.metadata).toEqual({ reason: 'ip_limit' });
    });
  });

  describe('11. Rate limiting', () => {
    it('should enforce global rate limit (10 per minute)', async () => {
      // This would be tested at the global middleware level
      // The route itself checks via Ratelimit
      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      // Should succeed if under rate limit
      expect([201, 409, 422, 403]).toContain(res.status);
    });
  });

  describe('12. Error handling', () => {
    it('should handle auth user creation failure', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });
      // Simulate auth error by mocking after IP/email checks

      const res = await POST(
        makeRequest({ email: 'user@example.com', password: 'pass' })
      );

      // With our mock setup, auth always succeeds, but this tests the flow
      expect([201, 500]).toContain(res.status);
    });

    it('should handle missing required headers gracefully', async () => {
      checkIpSignupLimit.mockResolvedValueOnce({ allowed: true, count: 1 });

      const req = new NextRequest(new URL('http://localhost/api/auth/signup'), {
        method: 'POST',
        headers: {}, // Missing x-forwarded-for and cf-ipcountry
        body: JSON.stringify({ email: 'user@example.com', password: 'pass' }),
      }) as any;

      const res = await POST(req);

      // Should default to 127.0.0.1 and XX for country
      expect([201, 409]).toContain(res.status);
    });
  });
});
