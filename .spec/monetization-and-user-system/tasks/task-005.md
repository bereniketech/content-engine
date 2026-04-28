---
task: 005
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 4]
---

# Task 005: Email Validation Service

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/testing-quality/tdd-workflow/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else. Do not load any context not declared here. Follow paths exactly.

---

## Objective
Provide a server-side email validation service (RFC syntax check, MX record lookup, disposable-domain check, typo suggestion, reputation score) and expose it via `POST /api/email/validate` with Upstash IP rate limiting (30/min).

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/abuse/emailValidate.ts` | Pure-ish email validator: RFC + MX + disposable + suggest |
| `lib/abuse/ratelimit.ts` | Stub rate-limiter factory used here and (expanded) in Task 13 |
| `app/api/email/validate/route.ts` | Next.js App Router POST handler |
| `lib/abuse/emailValidate.test.ts` | Unit tests for `validateEmail` + `suggestDomain` + `levenshtein` |
| `app/api/email/validate/route.test.ts` | Route handler integration test |

### Modify
_(none)_

---

## Dependencies
```bash
# Install (skip if already in package.json):
npm install @upstash/ratelimit @upstash/redis

# Env vars (names only — add values to .env):
UPSTASH_REDIS_REST_URL=Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN=Upstash Redis REST token
SUPABASE_SERVICE_ROLE_KEY=Supabase service role key (server only)
NEXT_PUBLIC_SUPABASE_URL=Supabase project URL
```

---

## API Contracts

```
POST /api/email/validate
Auth: none (public; rate limited)
Request: { email: string }
Response 200: {
  valid: boolean,
  mx: boolean,
  disposable: boolean,
  suggestion: string | null,
  domain_reputation_score: number   // 0-100
}
Response 422: { error: 'INVALID_EMAIL_FORMAT' }
Response 429: { error: 'RATE_LIMITED' }
Response 400: { error: 'EMAIL_REQUIRED' }
Response 500: { error: 'EMAIL_VALIDATE_FAILED' }
```

---

## Code Templates

### `lib/abuse/ratelimit.ts`
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

export type Window = `${number} ${'s' | 'm' | 'h' | 'd'}`;

/**
 * createRateLimiter — sliding-window limiter scoped under `ratelimit:${scope}:`
 * @param scope short identifier (e.g. 'email-validate')
 * @param limit max events per window
 * @param window e.g. '1 m' for 1 minute
 */
export function createRateLimiter(scope: string, limit: number, window: Window) {
  return new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `ratelimit:${scope}`,
    analytics: false,
  });
}
```

### `lib/abuse/emailValidate.ts`
```typescript
import dns from 'node:dns/promises';
import { createClient } from '@/lib/supabase/server';

const TOP_PROVIDERS = [
  'gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com',
  'protonmail.com','aol.com','live.com','msn.com','ymail.com',
];

const RFC_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,        // deletion
        dp[j - 1] + 1,    // insertion
        prev + cost,      // substitution
      );
      prev = tmp;
    }
  }
  return dp[n];
}

export function suggestDomain(domain: string): string | null {
  let best = { dist: Infinity, match: '' };
  for (const p of TOP_PROVIDERS) {
    const d = levenshtein(domain, p);
    if (d < best.dist && d <= 2) best = { dist: d, match: p };
  }
  return best.match || null;
}

export type EmailValidationResult = {
  valid: boolean;
  mx: boolean;
  disposable: boolean;
  suggestion: string | null;
  domain_reputation_score: number;
};

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  if (!email || !RFC_RE.test(email)) {
    return { valid: false, mx: false, disposable: false, suggestion: null, domain_reputation_score: 0 };
  }
  const domain = email.split('@')[1].toLowerCase();
  const supabase = createClient();

  const { data: blocked } = await supabase
    .from('email_domain_blocklist')
    .select('id')
    .eq('domain', domain)
    .maybeSingle();
  const disposable = !!blocked;

  let mx = false;
  try {
    const records = await dns.resolveMx(domain);
    mx = Array.isArray(records) && records.length > 0;
  } catch {
    mx = false;
  }

  const suggestion = suggestDomain(domain);
  const finalSuggestion = suggestion && suggestion !== domain ? suggestion : null;

  const domain_reputation_score =
    disposable ? 0 :
    !mx        ? 10 :
    TOP_PROVIDERS.includes(domain) ? 90 : 60;

  return {
    valid: true,
    mx,
    disposable,
    suggestion: finalSuggestion,
    domain_reputation_score,
  };
}
```

### `app/api/email/validate/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/abuse/emailValidate';
import { createRateLimiter } from '@/lib/abuse/ratelimit';

export const runtime = 'nodejs';   // dns module requires Node runtime
export const dynamic = 'force-dynamic';

const limiter = createRateLimiter('email-validate', 30, '1 m');

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const { success } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }

    let body: { email?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    const result = await validateEmail(email);
    if (!result.valid) {
      return NextResponse.json({ error: 'INVALID_EMAIL_FORMAT' }, { status: 422 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (_e) {
    return NextResponse.json({ error: 'EMAIL_VALIDATE_FAILED' }, { status: 500 });
  }
}
```

---

## Codebase Context

### Key Code Snippets
```typescript
// Supabase server client (existing) — lib/supabase/server.ts
// import { createClient } from '@/lib/supabase/server';

// Blocklist seeded by Task 4: 49 disposable domains in email_domain_blocklist.
```

### Key Patterns in Use
- **Pure validator + thin route:** all logic lives in `lib/abuse/emailValidate.ts` so it is reusable from signup, profile-edit, team-invite flows.
- **Rate limit by IP:** `ratelimit:email-validate:${ip}` — sliding window 30/min.
- **`runtime = 'nodejs'`:** required because `dns/promises` is not available in the Edge runtime.

### Architecture Decisions Affecting This Task
- ADR: Disposable-domain source is `email_domain_blocklist` — admin-managed list, not a hardcoded array.
- ADR: Reputation scoring is heuristic (0/10/60/90) — feeds into trust_score (Task 17 will integrate).

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.
**Files changed by previous task:** _(filled via /task-handoff after Task 4)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. `lib/abuse/ratelimit.ts` — write factory
2. `lib/abuse/emailValidate.ts` — write validator + helpers
3. `app/api/email/validate/route.ts` — write POST handler
4. `lib/abuse/emailValidate.test.ts` — write unit tests
5. `app/api/email/validate/route.test.ts` — write route test
6. Run: `npm test lib/abuse/emailValidate.test.ts app/api/email/validate/route.test.ts`
7. Run: `npx tsc --noEmit`
8. Run: `/verify`

_Requirements: 1, 14_
_Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md_

---

## Test Cases

### File: `lib/abuse/emailValidate.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('node:dns/promises', () => ({
  default: {
    resolveMx: vi.fn(),
  },
  resolveMx: vi.fn(),
}));

import dns from 'node:dns/promises';
import { createClient } from '@/lib/supabase/server';
import { validateEmail, suggestDomain, levenshtein } from './emailValidate';

function mockSupabaseBlock(domain: string | null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: domain ? { id: 'x' } : null,
      error: null,
    }),
  };
  (createClient as any).mockReturnValue({ from: vi.fn().mockReturnValue(chain) });
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
    vi.clearAllMocks();
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
    (dns.resolveMx as any).mockResolvedValue([{ exchange: 'mx.mailinator.com', priority: 10 }]);
    const r = await validateEmail('foo@mailinator.com');
    expect(r.disposable).toBe(true);
    expect(r.domain_reputation_score).toBe(0);
  });

  it('reputation 90 for top provider with MX', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as any).mockResolvedValue([{ exchange: 'gmail-smtp-in.l.google.com', priority: 5 }]);
    const r = await validateEmail('user@gmail.com');
    expect(r.valid).toBe(true);
    expect(r.mx).toBe(true);
    expect(r.disposable).toBe(false);
    expect(r.domain_reputation_score).toBe(90);
    expect(r.suggestion).toBeNull();
  });

  it('reputation 60 for unknown domain with MX', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as any).mockResolvedValue([{ exchange: 'mail.acme.io', priority: 10 }]);
    const r = await validateEmail('user@acme.io');
    expect(r.domain_reputation_score).toBe(60);
  });

  it('reputation 10 when MX lookup fails', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as any).mockRejectedValue(new Error('ENOTFOUND'));
    const r = await validateEmail('user@no-such-domain.test');
    expect(r.mx).toBe(false);
    expect(r.domain_reputation_score).toBe(10);
  });

  it('suggests gmail.com for typo gmial.com', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as any).mockResolvedValue([{ exchange: 'mx.gmial.com', priority: 10 }]);
    const r = await validateEmail('user@gmial.com');
    expect(r.suggestion).toBe('gmail.com');
  });

  it('does not suggest when domain is itself a top provider', async () => {
    mockSupabaseBlock(null);
    (dns.resolveMx as any).mockResolvedValue([{ exchange: 'mx', priority: 10 }]);
    const r = await validateEmail('user@gmail.com');
    expect(r.suggestion).toBeNull();
  });
});
```

### File: `app/api/email/validate/route.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/abuse/emailValidate', () => ({
  validateEmail: vi.fn(),
}));
vi.mock('@/lib/abuse/ratelimit', () => ({
  createRateLimiter: vi.fn(),
}));

import { POST } from './route';
import { validateEmail } from '@/lib/abuse/emailValidate';
import { createRateLimiter } from '@/lib/abuse/ratelimit';

const limiterMock = { limit: vi.fn() };
(createRateLimiter as any).mockReturnValue(limiterMock);

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
    vi.clearAllMocks();
    limiterMock.limit.mockResolvedValue({ success: true });
  });

  it('returns 200 with validation result', async () => {
    (validateEmail as any).mockResolvedValue({
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
    (validateEmail as any).mockResolvedValue({
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
    (validateEmail as any).mockRejectedValue(new Error('boom'));
    const res: any = await POST(makeReq({ email: 'a@gmail.com' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('EMAIL_VALIDATE_FAILED');
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Body parse fails | Respond `400 { error: 'EMAIL_REQUIRED' }` |
| `email` field absent or empty | Respond `400 { error: 'EMAIL_REQUIRED' }` |
| `RFC_RE` does not match | `validateEmail` returns `valid:false`; route responds `422 { error: 'INVALID_EMAIL_FORMAT' }` |
| `email_domain_blocklist` contains domain | `disposable=true`, `domain_reputation_score=0` |
| `dns.resolveMx` rejects | `mx=false`, `domain_reputation_score=10` |
| Domain in TOP_PROVIDERS, MX present, not disposable | `domain_reputation_score=90` |
| Other domain, MX present, not disposable | `domain_reputation_score=60` |
| Levenshtein ≤ 2 to a TOP_PROVIDER and not equal to it | Set `suggestion = <provider>` |
| Sliding window cap (30/min/IP) exceeded | Respond `429 { error: 'RATE_LIMITED' }` |
| Any uncaught error in handler | Respond `500 { error: 'EMAIL_VALIDATE_FAILED' }` |

---

## Acceptance Criteria
- [ ] WHEN POST `/api/email/validate` with `{ email: 'a@gmail.com' }` is hit THEN response is 200 with `domain_reputation_score: 90`
- [ ] WHEN body has no `email` field THEN response is 400 `{ error: 'EMAIL_REQUIRED' }`
- [ ] WHEN `email` is `'not-valid'` THEN response is 422 `{ error: 'INVALID_EMAIL_FORMAT' }`
- [ ] WHEN domain is `mailinator.com` THEN `disposable:true` and `domain_reputation_score:0`
- [ ] WHEN MX lookup fails THEN `mx:false` and `domain_reputation_score:10`
- [ ] WHEN typo `gmial.com` is supplied THEN `suggestion:'gmail.com'`
- [ ] WHEN 31st request from same IP within a minute hits THEN response is 429 `{ error: 'RATE_LIMITED' }`
- [ ] All existing tests pass
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** `lib/abuse/ratelimit.ts`, `lib/abuse/emailValidate.ts`, `lib/abuse/emailValidate.test.ts`, `app/api/email/validate/route.ts`, `app/api/email/validate/route.test.ts`, `tsconfig.json` (excluded supabase/functions from TS compilation)
**Decisions made:** Limiter lazily initialized (`getLimiter()`) so Jest mock intercepts before creation; tests adapted from Vitest to Jest; project uses Jest not Vitest; DNS mock uses `jest.Mock` cast.
**Context for next task:** `createRateLimiter` factory is in `lib/abuse/ratelimit.ts` — reusable for Task 13 rate limiting expansion.
**Open questions:** None.

Status: COMPLETE
Completed: 2026-04-28T00:04:00Z
