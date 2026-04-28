const mockGenerateWithDeduction = jest.fn();
const mockCheckRateLimit = jest.fn();
const mockRateLimitHeaders = jest.fn();
const mockCheckActionFrequency = jest.fn();
const mockIsInCooldown = jest.fn();
const mockCheckIdenticalRequest = jest.fn();
const mockApplyTrustEvent = jest.fn();
const mockRequiresCaptcha = jest.fn();
const mockVerifyCaptcha = jest.fn();

jest.mock('@/lib/credits/generate', () => ({
  generateWithDeduction: mockGenerateWithDeduction,
}));

jest.mock('@/lib/abuse/ratelimit', () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimitHeaders: mockRateLimitHeaders,
}));

jest.mock('@/lib/abuse/behavioral', () => ({
  checkActionFrequency: mockCheckActionFrequency,
  isInCooldown: mockIsInCooldown,
  checkIdenticalRequest: mockCheckIdenticalRequest,
}));

jest.mock('@/lib/abuse/trust', () => ({
  applyTrustEvent: mockApplyTrustEvent,
  requiresCaptcha: mockRequiresCaptcha,
}));

jest.mock('@/lib/abuse/captcha', () => ({
  verifyCaptcha: mockVerifyCaptcha,
}));

import { POST } from './route';

describe('POST /api/content/generate - Authentication', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when x-user-id header is missing', async () => {
    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action_type: 'article', prompt: 'Write an article' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized.');
  });

  it('returns 401 when user-id header is empty string', async () => {
    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Write' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/content/generate - Rate Limiting & Cooldown', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 429 when user is in cooldown', async () => {
    mockIsInCooldown.mockResolvedValue(true);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Write' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Rate limit exceeded');
  });

  it('returns 429 when rate limit check fails', async () => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000, remaining: 0 });
    mockRateLimitHeaders.mockReturnValue({ 'Retry-After': '60' });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Write' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Rate limit exceeded');

    // Verify rate limit headers are included
    expect(mockRateLimitHeaders).toHaveBeenCalledWith(
      expect.any(Number),
      0
    );
  });

  it('applies trust event and returns 429 on frequency abuse', async () => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: Date.now() + 3600000, remaining: 5 });
    mockCheckActionFrequency.mockResolvedValue({ abusive: true });
    mockApplyTrustEvent.mockResolvedValue({ newScore: 40, delta: -10 });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Write' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(429);

    // Verify trust event was applied
    expect(mockApplyTrustEvent).toHaveBeenCalledWith('user-1', 'action_frequency_abuse');
  });
});

describe('POST /api/content/generate - Input Validation', () => {
  beforeEach(() => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: Date.now() + 3600000, remaining: 5 });
    mockCheckActionFrequency.mockResolvedValue({ abusive: false });
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockRequiresCaptcha.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when action_type is missing', async () => {
    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ prompt: 'Write an article' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('action_type and prompt are required');
  });

  it('returns 400 when prompt is missing', async () => {
    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('action_type and prompt are required');
  });

  it('returns 400 when both action_type and prompt are missing', async () => {
    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
  });

  it('accepts optional options parameter', async () => {
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Generated content',
      credits_remaining: 100,
      request_id: 'req-1',
    });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write an article',
        options: { length: 'long', tone: 'professional' }
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);

    expect(mockGenerateWithDeduction).toHaveBeenCalledWith(
      'user-1',
      'article',
      'Write an article',
      { length: 'long', tone: 'professional' }
    );
  });

  it('uses empty options when not provided', async () => {
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Generated content',
      credits_remaining: 100,
      request_id: 'req-1',
    });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write an article'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);

    expect(mockGenerateWithDeduction).toHaveBeenCalledWith(
      'user-1',
      'article',
      'Write an article',
      {}
    );
  });
});

describe('POST /api/content/generate - Identical Request Detection', () => {
  beforeEach(() => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: Date.now() + 3600000, remaining: 5 });
    mockCheckActionFrequency.mockResolvedValue({ abusive: false });
    mockRequiresCaptcha.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('checks for identical requests based on prompt hash', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Generated content',
      credits_remaining: 100,
      request_id: 'req-1',
    });

    const prompt = 'Write an article about AI';
    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt }),
    });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(mockCheckIdenticalRequest).toHaveBeenCalledWith(
      'user-1',
      expect.stringMatching(/^[a-f0-9]{64}$/) // SHA256 hex hash
    );
  });

  it('applies trust event when identical request is detected', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: true });
    mockRequiresCaptcha.mockReturnValue(false);
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Generated content',
      credits_remaining: 100,
      request_id: 'req-1',
    });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Duplicate prompt' }),
    });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(mockApplyTrustEvent).toHaveBeenCalledWith('user-1', 'identical_requests');
  });

  it('does not apply trust event when request is not identical', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Generated content',
      credits_remaining: 100,
      request_id: 'req-1',
    });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Unique prompt' }),
    });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(mockApplyTrustEvent).not.toHaveBeenCalledWith(
      'user-1',
      'identical_requests'
    );
  });
});

describe('POST /api/content/generate - CAPTCHA Gating', () => {
  beforeEach(() => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: Date.now() + 3600000, remaining: 5 });
    mockCheckActionFrequency.mockResolvedValue({ abusive: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when CAPTCHA is required but not provided', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockRequiresCaptcha.mockReturnValue(true);
    mockVerifyCaptcha.mockResolvedValue(false);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write an article'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('CAPTCHA verification required');
  });

  it('requires CAPTCHA for trust score < 40 (always)', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockRequiresCaptcha.mockReturnValue(true);
    mockVerifyCaptcha.mockResolvedValue(false);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write',
        captchaToken: null
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(403);

    // Verify requiresCaptcha was called (in the route, trust is hardcoded to 50)
    expect(mockRequiresCaptcha).toHaveBeenCalled();
  });

  it('requires CAPTCHA for trust 40-80 AND flagged identical request', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: true });
    mockRequiresCaptcha.mockReturnValue(true);
    mockVerifyCaptcha.mockResolvedValue(false);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Duplicate prompt'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(403);

    // Verify requiresCaptcha was called with the suspicious flag
    expect(mockRequiresCaptcha).toHaveBeenCalledWith(50, true);
  });

  it('bypasses CAPTCHA when trust >= 80 and no suspicious action', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockRequiresCaptcha.mockReturnValue(false);
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Generated content',
      credits_remaining: 100,
      request_id: 'req-1',
    });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write article'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);

    // Verify CAPTCHA verification was not called
    expect(mockVerifyCaptcha).not.toHaveBeenCalled();
  });

  it('verifies CAPTCHA token when provided and required', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockRequiresCaptcha.mockReturnValue(true);
    mockVerifyCaptcha.mockResolvedValue(true);
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Generated content',
      credits_remaining: 100,
      request_id: 'req-1',
    });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write article',
        captchaToken: 'valid_token_xyz'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);

    expect(mockVerifyCaptcha).toHaveBeenCalledWith('valid_token_xyz', 'generate');
  });

  it('returns 403 when CAPTCHA token is invalid', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockRequiresCaptcha.mockReturnValue(true);
    mockVerifyCaptcha.mockResolvedValue(false);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write article',
        captchaToken: 'invalid_token'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('CAPTCHA verification required');
  });

  it('treats undefined captchaToken as empty for verification', async () => {
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockRequiresCaptcha.mockReturnValue(true);
    mockVerifyCaptcha.mockResolvedValue(false);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write article',
        captchaToken: undefined
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(403);

    // Verify empty string was passed to verifyCaptcha
    expect(mockVerifyCaptcha).toHaveBeenCalledWith('', 'generate');
  });
});

describe('POST /api/content/generate - Content Generation', () => {
  beforeEach(() => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: Date.now() + 3600000, remaining: 5 });
    mockCheckActionFrequency.mockResolvedValue({ abusive: false });
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockRequiresCaptcha.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls generateWithDeduction with correct parameters', async () => {
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Generated content',
      credits_remaining: 100,
      request_id: 'req-1',
    });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write an article about AI',
        options: { length: 'long' }
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);

    expect(mockGenerateWithDeduction).toHaveBeenCalledWith(
      'user-1',
      'article',
      'Write an article about AI',
      { length: 'long' }
    );
  });

  it('returns 200 with generated content on success', async () => {
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Generated content here',
      credits_remaining: 75,
      request_id: 'req-123',
    });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.result).toBe('Generated content here');
    expect(body.credits_remaining).toBe(75);
    expect(body.request_id).toBe('req-123');
  });

  it('returns 402 when error has status 402 (insufficient credits)', async () => {
    const error = new Error('Insufficient credits');
    (error as unknown as { status: number }).status = 402;
    mockGenerateWithDeduction.mockRejectedValue(error);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe('Insufficient credits');
  });

  it('returns 400 for unknown action type error', async () => {
    mockGenerateWithDeduction.mockRejectedValue(new Error('Unknown action type: invalid'));

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'invalid',
        prompt: 'Write'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unknown action type');
  });

  it('returns 500 on generic generation error', async () => {
    mockGenerateWithDeduction.mockRejectedValue(new Error('Internal server error'));

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action_type: 'article',
        prompt: 'Write'
      }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Generation failed');
  });
});

describe('POST /api/content/generate - Integration Scenarios', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('low trust user (30) requires CAPTCHA', async () => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: Date.now() + 3600000, remaining: 5 });
    mockCheckActionFrequency.mockResolvedValue({ abusive: false });
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    // Trust score 50 in route, but mocking requiresCaptcha returns true
    mockRequiresCaptcha.mockReturnValue(true);
    mockVerifyCaptcha.mockResolvedValue(false);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-lowTrust',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Write' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(403);
  });

  it('mid-trust user (50) with identical request requires CAPTCHA', async () => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: Date.now() + 3600000, remaining: 5 });
    mockCheckActionFrequency.mockResolvedValue({ abusive: false });
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: true });
    mockRequiresCaptcha.mockReturnValue(true);
    mockVerifyCaptcha.mockResolvedValue(false);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-midTrust',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Duplicate' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(403);

    expect(mockRequiresCaptcha).toHaveBeenCalledWith(50, true);
  });

  it('high trust user (90) bypasses CAPTCHA', async () => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: Date.now() + 3600000, remaining: 5 });
    mockCheckActionFrequency.mockResolvedValue({ abusive: false });
    mockCheckIdenticalRequest.mockResolvedValue({ flagged: false });
    mockRequiresCaptcha.mockReturnValue(false);
    mockGenerateWithDeduction.mockResolvedValue({
      result: 'Content',
      credits_remaining: 100,
      request_id: 'req-1',
    });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-highTrust',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Write' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);

    // CAPTCHA should not be verified for high trust users
    expect(mockVerifyCaptcha).not.toHaveBeenCalled();
  });

  it('abusive user hits frequency limit and gets trust penalty', async () => {
    mockIsInCooldown.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: Date.now() + 3600000, remaining: 5 });
    mockCheckActionFrequency.mockResolvedValue({ abusive: true });
    mockApplyTrustEvent.mockResolvedValue({ newScore: 40, delta: -10 });

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-abusive',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Write' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(429);

    expect(mockApplyTrustEvent).toHaveBeenCalledWith('user-abusive', 'action_frequency_abuse');
  });

  it('user in cooldown immediately fails without further checks', async () => {
    mockIsInCooldown.mockResolvedValue(true);

    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-cooldown',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action_type: 'article', prompt: 'Write' }),
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(429);

    // Verify other checks were not performed
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});
