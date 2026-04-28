jest.mock('@/lib/abuse/emailValidate', () => ({
  validateEmail: jest.fn(),
}));

const limiterMock = { limit: jest.fn() };
jest.mock('@/lib/abuse/ratelimit', () => ({
  createRateLimiter: jest.fn(() => limiterMock),
}));

import { POST } from './route';
import { validateEmail } from '@/lib/abuse/emailValidate';

function makeReq(body: unknown, ip = '203.0.113.10'): any {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === 'x-forwarded-for' ? ip : null),
    },
    json: async () => body,
  };
}

describe('POST /api/email/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    limiterMock.limit.mockResolvedValue({ success: true });
  });

  it('returns 200 with validation result', async () => {
    (validateEmail as jest.Mock).mockResolvedValue({
      valid: true, mx: true, disposable: false,
      suggestion: null, domain_reputation_score: 90,
    });
    const res: any = await POST(makeReq({ email: 'a@gmail.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.domain_reputation_score).toBe(90);
  });

  it('returns 400 when email missing', async () => {
    const res: any = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('EMAIL_REQUIRED');
  });

  it('returns 400 when body is not JSON', async () => {
    const req: any = {
      headers: { get: () => '203.0.113.10' },
      json: async () => { throw new Error('bad json'); },
    };
    const res: any = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('EMAIL_REQUIRED');
  });

  it('returns 422 when email format invalid', async () => {
    (validateEmail as jest.Mock).mockResolvedValue({
      valid: false, mx: false, disposable: false,
      suggestion: null, domain_reputation_score: 0,
    });
    const res: any = await POST(makeReq({ email: 'bad' }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('INVALID_EMAIL_FORMAT');
  });

  it('returns 429 when rate limited', async () => {
    limiterMock.limit.mockResolvedValue({ success: false });
    const res: any = await POST(makeReq({ email: 'a@gmail.com' }));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('RATE_LIMITED');
  });

  it('returns 500 on unexpected error', async () => {
    (validateEmail as jest.Mock).mockRejectedValue(new Error('boom'));
    const res: any = await POST(makeReq({ email: 'a@gmail.com' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('EMAIL_VALIDATE_FAILED');
  });
});
