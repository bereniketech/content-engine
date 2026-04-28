# Stability Roadmap: From 6.5/10 to 10/10

**Current Status:** 6.5 / 10 (production-ready architecture, incomplete implementation)  
**Target:** 10 / 10 (battle-tested SaaS platform)  
**Timeline:** 2 weeks of focused engineering

---

## Phase 1: Unblock Production (3 Days)

### Day 1: Fix Critical Issues

**[CRITICAL] Hardcoded Trust Score** (30 min)
- File: `app/api/content/generate/route.ts:48`
- Change from: `const trustScore = 50;`
- Change to: `const trustScore = await getEffectiveTrustScore(userId);`
- Test: Call `/api/content/generate` with a user whose trust score is < 40; verify CAPTCHA is required.

**[CRITICAL] Singleton Supabase Clients** (1.5 hours)
- Files: `lib/credits/wallet.ts`, `lib/credits/generate.ts`, `lib/admin/auth.ts`
- Pattern to follow: `lib/billing/razorpay.ts:6-11` (use `adminClient()` factory)
- Replace 3 module-level `const supabase = createClient(...)` with function-scoped clients
- Test: Verify wallet deduction and credit topup still work; check middleware logs for no errors

**[CRITICAL] Signup Ordering** (2 hours)
- File: `app/api/auth/signup/route.ts`
- Reorder checks:
  1. IP limit (line 32)
  2. Email validation (line 42)
  3. Check existing account (line 46)
  4. **NEW: Device fingerprint check** (before createUser)
  5. **NEW: VPN detection** (before createUser)
  6. Create auth user (line 49)
  7. Create user row, wallet, logs
- Test: Sign up with a device that already has 4 accounts; verify 403 is returned and no auth user is created.

**[HIGH] IP Extraction** (15 min)
- File: `middleware.ts:31`
- Change: `const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';`
- Change to: `const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';`
- Test: Make a request with `x-forwarded-for: "1.2.3.4, 5.6.7.8"` and verify `x-client-ip: 1.2.3.4` is set.

**[HIGH] Webhook Body Logging** (20 min)
- File: `app/api/webhooks/razorpay/route.ts:22`
- Remove: `body_preview: rawBody.slice(0, 200)`
- Replace with: `body_hash: crypto.createHash('sha256').update(rawBody).digest('hex')`
- Test: Trigger a signature mismatch; verify abuse_logs shows hash, not body.

---

### Day 2: Fix Subscription & Refund Logic

**[HIGH] `createSubscription` DB Insert** (45 min)
- File: `lib/billing/razorpay.ts:72-85`
- After `const sub = await rzp.subscriptions.create(...)`, insert:
  ```typescript
  const supabase = adminClient();
  await supabase.from('subscriptions').insert({
    user_id: params.userId,
    plan_id: params.planId,
    razorpay_subscription_id: sub.id,
    status: 'pending',
    razorpay_plan_id: params.razorpayPlanId,
  });
  ```
- Test: Create a subscription; verify a row exists in `subscriptions` table.

**[HIGH] Refund Error Handling** (1 hour)
- File: `lib/credits/generate.ts:55`
- Wrap refund RPC in try/catch:
  ```typescript
  catch (aiError) {
    try {
      await supabase.rpc('fn_refund_credits', { p_request_id: requestId });
    } catch (refundError) {
      logger.error('CRITICAL: credit refund failed', {
        userId,
        requestId,
        error: String(refundError),
      });
      await inngest.send({
        name: 'refund.retry',
        data: { requestId, userId },
      });
    }
    throw aiError;
  }
  ```
- Test: Simulate AI success but refund RPC failure; verify error is logged.

**[MEDIUM] Multi-Account Penalty Softening** (30 min)
- File: `lib/abuse/ipControl.ts:72-75`
- Replace harsh penalty for all users with:
  ```typescript
  if (accountCount >= 2) {
    // Only penalize the new user
    await applyTrustEvent(newUserId, 'multi_account_device');
  }
  
  // Auto-block only on extreme counts
  if (accountCount >= 10) {
    for (const uid of uniqueUsers) {
      await supabase.from('users').update({ account_status: 'blocked' }).eq('id', uid);
    }
    await fireAdminAlert({ kind: 'device_fingerprint_abuse', fpHash, accountCount });
  }
  ```
- Test: Create 3 accounts from same device; verify only the 3rd is penalized, not the first 2.

---

### Day 3: Hot Path & Logging

**[MEDIUM] Route `generate.ts` Through `lib/ai.ts`** (1.5 hours)
- File: `lib/credits/generate.ts:46-53`
- Remove direct Anthropic client instantiation
- Replace with:
  ```typescript
  import { createMessage } from '@/lib/ai';
  
  const result = await createMessage({
    model: 'claude-sonnet-4-6',
    maxTokens: (options.max_tokens as number) ?? 2048,
    messages: [{ role: 'user', content: prompt }],
  });
  ```
- Also update token counting (createMessage doesn't return token counts directly; may need adjustment)
- Test: Generate content; verify it works with retry logic and prompt caching.

**[MEDIUM] Logging** (20 min)
- File: `middleware.ts:115-124`
- Replace `console.log(JSON.stringify(...))` with project logger:
  ```typescript
  import { logger } from '@/lib/logger';
  logger.info({
    request_id: requestId,
    user_id: user.id,
    method: req.method,
    pathname,
    ip,
    country,
  });
  ```
- Test: Check logs; verify they appear in structured format matching `pino`.

---

**End of Phase 1:** ✅ **All CRITICAL + HIGH issues resolved** → **Stability: 8.0 / 10**

---

## Phase 2: Strengthen Hot Paths (3 Days)

### Day 4: Admin & Rate Limiting

**[HIGH] Admin Authorization Re-validation** (1 hour)
- File: `lib/admin/auth.ts`
- Option A (lighter): Add middleware sentinel
  ```typescript
  // middleware.ts — after successful auth
  res.headers.set('x-auth-verified', '1');
  
  // lib/admin/auth.ts
  if (req.headers.get('x-auth-verified') !== '1') return null;
  ```
- Option B (paranoid): Re-validate token
  ```typescript
  const token = req.cookies.get('__Secure-sb-access')?.value ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) return null;
  ```
- Test: Attempt to spoof `x-user-id` header in a request; verify admin routes reject it.

**[MEDIUM] `checkIpSignupLimit` Race Condition** (1.5 hours)
- File: `lib/abuse/ipControl.ts:14-31`
- Replace with Upstash rate limiter (consistent with project style):
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
- Test: Max out an IP at 3 signups; verify 4th is blocked; wait 24h (or mock time); verify 5th succeeds.

**[MEDIUM] Auth Cookie Name Constant** (20 min)
- File: `middleware.ts:71`
- Extract to shared constant:
  ```typescript
  // lib/auth.ts (top)
  export const SUPABASE_AUTH_COOKIE = '__Secure-sb-access';
  
  // middleware.ts
  import { SUPABASE_AUTH_COOKIE } from '@/lib/auth';
  const token = req.cookies.get(SUPABASE_AUTH_COOKIE)?.value ?? ...;
  ```
- Test: Ensure both middleware and any other cookie-checking code use the same constant.

---

### Day 5: Payment & Pricing Logic

**[MEDIUM] Negative Credit Handling** (1 hour)
- File: `lib/billing/webhookHandlers.ts:186-191`
- Either:
  - Document that `fn_credit_topup` safely handles negative amounts (inspect the SQL function)
  - Or create a dedicated `fn_credit_deduct_refund` RPC that doesn't accept negative amounts
- Test: Process a refund; verify user's balance decreases correctly and doesn't go below 0.

**[MEDIUM] PPP FX Rates** (2 hours)
- Move from code constant to database
- Create a migration adding an `fx_rates` table:
  ```sql
  CREATE TABLE fx_rates (
    id SERIAL PRIMARY KEY,
    currency VARCHAR(3) UNIQUE,
    rate DECIMAL(10, 4) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  );
  
  INSERT INTO fx_rates (currency, rate) VALUES
    ('INR', 83.0),
    ('EUR', 0.92),
    ('USD', 1.0);
  ```
- Update `lib/pricing/ppp.ts`:
  ```typescript
  export async function getFxRates(): Promise<Record<Currency, number>> {
    const supabase = createClient();
    const { data } = await supabase.from('fx_rates').select('currency, rate');
    const rates: Record<string, number> = {};
    (data ?? []).forEach(row => { rates[row.currency] = row.rate; });
    return rates as Record<Currency, number>;
  }
  ```
- Update price calculation:
  ```typescript
  export async function priceFor(tier: PppTier, currency: Currency, baseUsd: number): Promise<number> {
    const rates = await getFxRates();
    const raw = baseUsd * Number(tier.multiplier) * rates[currency];
    // ... rounding ...
  }
  ```
- Create a cron job (or manual admin command) to update rates daily from a source like `exchangerate-api.com`.
- Test: Change a rate in the DB; verify pricing reflects the change immediately.

---

### Day 6: Test Infrastructure

**Test Coverage for Critical Paths:**

1. **Credit Generation + Refund** (`lib/credits/generate.ts`)
   ```typescript
   describe('generateWithDeduction', () => {
     it('deducts credits and generates content', async () => { ... });
     it('refunds credits if AI fails', async () => { ... });
     it('returns 402 if insufficient credits', async () => { ... });
     it('logs generation with tokens and latency', async () => { ... });
   });
   ```

2. **Signup Anti-Abuse** (`app/api/auth/signup/route.ts`)
   ```typescript
   describe('signup flow', () => {
     it('blocks signup from IP with 3+ existing', async () => { ... });
     it('detects VPN and applies trust penalty', async () => { ... });
     it('blocks device with 4+ accounts and auto-blocks all users', async () => { ... });
     it('creates auth user only after all checks pass', async () => { ... });
     it('cleans up on device block (deletes auth user)', async () => { ... });
   });
   ```

3. **Razorpay Webhook Idempotency** (`app/api/webhooks/razorpay/route.ts`)
   ```typescript
   describe('razorpay webhook', () => {
     it('rejects invalid signature', async () => { ... });
     it('idempotently handles payment.captured (returns ok on replay)', async () => { ... });
     it('handles all 6 event types correctly', async () => { ... });
     it('never stores raw body preview', async () => { ... });
   });
   ```

4. **Trust Score Gating** (`app/api/content/generate/route.ts`)
   ```typescript
   describe('CAPTCHA gating', () => {
     it('requires CAPTCHA for trust < 40', async () => { ... });
     it('requires CAPTCHA for trust 40–80 + identical request', async () => { ... });
     it('never requires CAPTCHA for trust >= 80 (non-identical)', async () => { ... });
   });
   ```

**Run Coverage Report:**
```bash
npm test -- --coverage lib/ app/api/
# Target: >85% line coverage, >90% branch coverage on critical paths
```

**End of Phase 2:** ✅ **Hot paths hardened; comprehensive tests** → **Stability: 8.8 / 10**

---

## Phase 3: Production Readiness (5 Days)

### Day 7–8: Documentation & Migration

**[MEDIUM] Webhook Secret Guard** (15 min)
- File: `lib/billing/razorpay.ts`
- Add at module top:
  ```typescript
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET env var is required');
  }
  ```

**Database Migrations (apply to staging):**
1. `subscriptions` table: ensure `razorpay_subscription_id` has a unique constraint
2. Add index: `CREATE INDEX idx_user_devices_fingerprint ON user_devices(fingerprint_hash);`
3. Add `fx_rates` table (if using DB-driven rates)
4. Verify RPC definitions:
   - `fn_deduct_credits`: handles negative? Has timeout?
   - `fn_credit_topup`: handles negative? Clamps to 0?
   - `fn_refund_credits`: exists and works?
   - `fn_apply_trust_delta`: works?

**Documentation:**
- Add `DEPLOYMENT.md` covering:
  - All required env vars with example values
  - Database schema changes
  - Rate limit tiers (explain why 30/min for gen, 10/min for auth)
  - Trust score tiers (what each does)
  - RPC function contracts (inputs, outputs, edge cases)

---

### Day 9–10: Load Testing & Security Audit

**Load Test (Staging or Local):**
```bash
# Simulate 100 concurrent users generating content
artillery quick --count 100 --num 1000 /api/content/generate

# Simulate 1000 signup attempts (test IP rate limit)
artillery quick --count 1000 --num 1 /api/auth/signup

# Simulate Razorpay webhook burst
artillery quick --count 100 --num 100 /api/webhooks/razorpay
```

**Verify:**
- ✅ IP rate limits hold at 3 signups / 24h per IP
- ✅ User rate limits hold at 30/min for content gen
- ✅ Webhook rate limit holds at 100/min per IP
- ✅ No database connection pool exhaustion
- ✅ Redis operations complete within 50ms
- ✅ Refund RPC succeeds under load

**Security Review Checklist:**
- [ ] No hardcoded credentials in source
- [ ] Service-role key only used in server functions (grep: `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] PCI-sensitive data not logged (grep: `card`, `cvv`, `number`, `body_preview`)
- [ ] CAPTCHA token validation is present and correct
- [ ] Webhook signature verification is timing-safe (using `timingSafeEqual`)
- [ ] Admin routes check authorization on every request
- [ ] Rate limiters cover all auth and public endpoints
- [ ] Session invalidation works on logout
- [ ] Trust score enforcement is active on hot paths

**External Security Audit (Optional but Recommended):**
- Have a security firm audit payment flows, auth logic, and anti-abuse system
- Focus on: CAPTCHA bypass, refund fraud, multi-accounting, privilege escalation
- Cost: ~$5–10K; duration: 1 week

---

**End of Phase 3:** ✅ **Verified at scale; security audit passed** → **Stability: 9.5 / 10**

---

## What Remains for 10/10

| Item | Effort | Impact |
|---|---|---|
| 6+ months of production data | passive | Identify rare edge cases in payment flows, abuse patterns |
| 99.9% uptime SLA | ops | Infra redundancy, failover, monitoring |
| Comprehensive observability | 1 week | Distributed tracing (Otel), error budgets, runbooks |
| Security incident response plan | 1 day | On-call, escalation, post-mortem process |
| User education (best practices) | 2 days | FAQs, video tutorials, support docs |

**For a pure **code stability score of 10/10**, you need:**
1. ✅ All code issues fixed (Phases 1–2)
2. ✅ Comprehensive test coverage (Phase 2)
3. ✅ Load-tested at scale (Phase 3)
4. ✅ Security audit passed (Phase 3)
5. ✅ 6+ months of production stability (passive, time)

**You'll reach 10/10 by end of Phase 3 + 6 months of production uptime.**

---

## Success Metrics

### After Phase 1 (Day 3)
- [ ] 0 CRITICAL issues
- [ ] All HIGH issues resolved
- [ ] Signup flow orders checks correctly
- [ ] CAPTCHA enforcement active for trust < 80
- [ ] Webhook logging is PCI-compliant

### After Phase 2 (Day 6)
- [ ] 0 HIGH issues
- [ ] Hot path (content generation) uses `lib/ai.ts` with retry logic
- [ ] Admin routes cannot be bypassed via header spoofing
- [ ] >85% test coverage on `lib/` and `app/api/`
- [ ] Rate limiters tested and verified

### After Phase 3 (Day 10)
- [ ] Load-tested at 100× current scale
- [ ] Zero payment logic failures under load
- [ ] Security audit passed
- [ ] Deployment runbook documented
- [ ] On-call monitoring configured

---

## Appendix: Quick Reference

### Files to Touch (in priority order)
1. `app/api/content/generate/route.ts` — hardcoded trust score
2. `lib/credits/wallet.ts`, `lib/credits/generate.ts`, `lib/admin/auth.ts` — singleton pattern
3. `app/api/auth/signup/route.ts` — check ordering, auth user creation
4. `middleware.ts` — IP extraction, logging, sentinel header
5. `app/api/webhooks/razorpay/route.ts` — body logging, webhook handling
6. `lib/billing/razorpay.ts` — subscription insert, webhook secret guard
7. `lib/billing/webhookHandlers.ts` — refund error handling, negative amounts
8. `lib/abuse/ipControl.ts` — multi-account penalty, race condition
9. `lib/pricing/ppp.ts` — FX rates
10. `lib/admin/auth.ts` — re-validation

### Testing Commands
```bash
# Run all tests
npm test

# Watch mode (development)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Run specific test file
npm test -- auth.signup

# E2E tests
npm run e2e
```

### Environment Variables to Verify Pre-Production
```
✅ SUPABASE_SERVICE_ROLE_KEY — only used in server functions
✅ RAZORPAY_WEBHOOK_SECRET — must be set, validated at module init
✅ INTERNAL_API_KEY — used for internal email sending
✅ INNGEST_INTERNAL_SECRET — for internal Inngest calls
✅ ADMIN_ALERT_WEBHOOK_URL — for escalation alerts
✅ IPQS_API_KEY — for VPN detection
✅ RECAPTCHA_SECRET_KEY — for CAPTCHA verification
✅ All others — review for PCI/GDPR sensitivity
```

---

## Execution Checklist (Print & Use)

### Phase 1: CRITICAL Issues (Day 1–3)

**Day 1 — Unblock Production**

- [ ] Fix hardcoded trust score (`generate/route.ts:48`)
  - [ ] Code changed
  - [ ] Manual test: verify CAPTCHA required for trust < 40
  - [ ] Commit message: `fix: fetch actual trust score in content generation`

- [ ] Replace singleton Supabase clients (3 files)
  - [ ] `wallet.ts` — changed to factory pattern
  - [ ] `generate.ts` — changed to factory pattern
  - [ ] `admin/auth.ts` — changed to factory pattern
  - [ ] Grep: `const supabase = createClient` → should not exist in these 3 files
  - [ ] Commit message: `security: replace singletons with factory functions for service-role client`

- [ ] Fix signup ordering
  - [ ] Device check moved before `createUser`
  - [ ] Test: sign up with device that has 4+ accounts → should 403 before auth user created
  - [ ] Test: check Supabase auth user list → no orphaned users
  - [ ] Commit message: `fix: reorder signup checks to validate before creating auth user`

- [ ] Fix IP extraction
  - [ ] `middleware.ts:31` — uses `.split(',')[0].trim()`
  - [ ] Test: curl with `x-forwarded-for: "1.2.3.4, 5.6.7.8"` → `x-client-ip: 1.2.3.4`
  - [ ] Commit message: `fix: extract first IP from x-forwarded-for header`

- [ ] Remove body preview from webhook logging
  - [ ] `webhooks/razorpay/route.ts:22` — body_preview removed or hashed
  - [ ] Verify: signature mismatch logged without raw body
  - [ ] Commit message: `security: remove PCI-sensitive data from webhook error logs`

**Day 2 — Subscription & Refund**

- [ ] Fix `createSubscription` to insert to DB
  - [ ] Insert row in `subscriptions` after Razorpay creation
  - [ ] Test: subscribe → check `subscriptions` table has a row with status='pending'
  - [ ] Commit message: `fix: persist subscription to database on creation`

- [ ] Fix refund error handling
  - [ ] Wrap `fn_refund_credits` in try/catch
  - [ ] Log and alert on failure (Inngest job)
  - [ ] Test: simulate refund RPC failure → verify error logged
  - [ ] Commit message: `fix: alert on silent credit refund failures`

- [ ] Soften multi-account penalty
  - [ ] Only penalize new user, not existing ones
  - [ ] Raise auto-block threshold to 10+
  - [ ] Test: 3 users on same device → only 3rd penalized
  - [ ] Commit message: `fix: reduce false-positive penalties for shared devices`

**Day 3 — Hot Path & Logging**

- [ ] Route `generate.ts` through `lib/ai.ts`
  - [ ] Remove direct Anthropic client
  - [ ] Use `createMessage()` from abstraction
  - [ ] Update token counting logic (if needed)
  - [ ] Test: generate content → verify retry logic works (test with transient API error)
  - [ ] Commit message: `refactor: use lib/ai abstraction for hot path`

- [ ] Migrate middleware logging
  - [ ] Replace `console.log` with `logger.info`
  - [ ] Test: make request → check logs in JSON format matching pino
  - [ ] Commit message: `refactor: use structured logging in middleware`

**Day 3 Completion Check:**
- [ ] `npm run lint` passes
- [ ] `npm test` passes (at least existing tests)
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Commit all changes: `git commit -m "Phase 1: fix critical production issues"`

---

### Phase 2: Strengthen Hot Paths (Day 4–6)

**Day 4 — Admin & Rate Limiting**

- [ ] Add admin re-validation
  - [ ] Method chosen: [ ] sentinel header OR [ ] token re-verify
  - [ ] Code implemented
  - [ ] Test: spoof x-user-id header → verify blocked
  - [ ] Commit: `security: add re-validation for admin authorization`

- [ ] Fix `checkIpSignupLimit` race condition
  - [ ] Replace manual Redis with Upstash rate limiter
  - [ ] Test: 3 signups from IP succeed, 4th blocked
  - [ ] Test: 24h later (mock time), 5th succeeds
  - [ ] Commit: `fix: use atomic rate limiter for IP signup limit`

- [ ] Extract auth cookie name
  - [ ] Constant defined: `SUPABASE_AUTH_COOKIE`
  - [ ] Used in both `middleware.ts` and `lib/auth.ts`
  - [ ] Commit: `refactor: centralize auth cookie name constant`

**Day 5 — Payment & Pricing**

- [ ] Verify negative credit handling
  - [ ] Either inspect `fn_credit_topup` SQL OR create `fn_credit_deduct_refund`
  - [ ] Test: process refund → user balance decreases, doesn't go negative
  - [ ] Commit: `docs: document credit deduction behavior in refunds`

- [ ] Move FX rates to database
  - [ ] Create migration: `CREATE TABLE fx_rates (...)`
  - [ ] Update `lib/pricing/ppp.ts` to fetch from DB
  - [ ] Add cron job or admin command to update rates
  - [ ] Test: change rate in DB → pricing reflects change immediately
  - [ ] Commit: `refactor: move FX rates from code to database`

**Day 6 — Test Infrastructure**

- [ ] Write critical path tests (4 test suites)
  - [ ] `lib/credits/generate.ts` tests
  - [ ] `app/api/auth/signup/route.ts` tests
  - [ ] `app/api/webhooks/razorpay/route.ts` tests
  - [ ] `app/api/content/generate/route.ts` (CAPTCHA gating) tests

- [ ] Run coverage report
  - [ ] Target: >85% lines, >90% branches on critical paths
  - [ ] Generate report: `npm test -- --coverage`
  - [ ] Review gaps; write additional tests if needed

- [ ] Commit: `test: add comprehensive tests for critical payment and signup paths`

**Day 6 Completion Check:**
- [ ] All tests pass: `npm test`
- [ ] Coverage report generated and reviewed
- [ ] No TypeScript errors
- [ ] Commit all changes: `git commit -m "Phase 2: strengthen hot paths with tests and fixes"`

---

### Phase 3: Production Readiness (Day 7–10)

**Day 7–8 — Documentation & Migration**

- [ ] Add webhook secret validation
  - [ ] Guard at module init: `if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw ...`
  - [ ] Test: run without env var → get clear error message
  - [ ] Commit: `fix: validate RAZORPAY_WEBHOOK_SECRET at module init`

- [ ] Apply database migrations (on staging first)
  - [ ] [ ] Unique constraint on `subscriptions.razorpay_subscription_id`
  - [ ] [ ] Index on `user_devices.fingerprint_hash`
  - [ ] [ ] FX rates table (if using DB-driven rates)
  - [ ] [ ] Verify RPC functions exist and work

- [ ] Write DEPLOYMENT.md
  - [ ] List all required env vars with descriptions
  - [ ] Document rate limit tiers and rationale
  - [ ] Document trust score tiers and actions
  - [ ] Include RPC function contracts
  - [ ] Step-by-step deployment checklist

- [ ] Commit: `docs: add deployment guide and database migration docs`

**Day 9–10 — Load Testing & Security**

- [ ] Set up load test environment
  - [ ] Artillery or k6 configured with realistic scenarios
  - [ ] 100 concurrent users; 1000 content generations
  - [ ] 1000 signup attempts (test IP limits)
  - [ ] 100 concurrent webhook requests

- [ ] Run load tests
  - [ ] [ ] 100 concurrent users generating content
  - [ ] [ ] 1000 signup attempts from unique IPs
  - [ ] [ ] Webhook burst: 100 concurrent requests
  - [ ] [ ] Monitor: response times, error rates, Redis latency

- [ ] Verify metrics
  - [ ] [ ] IP rate limit: max 3 signups per IP per 24h
  - [ ] [ ] User rate limit: max 30/min for content gen
  - [ ] [ ] Webhook rate limit: max 100/min per IP
  - [ ] [ ] No DB connection pool exhaustion
  - [ ] [ ] Redis operations < 50ms p99

- [ ] Security review
  - [ ] [ ] Grep for hardcoded credentials (none should exist)
  - [ ] [ ] Service-role key only in server functions
  - [ ] [ ] PCI-sensitive data not in logs
  - [ ] [ ] CAPTCHA validation present
  - [ ] [ ] Webhook signature uses `timingSafeEqual`
  - [ ] [ ] Admin routes check auth
  - [ ] [ ] All endpoints rate-limited
  - [ ] [ ] Session invalidation on logout
  - [ ] [ ] Trust score enforced on hot paths

- [ ] (Optional) Schedule external security audit
  - [ ] Focus areas: payment flows, auth, anti-abuse
  - [ ] Budget: ~$5–10K
  - [ ] Timeline: 1 week

- [ ] Commit: `test: add load tests and verify rate limiting at scale`

**Day 10 Completion Check:**
- [ ] All load tests pass with green metrics
- [ ] Security audit checklist completed
- [ ] DEPLOYMENT.md reviewed and accurate
- [ ] Final commit: `git commit -m "Phase 3: production-ready with load tests and security verification"`
- [ ] Create release tag: `git tag -a v1.0.0-production -m "Stability 9.5/10: all critical issues fixed, tested at scale"`

---

### Post-Production (6+ Months)

- [ ] Monitor production metrics
  - [ ] Error rates, latency percentiles, uptime
  - [ ] Payment success rates, refund rates
  - [ ] Signup abuse patterns, trust score distribution

- [ ] Respond to production incidents
  - [ ] Log patterns, user reports, automated alerts
  - [ ] Root-cause analysis
  - [ ] Post-mortem process

- [ ] Iterate based on real data
  - [ ] Adjust rate limits if needed
  - [ ] Refine trust score deltas based on abuse patterns
  - [ ] Optimize hot paths if latency issues emerge

**6-Month Milestone:** Production-stable, battle-tested, 10/10 stability score.

---

## Quick Command Reference

```bash
# Test and lint
npm test
npm run lint
npx tsc --noEmit

# Coverage
npm test -- --coverage

# Load testing (with Artillery)
artillery run load-test.yml

# Database migrations
npx supabase migration list
npx supabase migration up

# Deploy to staging
git push origin main:staging
# (CI/CD triggers deploy)

# Tag and release
git tag -a v1.0.0 -m "message"
git push origin v1.0.0

# View logs
npm run logs:production  # if available
# or check Sentry/Vercel dashboard
```

---

## Sign-Off Template

When Phase 1 is complete, fill this out and commit to the repo:

```markdown
# Production Readiness Sign-Off

## Phase 1 (CRITICAL Issues)
- [x] Hardcoded trust score fixed
- [x] Singleton Supabase clients replaced
- [x] Signup check ordering fixed
- [x] IP extraction fixed
- [x] Webhook body logging fixed
- [x] Subscription insertion added
- [x] Refund error handling added
- [x] Multi-account penalty softened
- [x] Hot path routed through lib/ai
- [x] Logging migrated to structured format

**Stability Score: 8.0 / 10** ✅
**Ready for: Staging**

## Phase 2 (HIGH Issues + Testing)
- [x] Admin re-validation added
- [x] IP rate limit race condition fixed
- [x] FX rates moved to database
- [x] Comprehensive tests written
- [x] >85% coverage on critical paths

**Stability Score: 8.8 / 10** ✅
**Ready for: Load testing**

## Phase 3 (Production Readiness)
- [x] Load tested at scale
- [x] Security audit passed
- [x] Deployment guide written
- [x] All metrics verified

**Stability Score: 9.5 / 10** ✅
**Ready for: Production**

**Signed:** @sherylmathew95sc  
**Date:** [YYYY-MM-DD]
```

