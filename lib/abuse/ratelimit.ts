import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const limiters = {
  'auth:ip':           new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'),  prefix: 'rl:auth:ip' }),
  'gen:user':          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'),  prefix: 'rl:gen:user' }),
  'webhook:ip':        new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m'), prefix: 'rl:webhook:ip' }),
  'otp:user':          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '10 m'),  prefix: 'rl:otp:user' }),
  'magic:email':       new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '10 m'),  prefix: 'rl:magic:email' }),
  'signup:ip':         new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '24 h'),  prefix: 'rl:signup:ip' }),
  'email-validate:ip': new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'),  prefix: 'rl:email-validate:ip' }),
} as const;

export type RateLimitScope = keyof typeof limiters;

export async function checkRateLimit(
  scope: RateLimitScope,
  identifier: string
): Promise<{ success: boolean; reset: number; remaining: number }> {
  const result = await limiters[scope].limit(identifier);
  return { success: result.success, reset: result.reset, remaining: result.remaining };
}

export function rateLimitHeaders(reset: number, remaining: number): Record<string, string> {
  return {
    'Retry-After': String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
  };
}
