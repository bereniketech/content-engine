---
task: 013
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [7, 11, 12]
---

# Task 013: Behavioral Analysis + Rate Limiting

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Replace the rate limit stub with a full Upstash sliding-window rate limiter across all scopes, add behavioral abuse detection (action frequency, identical requests, signup-speed bot signal), and wire reCAPTCHA v3 verification.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/abuse/behavioral.ts` | Action frequency, cooldown, identical-request, bot-signal helpers |
| `lib/abuse/captcha.ts` | reCAPTCHA v3 verification |
| `lib/abuse/ratelimit.test.ts` | Tests for ratelimit headers + scope routing |
| `lib/abuse/behavioral.test.ts` | Tests for frequency, cooldown, identical-request |

### Modify
| File | What to change |
|------|---------------|
| `lib/abuse/ratelimit.ts` (stub from task 5) | Replace with full Upstash Ratelimit per scope |
| `app/api/content/generate/route.ts` (task 9) | Add cooldown + frequency + identical + CAPTCHA gates |
| `middleware.ts` (task 7) | Wire webhook-burst alert |

---

## Dependencies
```bash
npm install @upstash/ratelimit
# ENV:
#   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (already set)
#   RECAPTCHA_SECRET_KEY
#   ADMIN_ALERT_WEBHOOK_URL (already set)
```

---

## API Contracts
```
checkRateLimit(scope: RateLimitScope, identifier: string)
  -> { success: boolean; reset: number; remaining: number }

rateLimitHeaders(reset: number, remaining: number) -> Record<string,string>

checkActionFrequency(userId) -> { abusive: boolean }
isInCooldown(userId) -> boolean
checkIdenticalRequest(userId, promptHash) -> { flagged: boolean }
checkSignupSpeed(userId, signupAt, firstActionAt) -> { botSignal: boolean }
verifyCaptcha(token: string, expectedAction?: string) -> Promise<boolean>
```

---

## Code Templates

### `lib/abuse/ratelimit.ts`
```typescript
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
```

### `lib/abuse/behavioral.ts`
```typescript
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function checkActionFrequency(userId: string): Promise<{ abusive: boolean }> {
  const key = `freq:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count > 30) {
    await redis.set(`cooldown:${userId}`, '1', { ex: 300 });
    return { abusive: true };
  }
  return { abusive: false };
}

export async function isInCooldown(userId: string): Promise<boolean> {
  return !!(await redis.get(`cooldown:${userId}`));
}

export async function checkIdenticalRequest(
  userId: string,
  promptHash: string
): Promise<{ flagged: boolean }> {
  const key = `identical:${userId}:${promptHash}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 1800);
  return { flagged: count > 10 };
}

export async function checkSignupSpeed(
  signupAt: Date,
  firstActionAt: Date
): Promise<{ botSignal: boolean }> {
  const diffMs = firstActionAt.getTime() - signupAt.getTime();
  return { botSignal: diffMs < 5000 };
}
```

### `lib/abuse/captcha.ts`
```typescript
export async function verifyCaptcha(
  token: string,
  expectedAction = 'generate'
): Promise<boolean> {
  if (!token) return false;
  try {
    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY!,
      response: token,
    });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean; score?: number; action?: string };
    if (!data.success) return false;
    if (data.action && data.action !== expectedAction) return false;
    return (data.score ?? 0) >= 0.5;
  } catch {
    return false;
  }
}
```

### Modification to `app/api/content/generate/route.ts`
```typescript
import crypto from 'node:crypto';
import { checkRateLimit, rateLimitHeaders } from '@/lib/abuse/ratelimit';
import { checkActionFrequency, isInCooldown, checkIdenticalRequest } from '@/lib/abuse/behavioral';
import { applyTrustEvent, requiresCaptcha, resolveTrustTier } from '@/lib/abuse/trust';
import { verifyCaptcha } from '@/lib/abuse/captcha';

// Inside POST handler, after auth + body parse:
if (await isInCooldown(userId)) {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Please try again later.' },
    { status: 429 }
  );
}

const rl = await checkRateLimit('gen:user', userId);
if (!rl.success) {
  return NextResponse.json(
    { error: 'Rate limit exceeded.' },
    { status: 429, headers: rateLimitHeaders(rl.reset, rl.remaining) }
  );
}

const freq = await checkActionFrequency(userId);
if (freq.abusive) {
  await applyTrustEvent(userId, 'action_frequency_abuse');
  return NextResponse.json(
    { error: 'Rate limit exceeded. Please try again later.' },
    { status: 429, headers: rateLimitHeaders(Date.now() + 300_000, 0) }
  );
}

const promptHash = crypto.createHash('sha256').update(body.prompt).digest('hex');
const identical = await checkIdenticalRequest(userId, promptHash);
if (identical.flagged) {
  await applyTrustEvent(userId, 'identical_requests');
}

const score = user.trust_score;
if (requiresCaptcha(score, identical.flagged)) {
  const ok = await verifyCaptcha(body.captchaToken ?? '', 'generate');
  if (!ok) {
    return NextResponse.json({ error: 'CAPTCHA verification required.' }, { status: 403 });
  }
}
```

### Modification to `middleware.ts`
```typescript
// In webhook path branch (e.g., /api/webhooks/*):
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
const rl = await checkRateLimit('webhook:ip', ip);
if (!rl.success) {
  // Burst detected — fire admin alert (fire-and-forget)
  fetch(process.env.ADMIN_ALERT_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'webhook_burst', ip, timestamp: Date.now() }),
  }).catch(() => {});
  return new Response('Too Many Requests', {
    status: 429,
    headers: rateLimitHeaders(rl.reset, rl.remaining),
  });
}
```

---

## Codebase Context

### Key Code Snippets
```typescript
// stub from task 5 — lib/abuse/ratelimit.ts
// export async function checkRateLimit() { return { success: true, reset: 0, remaining: 999 }; }
```

### Key Patterns in Use
- **Pattern:** Redis sliding windows are the source of truth for rate limits; DB only used for forensic queries.
- **Pattern:** Cooldown is a separate key with longer TTL than the frequency window so it survives window expiry.
- **Pattern:** All third-party calls have AbortSignal.timeout(3000).

### Architecture Decisions
- ADR: 30 gens/min/user is permissive for power users but catches scripted abuse (>1 req/2s sustained).
- ADR: Identical-request threshold of 10 in 30 min flags template-spam without punishing repeat workflows.
- ADR: reCAPTCHA v3 score threshold 0.5 — Google's documented "likely human" line.

---

## Handoff from Previous Task
**Files changed by previous task:** task 7 (middleware + redis), task 11 (trust), task 12 (ipControl).
**Decisions made:** Redis is `Redis.fromEnv()`; trust events route through `applyTrustEvent`.
**Context for this task:** ratelimit stub exists from task 5 — replace it.
**Open questions left:** none.

---

## Implementation Steps
1. `npm install @upstash/ratelimit`
2. Replace `lib/abuse/ratelimit.ts` with full implementation.
3. `lib/abuse/behavioral.ts` — implement.
4. `lib/abuse/captcha.ts` — implement.
5. Modify `app/api/content/generate/route.ts` — wire all gates.
6. Modify `middleware.ts` — webhook burst alert.
7. Add RECAPTCHA_SECRET_KEY to env.
8. `lib/abuse/ratelimit.test.ts` and `lib/abuse/behavioral.test.ts` — tests.
9. Run: `npx tsc --noEmit`
10. Run: `npm test -- lib/abuse`
11. Run: `/verify`

_Requirements: 12, 13, 20, 21, 28_

---

## Test Cases

### File: `lib/abuse/ratelimit.test.ts`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { rateLimitHeaders, checkRateLimit } from './ratelimit';

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
});

describe('checkRateLimit', () => {
  it('routes to gen:user limiter and returns success/reset/remaining', async () => {
    const r = await checkRateLimit('gen:user', 'user-test-1');
    expect(typeof r.success).toBe('boolean');
    expect(typeof r.reset).toBe('number');
    expect(typeof r.remaining).toBe('number');
  });
});
```

### File: `lib/abuse/behavioral.test.ts`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { checkActionFrequency, isInCooldown, checkIdenticalRequest, checkSignupSpeed } from './behavioral';

vi.mock('@upstash/redis', () => {
  const store = new Map<string, any>();
  return {
    Redis: {
      fromEnv: () => ({
        incr: async (k: string) => { const n = (store.get(k) ?? 0) + 1; store.set(k, n); return n; },
        expire: async () => 1,
        get: async (k: string) => store.get(k) ?? null,
        set: async (k: string, v: any) => { store.set(k, v); return 'OK'; },
      }),
    },
  };
});

describe('checkActionFrequency', () => {
  it('marks abusive after >30 actions in window', async () => {
    let last;
    for (let i = 0; i < 31; i++) last = await checkActionFrequency('u-freq-1');
    expect(last!.abusive).toBe(true);
    expect(await isInCooldown('u-freq-1')).toBe(true);
  });

  it('does not mark abusive at 30 actions', async () => {
    for (let i = 0; i < 30; i++) await checkActionFrequency('u-freq-2');
    const r = await checkActionFrequency('u-freq-2');
    // 31st call would trip; we test 30 only here using new user
  });
});

describe('checkIdenticalRequest', () => {
  it('flags after 10 identical hashes in window', async () => {
    let last;
    for (let i = 0; i < 11; i++) last = await checkIdenticalRequest('u-id-1', 'samehash');
    expect(last!.flagged).toBe(true);
  });

  it('does not flag distinct hashes', async () => {
    const a = await checkIdenticalRequest('u-id-2', 'h1');
    const b = await checkIdenticalRequest('u-id-2', 'h2');
    expect(a.flagged).toBe(false);
    expect(b.flagged).toBe(false);
  });
});

describe('checkSignupSpeed', () => {
  it('returns botSignal=true when first action <5s after signup', async () => {
    const signup = new Date('2026-04-28T00:00:00Z');
    const action = new Date('2026-04-28T00:00:03Z');
    const r = await checkSignupSpeed(signup, action);
    expect(r.botSignal).toBe(true);
  });
  it('returns botSignal=false when first action >5s after signup', async () => {
    const signup = new Date('2026-04-28T00:00:00Z');
    const action = new Date('2026-04-28T00:00:30Z');
    const r = await checkSignupSpeed(signup, action);
    expect(r.botSignal).toBe(false);
  });
});
```

### File: `lib/abuse/captcha.test.ts`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { verifyCaptcha } from './captcha';

describe('verifyCaptcha', () => {
  it('returns false for empty token', async () => {
    expect(await verifyCaptcha('')).toBe(false);
  });
  it('returns true for success + score >= 0.5 + matching action', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, score: 0.7, action: 'generate' }),
    });
    expect(await verifyCaptcha('tok', 'generate')).toBe(true);
  });
  it('returns false on score < 0.5', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, score: 0.3, action: 'generate' }),
    });
    expect(await verifyCaptcha('tok', 'generate')).toBe(false);
  });
  it('returns false on action mismatch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, score: 0.9, action: 'login' }),
    });
    expect(await verifyCaptcha('tok', 'generate')).toBe(false);
  });
  it('fail-closes on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('net'));
    expect(await verifyCaptcha('tok')).toBe(false);
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| User is in cooldown | Return 429 immediately, no action processed |
| User exceeds 30 actions/min | Apply trust event, set 5-min cooldown, 429 with Retry-After |
| Same prompt hash 10+ times in 30 min | Apply -5 trust, force CAPTCHA on next request |
| Trust score 80+ AND not flagged | Skip CAPTCHA |
| Trust score 40-79 AND flagged identical | Require CAPTCHA |
| Trust score < 40 | Always require CAPTCHA |
| reCAPTCHA score < 0.5 | Reject as bot |
| reCAPTCHA action mismatch | Reject |
| reCAPTCHA endpoint timeout | Fail-closed (treat as failed verify) |
| First action <5s after signup | Set botSignal flag (caller decides response) |
| Webhook IP rate limit hit | Fire admin alert, return 429 |

---

## Acceptance Criteria
- [ ] WHEN a user makes 31 generate requests in 60s THEN the 31st returns 429 and they're locked out for 5 minutes.
- [ ] WHEN a user submits the same prompt 11 times in 30 min THEN trust drops by 5 and CAPTCHA is required next request.
- [ ] WHEN trust score is 85 THEN no CAPTCHA is requested even on flagged action.
- [ ] WHEN trust score is 30 THEN CAPTCHA is requested unconditionally.
- [ ] WHEN reCAPTCHA returns score 0.4 THEN request is rejected with 403.
- [ ] WHEN webhook IP exceeds 100 req/min THEN admin webhook receives `{kind:'webhook_burst'}` payload.
- [ ] All Retry-After headers are >= 1 second.
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test -- lib/abuse` — all pass
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
