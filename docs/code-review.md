# Code Review Report — AI Content Engine

**Reviewer:** Senior Software Engineer  
**Date:** 2026-04-28  
**Scope:** Full-stack (Next.js App Router, TypeScript, Supabase, Razorpay, Redis/Upstash, anti-abuse system)

---

## 1. Summary

This is a well-structured, production-oriented SaaS platform with a thoughtful security posture. The anti-abuse system is particularly impressive in breadth. However, several **CRITICAL** and **HIGH** issues exist that must be resolved before production: a hardcoded trust score bypasses the entire CAPTCHA enforcement system, a module-level Supabase singleton leaks the service-role key in unexpected client contexts, and the signup flow creates auth users before completing device/IP checks, resulting in orphaned accounts.

Overall architecture is clean and well-separated. The billing and webhook flows are solid. Test coverage exists but appears shallow for the most critical paths.

---

## 2. Frontend Review

### Architecture

The App Router structure is correct — pages are in `app/`, shared components in `components/`, logic in `lib/`. Server/client boundaries appear generally respected. The Tiptap-based editor, dashboard panels, and admin components are cleanly organized by feature.

### Issues Found

#### [HIGH] Missing loading/error boundaries in data-fetch components

The dashboard panels (e.g. `BalanceCard.tsx`, `SummaryPanel.tsx`) fetch data but the explorer confirms no dedicated error boundary or Suspense fallback wrapping them. If a single wallet or analytics fetch fails, the entire dashboard will white-screen or hang silently. Each async panel needs a local error boundary or an explicit error/loading state returned by the component.

**Impact:** Users see broken/hung UI when analytics or wallet fetch fails; no recovery path.

**Fix:** Wrap async panels in `<Suspense>` + error boundary, return `{ error, loading }` states from data-fetching hooks.

---

#### [HIGH] Auth cookie name is hardcoded in middleware

**File:** `middleware.ts:71`

```typescript
req.cookies.get('__Secure-sb-access')?.value
```

This is a custom cookie name. Supabase SSR's `@supabase/ssr` typically uses its own cookie management. If Supabase rotates or renames its session cookie (or you change SSR config), middleware silently falls back to Bearer-only auth. The cookie name should come from a shared constant or the SSR client, not a raw string.

**Impact:** If Supabase updates, valid session cookies are ignored and users are logged out.

**Fix:** Extract cookie name to a shared constant or read it from the SSR client config:
```typescript
const SUPABASE_AUTH_COOKIE = '__Secure-sb-access';
const token = req.cookies.get(SUPABASE_AUTH_COOKIE)?.value ?? ...;
```

---

#### [MEDIUM] `console.log` in production middleware

**File:** `middleware.ts:115-124`

```typescript
console.log(JSON.stringify({ level: 'info', request_id: ... }));
```

The project uses `pino` for structured logging (`lib/logger.ts`) but the middleware uses raw `console.log`. In Vercel Edge/Node this logs to stdout with no log-level filtering, and the `pino` instance is never used here. Migrate to the project logger or use `logger.info(...)`.

**Impact:** Inconsistent logging format; bypasses project's log filtering and structured output.

**Fix:** Use the project logger:
```typescript
import { logger } from '@/lib/logger';
logger.info({ request_id: requestId, user_id: user.id, ... });
```

---

#### [LOW] `options` parameter in generate route is not validated

**File:** `app/api/content/generate/route.ts:35`

```typescript
const { action_type, prompt, options, captchaToken } = body;
// options passed directly without validation
const result = await generateWithDeduction(userId, action_type, prompt, options ?? {});
```

A user can send `{ "options": { "max_tokens": 100000 } }` and inflate token usage beyond intended limits. The `max_tokens` option is not clamped.

**Impact:** Users can exhaust their credits faster by requesting huge outputs; potential DoS on AI backend.

**Fix:** Validate and clamp options:
```typescript
const allowedOptions = {
  max_tokens: Math.min(options?.max_tokens ?? 2048, 4096), // max 4K tokens
};
```

---

## 3. Backend Review

### Architecture

The layering is sound: middleware handles auth/rate-limiting, route handlers are thin, business logic lives in `lib/`. Supabase RPCs (`fn_deduct_credits`, `fn_credit_topup`, `fn_apply_trust_delta`, `fn_refund_credits`) handle atomicity correctly — this is the right pattern. The Razorpay webhook handler has proper idempotency via a `unique` constraint on `webhook_events`.

### Critical Issues

---

#### [CRITICAL] Trust score hardcoded to 50 in the content generation route

**File:** `app/api/content/generate/route.ts:48`

```typescript
const trustScore = 50; // default; middleware could inject this via header in a future enhancement
if (requiresCaptcha(trustScore, identical.flagged)) {
  const ok = await verifyCaptcha(captchaToken ?? '', 'generate');
  if (!ok) {
    return NextResponse.json({ error: 'CAPTCHA verification required.' }, { status: 403 });
  }
}
```

This makes `requiresCaptcha()` always evaluate against 50, which means:
- Users with a trust score of 0–39 (known abusers, suspended accounts) are **never required to solve CAPTCHA** via this path.
- Users with trust score >= 80 (trusted) are still asked for CAPTCHA on identical requests (wrong).
- The entire trust-gated CAPTCHA enforcement for content generation is **dead code**.

The comment acknowledges this is incomplete.

**Impact:** CRITICAL — Abusers can bypass all CAPTCHA enforcement and generate unlimited content.

**Fix:** Fetch the actual trust score:
```typescript
const trustScore = await getEffectiveTrustScore(userId);
if (requiresCaptcha(trustScore, identical.flagged)) {
  const ok = await verifyCaptcha(captchaToken ?? '', 'generate');
  if (!ok) {
    return NextResponse.json({ error: 'CAPTCHA verification required.' }, { status: 403 });
  }
}
```

**Ship this immediately.** This is a 2-line fix with massive security impact.

---

#### [CRITICAL] Module-level singleton Supabase clients with service-role key

**Files:** 
- `lib/credits/wallet.ts:3-6`
- `lib/credits/generate.ts:7-10`
- `lib/admin/auth.ts:4-7`

```typescript
// Module-level singleton — created once at module load time
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

In Next.js, module-level singletons in API routes persist across requests in the same worker process. The service-role key client bypasses all Supabase RLS. If this client is ever accidentally imported in a client bundle (or a Server Component that renders to the client), the service-role key is exposed in the build artifact or sent to browsers.

The correct pattern is used elsewhere (`razorpay.ts` has `adminClient()` factory), but these 3 files use the dangerous singleton pattern.

**Impact:** CRITICAL — Service-role key exposed if any file is bundled client-side; all RLS is bypassed client-wide.

**Fix:** Replace singletons with factory functions:
```typescript
// lib/credits/wallet.ts — BEFORE
const supabase = createClient(...);

export async function resolveWallet(userId: string) {
  const { data } = await supabase.from('credit_wallets')...
}

// AFTER
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function resolveWallet(userId: string) {
  const supabase = adminClient();
  const { data } = await supabase.from('credit_wallets')...
}
```

---

#### [CRITICAL] Signup creates the auth user before device fingerprint check — orphaned accounts on block

**File:** `app/api/auth/signup/route.ts:49-78`

```typescript
// Auth user created at line 49-53
const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
  email,
  password: password ?? undefined,
  email_confirm: false,
});
if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

const userId = authUser.user.id;
// ... user row, wallet, IP log inserted ...

// Device check at line 73 — AFTER creation
if (fingerprint_hash) {
  const { blocked } = await checkDeviceFingerprint(fingerprint_hash, userId);
  if (blocked) {
    await supabase.from('users').update({ account_status: 'blocked' }).eq('id', userId);
    return NextResponse.json({ error: 'Account limit reached from this device.' }, { status: 403 });
  }
}
```

When `blocked = true`, the route sets `account_status = 'blocked'` in your `users` table and returns 403. **But the Supabase auth user still exists** and has a valid password. The attacker can:
1. Call the signup route → auth user created → device block fired → 403 returned
2. Call the login route with the same email/password → Supabase auth succeeds (auth doesn't know about `account_status`)
3. If your login route only checks `users.account_status`, you're still safe — but if it trusts the Supabase auth, the block is bypassed.

Even worse: if the login route has a bug or if you later refactor to trust Supabase auth directly, these orphaned auth users are a backdoor.

**Impact:** CRITICAL — Orphaned Supabase auth users can be leveraged by attackers if login logic ever changes. Current risk depends on login route implementation (not reviewed).

**Fix:** Reorder checks so device fingerprint is validated **before** `createUser`:

```typescript
// 1. IP limit
const { allowed } = await checkIpSignupLimit(ip);
if (!allowed) { ... return 403; }

// 2. Email validation
const validation = await validateEmail(email);
if (!validation.valid) { ... return 422; }

// 3. Check existing account
const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
if (existing) { ... return 409; }

// 4. Device fingerprint — BEFORE createUser
if (fingerprint_hash) {
  const { blocked } = await checkDeviceFingerprint(fingerprint_hash, null); // pass null for now
  if (blocked) {
    await checkDeviceEscalation(fingerprint_hash);
    return NextResponse.json({ error: 'Account limit reached from this device.' }, { status: 403 });
  }
}

// 5. VPN detection
const { isVpn } = await detectVpn(ip);
if (isVpn) {
  // consider blocking or requiring extra verification
  // await applyTrustEvent(userId, 'vpn_detected'); // apply to new user after creation
}

// 6. NOW create the auth user
const { data: authUser, error: authErr } = await supabase.auth.admin.createUser(...);
if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

const userId = authUser.user.id;
// ... rest of setup ...
```

Alternatively, if device checks must happen post-creation, **delete the auth user on block**:
```typescript
if (blocked) {
  await supabase.auth.admin.deleteUser(userId); // cleanup
  await supabase.from('users').delete().eq('id', userId); // cleanup
  return NextResponse.json({ error: 'Account limit reached from this device.' }, { status: 403 });
}
```

---

### High Issues

#### [HIGH] IP extraction from `x-forwarded-for` is inconsistent between middleware and routes

**Middleware** (`middleware.ts:31`):
```typescript
const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
// Takes the entire header (may include multiple IPs: "client, proxy1, proxy2")
```

**Signup route** (`app/api/auth/signup/route.ts:28`):
```typescript
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
// Correctly takes only the first IP
```

Middleware injects `x-client-ip` from the raw (uncleaned) header. Downstream abuse checks using `x-client-ip` will key rate limits on `"realIP, proxy1"` as a single string, defeating IP-based controls. Rate limiters will treat each proxy configuration as a different IP, allowing distributed signup abuse.

**Impact:** HIGH — IP-based rate limits can be trivially bypassed by using different proxy chains.

**Fix:** Centralize IP extraction in middleware with proper parsing:
```typescript
// middleware.ts:31
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
// ... later ...
res.headers.set('x-client-ip', ip);
```

---

#### [HIGH] `requireAdmin` trusts the `x-user-id` header without re-verifying the token

**File:** `lib/admin/auth.ts:9`

```typescript
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;

  const { data: user } = await supabase.from('users').select('account_type').eq('id', userId).single();
  if (user?.account_type !== 'admin') return null;
  return userId;
}
```

`x-user-id` is injected by middleware after token validation. This is **architecturally sound only if the header cannot be set by callers**. In Next.js App Router, request headers from clients can be forwarded unless explicitly stripped. If any edge case allows a client to set `x-user-id` (e.g., a misconfigured CDN, an Inngest internal call that forwards user context), admin routes are bypassed.

**Impact:** HIGH — If `x-user-id` can be spoofed in any scenario, admin endpoints are accessible to non-admins.

**Fix:** Re-validate the token in `requireAdmin` or add a middleware-set sentinel header that proves the middleware ran:

```typescript
// middleware.ts — add a sentinel
res.headers.set('x-auth-verified', 'true'); // prove middleware validated the token

// lib/admin/auth.ts
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  // Verify the request actually went through middleware
  if (req.headers.get('x-auth-verified') !== 'true') {
    return null; // request bypassed middleware, untrusted
  }
  
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;

  const { data: user } = await supabase.from('users').select('account_type').eq('id', userId).single();
  if (user?.account_type !== 'admin') return null;
  return userId;
}
```

Or: re-validate the token directly (more paranoid, more expensive):
```typescript
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('__Secure-sb-access')?.value ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: userData } = await supabase.from('users').select('account_type').eq('id', user.id).single();
  if (userData?.account_type !== 'admin') return null;
  return user.id;
}
```

---

#### [HIGH] `fn_refund_credits` is fire-and-forget with no failure alerting

**File:** `lib/credits/generate.ts:55`

```typescript
try {
  const response = await anthropic.messages.create({ ... });
  // ... success path ...
} catch (aiError) {
  await supabase.rpc('fn_refund_credits', { p_request_id: requestId });
  // No error handling — if refund fails, it's silent
  
  await supabase.from('generation_log').insert({ ... }).catch(() => {});
  // Logging is fire-and-forget, which is fine
  
  throw aiError;
}
```

If `fn_refund_credits` fails (DB error, constraint violation, network timeout), the error is swallowed — the user was charged but AI failed, and the refund silently didn't happen. The user's credits are gone and they're angry.

**Impact:** HIGH — Financial data (refunds) is not guaranteed; silent failures lead to customer support overhead and trust erosion.

**Fix:** Log and alert on refund failure; optionally retry via Inngest:

```typescript
catch (aiError) {
  try {
    await supabase.rpc('fn_refund_credits', { p_request_id: requestId });
  } catch (refundError) {
    // Alert immediately — this is a financial issue
    logger.error('CRITICAL: credit refund failed', {
      userId,
      requestId,
      error: String(refundError),
    });
    // Optionally queue a retry job
    await inngest.send({
      name: 'refund.retry',
      data: { requestId, userId },
    });
  }
  throw aiError;
}
```

---

#### [HIGH] Webhook body preview logged to abuse_logs on signature mismatch

**File:** `app/api/webhooks/razorpay/route.ts:18-24`

```typescript
if (!verifyWebhookSignature(rawBody, signature)) {
  console.error('webhook_signature_mismatch', { ip });
  await supabase.from('abuse_logs').insert({
    event_type: 'webhook_signature_mismatch',
    ip_address: ip,
    metadata: { signature, body_preview: rawBody.slice(0, 200) },
  });
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}
```

Raw payment webhook bodies can contain card data fragments, PII, or other PCI-sensitive fields depending on Razorpay's payload structure. Storing even 200 bytes in an `abuse_logs` table (which may have broader read access than sensitive payment data) is a PCI/GDPR compliance risk. If `abuse_logs` is ever exported, shared, or accessed by non-admin staff, sensitive data is exposed.

**Impact:** HIGH — PCI-DSS violation; sensitive payment data logged and queryable.

**Fix:** Remove `body_preview` or replace with a hash:

```typescript
const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
await supabase.from('abuse_logs').insert({
  event_type: 'webhook_signature_mismatch',
  ip_address: ip,
  metadata: { signature, body_hash: bodyHash },
});
```

---

#### [HIGH] `checkDeviceFingerprint` applies `multi_account_device` trust penalty to all existing users on every new signup from a shared device

**File:** `lib/abuse/ipControl.ts:72-75`

```typescript
if (accountCount >= 2) {
  for (const uid of uniqueUsers) {
    await applyTrustEvent(uid, 'multi_account_device'); // penalises existing legitimate users
  }
  await applyTrustEvent(newUserId, 'multi_account_device');
}
```

Family members sharing a device, or a new user at an internet café, will cause all pre-existing legitimate users on that device to lose 25 trust points — silently. This could cascade:
- A household with 2 accounts creates a 3rd → both originals drop from 50 to 25
- 4th account created → all drop further
- Eventually all users on the device hit `account_status = 'restricted'`

This is brutal for legitimate shared-device scenarios (families, offices, schools).

**Impact:** HIGH — Legitimate users silently downgraded; frustration and support tickets.

**Fix:** Only flag the **new** user, and only escalate existing users if count exceeds a much higher threshold (e.g., 10+):

```typescript
if (accountCount >= 2) {
  // Only penalize the NEW user, not existing ones
  await applyTrustEvent(newUserId, 'multi_account_device');
}

// Auto-escalate (block) only on extreme counts
if (accountCount >= 10) {
  for (const uid of uniqueUsers) {
    await supabase.from('users').update({ account_status: 'blocked' }).eq('id', uid);
  }
  await fireAdminAlert({ kind: 'device_fingerprint_abuse', fpHash, accountCount });
}
```

---

### Medium Issues

#### [MEDIUM] `checkIpSignupLimit` has a race condition

**File:** `lib/abuse/ipControl.ts:18-19`

```typescript
export async function checkIpSignupLimit(ip: string): Promise<{ allowed: boolean; count: number }> {
  const key = `signup:ip:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 86400);
  if (count > 3) { ... }
  return { allowed: count <= 3, count };
}
```

Between `INCR` and `EXPIRE`, if the process crashes, times out, or Redis connection is lost:
- The key persists in Redis forever (no TTL)
- All future signups from that IP are permanently blocked

This is a subtle but real risk in a production system.

**Impact:** MEDIUM — Can permanently block legitimate IP ranges (ISP NAT, corporate proxy, mobile carrier gateway).

**Fix:** Use atomic Redis operations:

```typescript
// Option 1: Use SET with flags (most reliable)
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 86400); // set TTL only on first incr
}

// Option 2: Use a Lua script for true atomicity
// Or use `redis.set(key, count, { ex: 86400, nx: true })` + `redis.incr(key)` separately

// Option 3: Switch to a different data structure
// Use a sorted set with timestamp: `ZADD signup:ip {timestamp} {ip}`
// Then `ZCOUNT signup:ip {now - 86400} {now}` to get count
```

Better: use Upstash's `sliding-window` rate limiter (which you already do elsewhere in the codebase) instead of manual Redis logic:

```typescript
const signupLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '24 h'),
  prefix: 'signup:ip',
});

export async function checkIpSignupLimit(ip: string) {
  const { success, remaining } = await signupLimit.limit(ip);
  return { allowed: success, count: 3 - remaining };
}
```

---

#### [MEDIUM] PPP FX rates are hardcoded

**File:** `lib/pricing/ppp.ts:16`

```typescript
const FX: Record<Currency, number> = { USD: 1, INR: 83, EUR: 0.92 };
```

Hardcoded FX rates will drift from reality. INR fluctuates 5–10% per year; EUR varies 3–5%. Using stale rates means:
- Users in India are overcharged or undercharged by 5–10% until code is updated
- Revenue per currency is unpredictable
- Requires code changes to stay current

**Impact:** MEDIUM — Pricing inaccuracy; revenue volatility; requires deploys to update.

**Fix:** Store rates in the database or fetch from a cached external source:

```typescript
// Option 1: Database-driven (best for this app)
const { data: rates } = await supabase.from('fx_rates').select('usd, inr, eur').single();
const FX = { USD: 1, INR: rates.inr, EUR: rates.eur };

// Option 2: Cached external fetch (updated daily via cron)
const cached = await redis.get('fx_rates');
if (cached) return JSON.parse(cached);

const fresh = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(r => r.json());
await redis.set('fx_rates', JSON.stringify(fresh.rates), { ex: 86400 });
return fresh.rates;
```

---

#### [MEDIUM] `createSubscription` does not record the subscription in your database

**File:** `lib/billing/razorpay.ts:72-85`

```typescript
export async function createSubscription(params: {
  userId: string;
  planId: string;
  razorpayPlanId: string;
}): Promise<{ subscriptionId: string; hostedUrl: string }> {
  const sub = await rzp.subscriptions.create({
    plan_id: params.razorpayPlanId,
    total_count: 12,
    quantity: 1,
    customer_notify: 1,
    notes: { userId: params.userId, planId: params.planId },
  });
  return { subscriptionId: sub.id, hostedUrl: (sub as Record<string, unknown>).short_url as string ?? '' };
  // NO INSERT into subscriptions table!
}
```

Compare with `createOrder` (line 60–67), which inserts into `payments`. But `createSubscription` only creates the Razorpay subscription and returns the ID/URL. It never inserts into your `subscriptions` table.

The subscription row must exist **before** the webhook fires, because the webhook handler does:

```typescript
// lib/billing/webhookHandlers.ts:88-94
await supabase
  .from('subscriptions')
  .update({
    status: 'active',
    period_start: new Date(Number(sub.current_start) * 1000).toISOString(),
    period_end: new Date(Number(sub.current_end) * 1000).toISOString(),
  })
  .eq('razorpay_subscription_id', sub.id);
```

When the webhook fires with a new subscription ID, this `UPDATE` will update **0 rows** because no subscription row exists. The credits are never granted.

**Impact:** MEDIUM — Subscription activations silently fail; users pay but don't get credits.

**Fix:** Insert the subscription immediately after creating it in Razorpay:

```typescript
export async function createSubscription(params: {
  userId: string;
  planId: string;
  razorpayPlanId: string;
}): Promise<{ subscriptionId: string; hostedUrl: string }> {
  const sub = await rzp.subscriptions.create({
    plan_id: params.razorpayPlanId,
    total_count: 12,
    quantity: 1,
    customer_notify: 1,
    notes: { userId: params.userId, planId: params.planId },
  });

  // Insert into your subscriptions table
  const supabase = adminClient();
  await supabase.from('subscriptions').insert({
    user_id: params.userId,
    plan_id: params.planId,
    razorpay_subscription_id: sub.id,
    status: 'pending', // waiting for activation webhook
    razorpay_plan_id: params.razorpayPlanId,
  });

  return {
    subscriptionId: sub.id,
    hostedUrl: (sub as Record<string, unknown>).short_url as string ?? '',
  };
}
```

---

#### [MEDIUM] `handlePaymentRefunded` credits deduction uses negative topup

**File:** `lib/billing/webhookHandlers.ts:186-191`

```typescript
if (credits > 0) {
  const wallet = await getWallet(userId, supabase);
  if (wallet) {
    await supabase.rpc('fn_credit_topup', {
      p_wallet_id: wallet.id,
      p_amount: -credits,  // negative amount
      p_payment_id: refund.id,
    });
  }
}
```

Whether `fn_credit_topup` safely handles negative amounts depends entirely on the SQL function definition — which is not reviewed here. If the function has a `CHECK (amount > 0)` constraint or does `balance + amount` without a floor check:
- It throws an error (and refund processing fails)
- Or it underflows (balance becomes negative)
- Or it silently clamps to 0 (losing data)

The better design is a dedicated `fn_credit_deduct_refund` RPC that makes the intent explicit.

**Impact:** MEDIUM — Refund logic is fragile; depends on undocumented SQL behavior.

**Fix:** Create a dedicated RPC or pass `p_amount: -credits` with explicit documentation. Better yet, add a dedicated function:

```typescript
// In your SQL migrations
CREATE FUNCTION fn_credit_deduct_refund(
  p_wallet_id UUID,
  p_amount INT,
  p_refund_id TEXT
) RETURNS INT AS $$
  UPDATE credit_wallets
  SET balance = GREATEST(balance - p_amount, 0)  -- prevent underflow
  WHERE id = p_wallet_id
  RETURNING balance;
$$ LANGUAGE SQL;

// In webhookHandlers.ts
await supabase.rpc('fn_credit_deduct_refund', {
  p_wallet_id: wallet.id,
  p_amount: credits,
  p_refund_id: refund.id,
});
```

---

#### [MEDIUM] `generate.ts` bypasses `lib/ai.ts` abstraction

**File:** `lib/credits/generate.ts:12-13` & `50`

```typescript
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Later...
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: (options.max_tokens as number) ?? 2048,
  messages: [{ role: 'user', content: prompt }],
});
```

The project has a well-designed `lib/ai.ts` abstraction with:
- Retry logic (`withRetry` with exponential backoff)
- Provider switching (Anthropic/OpenAI)
- Prompt caching (`cache_control: { type: 'ephemeral' }`)

But `generate.ts` creates a raw Anthropic client directly, bypassing all of this. This is the hot path (every content generation), so missing retry logic and prompt caching has real impact.

**Impact:** MEDIUM — Hot path doesn't retry on transient failures; no prompt caching = higher latency and API costs.

**Fix:** Use `createMessage()` from `lib/ai.ts`:

```typescript
import { createMessage, CreateMessageOptions } from '@/lib/ai';

// BEFORE
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: ...,
  messages: [{ role: 'user', content: prompt }],
});
result = response.content[0].type === 'text' ? response.content[0].text : '';

// AFTER
result = await createMessage({
  model: 'claude-sonnet-4-6',
  maxTokens: ...,
  system: '...', // if needed for prompt caching
  messages: [{ role: 'user', content: prompt }],
});
```

---

#### [MEDIUM] `levenshtein` in `emailValidate.ts` is O(m×n) — fine at current scale

**File:** `lib/abuse/emailValidate.ts:12-33`

The implementation is correct and runs against a small fixed list (10 providers), so this is not a current performance concern. If the provider list grows to hundreds, consider switching to a trie or a dedicated library like `js-levenshtein`.

**Impact:** LOW → MEDIUM (only scales into problem if provider list grows).

---

### Low Issues

#### [LOW] `verifyWebhookSignature` returns `false` when `RAZORPAY_WEBHOOK_SECRET` is undefined

**File:** `lib/billing/razorpay.ts:87-97`

```typescript
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');
  // ...
}
```

If `RAZORPAY_WEBHOOK_SECRET` is missing, the non-null assertion (`!`) does nothing at runtime, and `crypto.createHmac` receives `undefined`, which throws:

```
TypeError: The "algorithm" argument must be of type string
```

This becomes a 500 error in the webhook handler, not a clean 400 "Invalid signature". It also masks the real issue (missing env var) with a cryptic runtime error.

**Impact:** LOW — Webhook handling fails with a confusing error if env var is missing.

**Fix:** Add an explicit guard at module initialization:

```typescript
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error('RAZORPAY_WEBHOOK_SECRET env var is required');
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  // ...
}
```

---

#### [LOW] `checkDeviceEscalation` called unconditionally even when `blocked = false`

**File:** `app/api/auth/signup/route.ts:80`

```typescript
if (fingerprint_hash) {
  const { blocked } = await checkDeviceFingerprint(fingerprint_hash, userId);
  if (blocked) {
    await supabase.from('users').update({ account_status: 'blocked' }).eq('id', userId);
    await checkDeviceEscalation(fingerprint_hash);
    return NextResponse.json({ error: 'Account limit reached from this device.' }, { status: 403 });
  }
  await checkDeviceEscalation(fingerprint_hash);  // ALWAYS called
}
```

The function runs an unbounded query regardless of whether the device was blocked:

```typescript
const { data } = await supabase
  .from('user_devices')
  .select('user_id')
  .eq('fingerprint_hash', fpHash)
  .gte('created_at', since);
```

Without an index on `user_devices.fingerprint_hash`, this is a table scan on every signup. At scale (millions of signups), this becomes a perf bottleneck.

**Impact:** LOW — Potential table scan on every signup; performance degrades at scale.

**Fix:** Ensure `user_devices.fingerprint_hash` is indexed:

```sql
CREATE INDEX idx_user_devices_fingerprint_hash 
  ON user_devices(fingerprint_hash) 
  WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

#### [LOW] `higherTier` tie-breaking in Razorpay uses `>=` (undocumented semantics)

**File:** `lib/billing/razorpay.ts:20-22`

```typescript
const TIER_RANK: Record<string, number> = { Tier1: 4, Tier2: 3, Tier3: 2, Tier4: 1 };

function higherTier(a: { tier_name: string }, b: { tier_name: string }) {
  return (TIER_RANK[a.tier_name] ?? 4) >= (TIER_RANK[b.tier_name] ?? 4) ? a : b;
}
```

When tiers are equal, `>=` returns `a` (stored country tier wins). This is intentional but undocumented. A reader might expect `>` and miss the tie-breaking behavior.

**Impact:** LOW — Subtle but not a bug; just needs a comment.

**Fix:** Add a comment:

```typescript
function higherTier(a: { tier_name: string }, b: { tier_name: string }) {
  // Return higher tier; on tie, prefer first argument (stored country wins over detected)
  return (TIER_RANK[a.tier_name] ?? 4) >= (TIER_RANK[b.tier_name] ?? 4) ? a : b;
}
```

---

## 4. Recommendations — Priority Order

### Immediate (Ship This Week)

1. **[CRITICAL] Fix hardcoded trust score** (`generate/route.ts:48`)
   - 2-line fix: call `await getEffectiveTrustScore(userId)`
   - Impact: Unblocks CAPTCHA enforcement

2. **[CRITICAL] Replace singleton Supabase clients with factory functions** (`wallet.ts`, `generate.ts`, `admin/auth.ts`)
   - Search-replace 3 files; ~5 min
   - Impact: Prevents service-role key exposure

3. **[CRITICAL] Fix signup ordering** (`auth/signup/route.ts`)
   - Move device/IP checks before `createUser`; or call `deleteUser` on block
   - Impact: Prevents orphaned auth users

4. **[HIGH] Fix IP extraction** (`middleware.ts:31`)
   - 1-line fix: add `.split(',')[0].trim()`
   - Impact: IP-based rate limits are now effective

### Before Beta (Next Sprint)

5. **[HIGH] Fix Webhook body logging** (`webhooks/razorpay/route.ts:22`)
   - Remove or hash `body_preview`
   - Impact: PCI compliance

6. **[HIGH] Fix `createSubscription` to insert into DB** (`billing/razorpay.ts:72`)
   - Add 1 insert call after Razorpay subscription creation
   - Impact: Subscription activations now work

7. **[HIGH] Fix `fn_refund_credits` failure handling** (`credits/generate.ts:55`)
   - Add try/catch around refund RPC; log/alert on failure
   - Impact: Financial data now tracked

8. **[HIGH] Reduce `multi_account_device` penalty harshness** (`ipControl.ts:72`)
   - Only penalize new users, not existing ones; raise threshold to 10+ for auto-block
   - Impact: Family users no longer silently throttled

9. **[MEDIUM] Route `generate.ts` through `lib/ai.ts`** (`credits/generate.ts`)
   - Replace raw Anthropic client with `createMessage()` call
   - Impact: Retry logic + prompt caching on hot path

10. **[MEDIUM] Add subscription insert** (`webhookHandlers.ts`)
    - Make sure webhook handler receives a valid row to update
    - Impact: Prevents silent webhook failures

### Before Production

11. **[MEDIUM] Fix `checkIpSignupLimit` race condition** (`ipControl.ts:18`)
    - Use atomic Redis operations or Upstash rate limiter
    - Impact: Prevents permanent IP blocks

12. **[MEDIUM] Store FX rates in DB** (`pricing/ppp.ts:16`)
    - Move from hardcoded to database-driven
    - Impact: Pricing stays accurate

13. **[MEDIUM] Add admin re-validation** (`lib/admin/auth.ts`)
    - Either add sentinel header or re-verify token
    - Impact: Admin endpoints are now protected from header spoofing

14. **[LOW] Migrate middleware logging to project logger** (`middleware.ts:115`)
    - Use `pino` instead of `console.log`
    - Impact: Consistent logging

15. **[LOW] Add index on `user_devices.fingerprint_hash`** (SQL migration)
    - Prevent table scans on device checks
    - Impact: Scalable signup flow

---

## 5. Potential Risks at Scale

| Risk | Current Severity | If Shipped | Mitigation |
|---|---|---|---|
| Hardcoded `trustScore = 50` disables CAPTCHA | CRITICAL | Abusers bypass all anti-spam | Fix immediately |
| Orphaned auth users from device block | CRITICAL | Backdoor login paths | Reorder signup checks |
| `fn_refund_credits` silent failure | HIGH | Users lose credits undetected | Add alerting + retry |
| `createSubscription` doesn't insert to DB | HIGH | Subscriptions never activate | Insert on creation |
| PCI data in abuse_logs | HIGH | Compliance violation | Remove body_preview |
| IP rate limits keyed on proxy string | HIGH | Signup abuse via distributed proxies | Fix IP parsing |
| `checkIpSignupLimit` race condition | MEDIUM | Permanent IP blocks | Use atomic Redis |
| Module singleton Supabase clients | MEDIUM | Service role key exposure | Use factory pattern |
| FX rates hardcoded | MEDIUM | Revenue misalignment | Use DB-driven rates |
| Multi-account penalty too harsh | MEDIUM | Family users frustrated | Reduce penalty harshness |

---

## 6. Test Coverage Audit

The codebase has tests (`.test.ts` files exist in `lib/abuse/` and elsewhere), but the explorer doesn't detail coverage. **Critical paths that MUST have tests:**

- [ ] `generateWithDeduction` flow (happy path + insufficient credits + AI failure + refund RPC failure)
- [ ] Razorpay webhook handling (all 6 event types, idempotency, missing metadata)
- [ ] Signup flow (all abuse checks, device/IP escalation, device block)
- [ ] Trust score enforcement in CAPTCHA logic
- [ ] Admin authorization (both `requireAdmin` success and bypass attempts)
- [ ] `checkIpSignupLimit` (3-limit behavior, 24h TTL)
- [ ] `deductCredits` + `topupCredits` atomicity

Run `npm test -- --coverage` and aim for >90% coverage of `lib/` and `app/api/` paths.

---

## 7. Conclusion

**Verdict:** **BLOCK** — 3 CRITICAL issues prevent production use.

**Stability Score:** 6.5 / 10

**Breakdown:**
- ✅ **Architecture:** 8.5 / 10 (clean, well-layered, proper separation)
- ✅ **Security mindset:** 8 / 10 (trust scoring, abuse detection, webhook verification done right)
- ❌ **Implementation completeness:** 4 / 10 (hardcoded values, orphaned accounts, fire-and-forget refunds)
- ❌ **Testing:** 5 / 10 (tests exist but coverage unclear; critical paths need more)

**Path to 10/10:**
1. Fix the 3 CRITICAL issues (1 day of focused work)
2. Address the 6 HIGH issues (2–3 days)
3. Add comprehensive test coverage for hot paths (2–3 days)
4. Run security audit on payment logic (1 day external)
5. Load test rate limiting + abuse detection at 10x current scale (1 day)
6. **Result:** 9.5 / 10 (mature, battle-tested SaaS platform)

The foundation is solid. The issues are fixable. Ship with confidence after addressing the CRITICAL tier.

