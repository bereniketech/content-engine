---
task: 006
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 2, 3, 5]
---

# Task 006: Email Verification Flow — OTP + Magic Link

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Implement full email verification: 6-digit OTP issuance + validation, magic link generation + callback, resend rate limiting, and free credit grant trigger on first successful verification.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/api/auth/signup/route.ts` | Email signup — validate, create Supabase user, issue OTP, trigger email |
| `app/api/auth/verify-email/route.ts` | Validate OTP, mark verified, call fn_grant_free_credits |
| `app/api/auth/verify-email/resend/route.ts` | Resend OTP with 60s cooldown |
| `app/api/auth/magic-link/route.ts` | Generate signed magic link, send via Resend |
| `app/api/auth/magic-link/callback/route.ts` | Validate token, create session, redirect to dashboard |
| `lib/auth/otp.ts` | OTP generation, hashing, verification helpers |
| `lib/auth/magic.ts` | Magic link token generation, hashing, validation helpers |

### Modify
| File | What to change |
|------|---------------|
| _(none yet — depends on task 5 email validate lib)_ | |

---

## Dependencies
```bash
npm install resend bcryptjs
npm install -D @types/bcryptjs

# ENV vars:
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## API Contracts
```
POST /api/auth/signup
  Body: { email: string; password?: string; fingerprint_hash?: string }
  201 → { user_id }
  409 → "An account with this email already exists."
  422 → "Invalid email format" | "Disposable email addresses are not allowed."

POST /api/auth/verify-email
  Body: { user_id: string; otp: string }
  200 → { email_verified: true; credits_granted: number }
  400 → "Invalid or expired OTP."
  429 → "Too many attempts. Request a new code." (after 5 failures)

POST /api/auth/verify-email/resend
  Body: { user_id: string }
  200 → { sent: true }
  429 → "Please wait before requesting another code." (within 60s)

POST /api/auth/magic-link
  Body: { email: string }
  200 → { sent: true }
  429 → "Too many login attempts. Please try again in 10 minutes." (>5/10min)

GET /api/auth/magic-link/callback?token=<token>
  302 → /dashboard (valid)
  302 → /login?error=expired (expired/used)
```

---

## Code Templates

### `lib/auth/otp.ts`
```typescript
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
```

### `lib/auth/magic.ts`
```typescript
import crypto from 'crypto';

export function generateMagicToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
```

### `app/api/auth/signup/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEmail } from '@/lib/abuse/emailValidate';
import { generateOtp, hashOtp } from '@/lib/auth/otp';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'signup:ip',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const body = await req.json();
  const { email, password, fingerprint_hash } = body;

  const validation = await validateEmail(email);
  if (!validation.valid) return NextResponse.json({ error: 'Invalid email format.' }, { status: 422 });
  if (validation.disposable) return NextResponse.json({ error: 'Disposable email addresses are not allowed.' }, { status: 422 });

  // Check existing
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

  // Create Supabase Auth user
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: password ?? undefined,
    email_confirm: false,
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const userId = authUser.user.id;
  const countryCode = req.headers.get('cf-ipcountry') ?? 'XX';

  // Create public user row
  await supabase.from('users').insert({
    id: userId,
    email,
    country_code: countryCode,
    trust_score: 50,
  });

  // Create credit wallet
  await supabase.from('credit_wallets').insert({ owner_kind: 'user', user_id: userId });

  // Log IP + device
  await supabase.from('user_ip_log').insert({ user_id: userId, ip_address: ip, event_type: 'signup' });
  if (fingerprint_hash) {
    await supabase.from('user_devices').insert({ user_id: userId, fingerprint_hash, last_seen_ip: ip });
  }

  // Issue OTP
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await supabase.from('email_verifications').insert({
    user_id: userId,
    otp_hash: otpHash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  // Send OTP email (async, don't await for speed)
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: 'signup_verify_otp', userId, email, otp }),
  }).catch(() => {});

  return NextResponse.json({ user_id: userId }, { status: 201 });
}
```

### `app/api/auth/verify-email/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyOtp } from '@/lib/auth/otp';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { user_id, otp } = await req.json();

  // Check lock
  const lockKey = `otp:lock:${user_id}`;
  const locked = await redis.get(lockKey);
  if (locked) return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });

  const { data: verification } = await supabase
    .from('email_verifications')
    .select('*')
    .eq('user_id', user_id)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!verification || new Date(verification.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 400 });
  }

  const valid = await verifyOtp(otp, verification.otp_hash);
  const newAttempts = verification.attempts + 1;

  if (!valid) {
    await supabase
      .from('email_verifications')
      .update({ attempts: newAttempts })
      .eq('id', verification.id);

    if (newAttempts >= 5) {
      // Lock for 10 min + expire current OTP
      await redis.set(lockKey, '1', { ex: 600 });
      await supabase.from('email_verifications').update({ verified: false, expires_at: new Date().toISOString() }).eq('id', verification.id);
    }
    return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 400 });
  }

  // Mark verified
  await supabase.from('email_verifications').update({ verified: true }).eq('id', verification.id);
  await supabase.from('users').update({ email_verified: true }).eq('id', user_id);

  // Grant free credits via RPC
  const { data: wallet } = await supabase.from('credit_wallets').select('id').eq('user_id', user_id).single();
  const { data: grantResult } = await supabase.rpc('fn_grant_free_credits', {
    p_user_id: user_id,
    p_ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
    p_fp_hash: '',
  });

  return NextResponse.json({ email_verified: true, credits_granted: grantResult ?? 0 });
}
```

### `app/api/auth/verify-email/resend/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateOtp, hashOtp } from '@/lib/auth/otp';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { user_id } = await req.json();
  const cooldownKey = `otp:cooldown:${user_id}`;
  const inCooldown = await redis.get(cooldownKey);
  if (inCooldown) return NextResponse.json({ error: 'Please wait before requesting another code.' }, { status: 429 });

  const { data: user } = await supabase.from('users').select('email').eq('id', user_id).single();
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await supabase.from('email_verifications').insert({
    user_id,
    otp_hash: otpHash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  await redis.set(cooldownKey, '1', { ex: 60 });

  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: 'signup_verify_resend', userId: user_id, email: user.email, otp }),
  }).catch(() => {});

  return NextResponse.json({ sent: true });
}
```

### `app/api/auth/magic-link/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMagicToken } from '@/lib/auth/magic';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'magic:email',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const { success } = await ratelimit.limit(email);
  if (!success) return NextResponse.json({ error: 'Too many login attempts. Please try again in 10 minutes.' }, { status: 429 });

  const { data: user } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  // Silent success even if user not found (prevent email enumeration)
  if (!user) return NextResponse.json({ sent: true });

  const { raw, hash } = generateMagicToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabase.from('email_verifications').insert({
    user_id: user.id,
    otp_hash: hash,        // reuse otp_hash column for magic token hash
    expires_at: expiresAt,
  });

  const magicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/magic-link/callback?token=${raw}`;

  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: 'magic_link', userId: user.id, email, magicUrl }),
  }).catch(() => {});

  return NextResponse.json({ sent: true });
}
```

### `app/api/auth/magic-link/callback/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashToken } from '@/lib/auth/magic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/login?error=invalid', req.url));

  const hash = hashToken(token);

  const { data: verification } = await supabase
    .from('email_verifications')
    .select('*')
    .eq('otp_hash', hash)
    .eq('verified', false)
    .single();

  if (!verification || new Date(verification.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/login?error=expired', req.url));
  }

  // Mark used
  await supabase.from('email_verifications').update({ verified: true }).eq('id', verification.id);
  await supabase.from('users').update({ email_verified: true, last_active_at: new Date().toISOString() }).eq('id', verification.user_id);

  // Create Supabase session via magic link (delegate to Supabase Auth)
  const { data: sessionData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: (await supabase.from('users').select('email').eq('id', verification.user_id).single()).data!.email,
  });

  if (sessionData?.properties?.action_link) {
    return NextResponse.redirect(sessionData.properties.action_link);
  }

  return NextResponse.redirect(new URL('/dashboard', req.url));
}
```

---

## Codebase Context

### Key Patterns in Use
- **OTP hashing:** bcrypt (cost 10) so brute-force of leaked DB is infeasible.
- **Rate limiting:** Upstash sliding-window per user/IP; `otp:lock:<userId>` key for lockout.
- **Magic link:** SHA-256 hash stored; raw token only in email URL — never persisted.
- **Email enumeration prevention:** magic-link endpoint always returns `{sent:true}` regardless of user existence.

---

## Handoff from Previous Task
**Files changed by previous task:** Task 5 provides `lib/abuse/emailValidate.ts` + `POST /api/email/validate`.
**Decisions made:** Resend for email delivery; Upstash for rate-limit state.
**Context for this task:** `email_verifications` table exists (task 1); `fn_grant_free_credits` RPC exists (task 3).
**Open questions left:** none.

---

## Implementation Steps
1. `lib/auth/otp.ts` + `lib/auth/magic.ts` — pure helpers, no deps.
2. `app/api/auth/signup/route.ts` — signup handler.
3. `app/api/auth/verify-email/route.ts` — OTP validation handler.
4. `app/api/auth/verify-email/resend/route.ts` — resend handler.
5. `app/api/auth/magic-link/route.ts` — magic link issuance.
6. `app/api/auth/magic-link/callback/route.ts` — callback handler.
7. `npx tsc --noEmit`
8. Run: `/verify`

_Requirements: 1, 2, 15_

---

## Test Cases

### File: `app/api/auth/__tests__/verify-email.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { generateOtp, verifyOtp } from '@/lib/auth/otp';
import { generateMagicToken, hashToken } from '@/lib/auth/magic';

describe('OTP helpers', () => {
  it('generates 6-digit OTP', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });
  it('verifies correct OTP against hash', async () => {
    const { hashOtp } = await import('@/lib/auth/otp');
    const otp = generateOtp();
    const hash = await hashOtp(otp);
    expect(await verifyOtp(otp, hash)).toBe(true);
    expect(await verifyOtp('000000', hash)).toBe(false);
  });
});

describe('Magic token helpers', () => {
  it('round-trips through hash', () => {
    const { raw, hash } = generateMagicToken();
    expect(hashToken(raw)).toBe(hash);
  });
  it('different tokens produce different hashes', () => {
    expect(generateMagicToken().hash).not.toBe(generateMagicToken().hash);
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| OTP attempt 5+ failures | Lock user 10 min via Upstash, expire current OTP |
| Resend within 60s | Return 429, no new OTP |
| Magic link expired/used | Redirect `/login?error=expired` |
| Signup with existing email | Return 409 |
| User not found on magic link request | Return 200 (prevent enumeration) |

---

## Acceptance Criteria
- [ ] Correct OTP → `email_verified=true` + free credits granted
- [ ] 5 wrong OTPs → locked, subsequent attempt → 429
- [ ] Resend within 60s → "Please wait" response, no new OTP sent
- [ ] Expired magic link → "expired" redirect
- [ ] Rate limit on magic link > 5/10min → 429 with correct message
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_

Status: COMPLETE
Completed: 2026-04-28T00:00:00Z
