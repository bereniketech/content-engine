import { rateLimitHeaders } from './ratelimit';

jest.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      evalsha: jest.fn(),
      scriptLoad: jest.fn(),
      eval: jest.fn().mockResolvedValue([1, Date.now() + 60000, 29]),
    }),
  },
}));

jest.mock('@upstash/ratelimit', () => {
  const mockLimit = jest.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000, remaining: 29 });
  return {
    Ratelimit: Object.assign(
      function () { return { limit: mockLimit }; },
      { slidingWindow: () => ({}) }
    ),
  };
});

describe('rateLimitHeaders', () => {
  it('returns Retry-After in seconds (rounded up, min 1)', () => {
    const reset = Date.now() + 5400;
    const headers = rateLimitHeaders(reset, 0);
    expect(Number(headers['Retry-After'])).toBeGreaterThanOrEqual(5);
    expect(headers['X-RateLimit-Remaining']).toBe('0');
  });

  it('floors Retry-After to 1 second when reset is past', () => {
    const headers = rateLimitHeaders(Date.now() - 1000, 0);
    expect(Number(headers['Retry-After'])).toBeGreaterThanOrEqual(1);
  });

  it('includes X-RateLimit-Reset as unix seconds', () => {
    const reset = Date.now() + 60000;
    const headers = rateLimitHeaders(reset, 5);
    expect(Number(headers['X-RateLimit-Reset'])).toBeGreaterThan(Date.now() / 1000);
  });
});
