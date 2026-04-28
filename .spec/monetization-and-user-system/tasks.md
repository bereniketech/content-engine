# Implementation Plan: Monetization & User System

- [ ] 1. Supabase schema migration — all 16 tables
  - Create enums: `account_type_t`, `account_status_t`, `wallet_owner_t`, `sub_status_t`, `pay_status_t`, `team_role_t`
  - Create core tables: `users` (extension on Supabase Auth), `credit_wallets`, `credit_transactions` (range-partitioned by month), `subscription_plans`, `subscriptions`, `payments`
  - Create supporting tables: `ppp_tiers`, `teams`, `team_members`, `team_invites`, `email_verifications`, `email_domain_blocklist`, `email_log` (partitioned), `trust_score_events` (partitioned), `abuse_logs` (partitioned), `admin_actions`, `webhook_events`, `user_devices`, `user_ip_log` (partitioned), `free_credit_grants`, `daily_credit_aggregates`
  - Add all unique constraints (`uniq_active_sub_per_user`, `webhook_events(provider, idempotency_key)`, `credit_transactions(wallet_id, request_id)`, `free_credit_grants(fingerprint_hash)`)
  - Add all indexes per design (`idx_user_devices_fp`, `idx_ip_log_ip_time`, `idx_credit_tx_wallet_time`, `idx_abuse_logs_ip`, `idx_abuse_logs_fp`, `idx_fcg_ip_day`)
  - Place in `supabase/migrations/<timestamp>__init_monetization.sql`
  - _Requirements: 1, 3, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 23, 25, 27_
  - _Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md, .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** `supabase db push` succeeds against fresh project. All 16+ tables present. `\d+` shows partitioned tables. No constraint or FK errors.

- [ ] 2. Supabase RLS policies for user-scoped tables
  - Enable RLS on every business table
  - Policies: `users` (self read/update; admin all), `credit_wallets` + `credit_transactions` (owner user OR team member can read; service-role write only), `subscriptions` + `payments` (user-scoped read; service-role write), `teams` + `team_members` (members read; owner mutate; service for invite-accept), `admin_actions` + `abuse_logs` + `webhook_events` + `email_domain_blocklist` (admin read; service write), `email_verifications` + `trust_score_events` + `free_credit_grants` + `user_devices` + `user_ip_log` (service-role only)
  - Default deny — every grant explicit
  - _Requirements: 5, 6, 11, 12, 23_
  - _Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md, .kit/skills/testing-quality/security-review/SKILL.md_
  - **AC:** Authenticated user A cannot SELECT user B's wallet/transactions/payments. Non-admin cannot read `admin_actions`. Service role retains full access. Automated RLS policy test suite passes.

- [ ] 3. Postgres RPC functions for atomic credit mutations
  - `fn_deduct_credits(wallet_id UUID, cost INT, action_type TEXT, request_id UUID, actor TEXT) RETURNS INT` — `SELECT … FOR UPDATE` on wallet, validate `balance >= cost`, decrement, INSERT `credit_transactions` row keyed by `(wallet_id, request_id)`, return new balance; raise `INSUFFICIENT_CREDITS` if low
  - `fn_credit_topup(wallet_id, amount, payment_id) RETURNS INT` — atomic increment + log
  - `fn_grant_free_credits(user_id, ip, fp_hash) RETURNS INT` — anti-abuse checks (email_verified, disposable check, IP cap 3/24h, fp once-lifetime, trust-tier based amount), atomic insert into `free_credit_grants` + wallet credit
  - `fn_refund_credits(request_id) RETURNS INT` — idempotent compensating credit
  - All functions `SECURITY DEFINER`; grant EXECUTE only to service_role
  - _Requirements: 6, 7, 17, 26_
  - _Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md, .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** 50 parallel deduct calls against wallet sized for 30 → exactly 30 succeed, 20 fail with INSUFFICIENT_CREDITS, balance never negative. Duplicate `request_id` returns same outcome (idempotent). `fn_grant_free_credits` returns 0 on second call with same fingerprint.

- [ ] 4. PPP tiers seed + Edge Function for IP→country lookup
  - Seed `ppp_tiers` with rows 1–4 (Tier1 base 1.000 USD, Tier2 0.800 EUR, Tier3 0.500 INR, Tier4 0.300) and country JSONB arrays
  - Seed `subscription_plans` (Starter/Pro/Team) and credit pack rows
  - Seed bootstrap `email_domain_blocklist` (~120k disposable domains via `\copy`)
  - Implement `lib/pricing/ppp.ts` with `resolveTier(countryCode)` and `priceFor(tier, currency, productId)` rounding rules (INR→nearest 10, USD→nearest 1, EUR→nearest 1)
  - Supabase Edge Function `geo-lookup`: reads `CF-IPCountry` first, falls back to MaxMind, caches result in Upstash 1h
  - _Requirements: 10, 14_
  - _Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md, .kit/skills/development/api-design/SKILL.md_
  - **AC:** Seed migration applies cleanly. `resolveTier('IN')` → Tier 3. `priceFor` returns rounded amount. Edge Function returns ISO-3166 alpha-2 for known IP, `XX` for unknown. Second lookup of same `/24` is cache hit.

- [ ] 5. Email validation service
  - `lib/abuse/emailValidate.ts`: RFC 5321/5322 regex, MX record DNS lookup, disposable-domain check against `email_domain_blocklist`, Levenshtein typo suggestion against top providers (gmail, yahoo, outlook, etc.)
  - Public API route `POST /api/email/validate` returns `{valid, mx, disposable, suggestion?}` — rate limited 30/min/IP
  - Returns `domain_reputation_score` for downstream user-create flow
  - _Requirements: 1, 14_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/testing-quality/security-review/SKILL.md_
  - **AC:** `gmal.com` → suggestion "gmail.com". Disposable domain `mailinator.com` → `disposable: true`. Domain with no MX → `mx: false`. Malformed email → `422`. Endpoint rate-limited.

- [ ] 6. Email verification flow — OTP + magic link
  - `POST /api/auth/signup` issues 6-digit OTP (hashed in `email_verifications.otp_hash`, 10-min expiry) and triggers send via Resend
  - `POST /api/auth/verify-email` validates OTP, increments `attempts`, locks after 5 failures (Upstash key `otp:user:<id>`), sets `email_verified=true`, calls `fn_grant_free_credits`
  - `POST /api/auth/verify-email/resend` cooldown 60s (R15.4)
  - `POST /api/auth/magic-link` generates signed token (15-min single-use, hashed at rest), rate limited 5/10min/email; `GET /api/auth/magic-link/callback` validates and creates session
  - 24h reminder cron (one-time scheduled job for unverified users)
  - _Requirements: 1, 2, 15_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/testing-quality/security-review/SKILL.md_
  - **AC:** Correct OTP → `email_verified=true` + free credits granted. 5 wrong OTPs → lock + 429 on subsequent attempts. Resend within 60s → "wait" response. Expired magic link → "expired" message. Rate limit triggers 429 with `Retry-After`.

- [ ] 7. Auth middleware — JWT validation, refresh, multi-device
  - `middleware.ts` (Edge runtime): verify Supabase JWT (HS256) on all protected routes; inject `country_code`/`ip` into request context; apply Upstash rate limits per scope (`auth:ip`, `gen:user`, `webhook:ip`)
  - `lib/auth/session.ts`: `getSession`, `revokeSession`, `revokeAllSessions`; silent refresh when JWT < 5 min from expiry; HttpOnly + Secure + SameSite=Strict cookies (`__Secure-sb-access`, `__Secure-sb-refresh`)
  - Capture device fingerprint hash + user-agent + IP into `user_devices` and `user_ip_log` on each new session
  - `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`, `POST /api/auth/logout`, `POST /api/auth/logout-all`
  - _Requirements: 3, 4, 12, 18, 19, 21_
  - _Skills: .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md, .kit/skills/testing-quality/security-review/SKILL.md_
  - **AC:** Missing/invalid JWT on protected route → `401`. JWT near expiry → silent refresh, no UX impact. Revoke session → that refresh-token invalid within 5s. Multiple devices show distinct entries in `/api/auth/sessions`. Auth rate limit 10/min/IP.

- [ ] 8. Credit wallet API
  - `GET /api/credits/balance` → `{balance, wallet_kind}` (resolves user wallet or team wallet)
  - `GET /api/credits/history?cursor=&limit=` → cursor-paginated `credit_transactions`
  - `POST /api/credits/topup` → server-side PPP price calc → creates Razorpay order → returns `{razorpay_order_id, amount, currency}` (does not credit wallet — webhook does)
  - `lib/credits/wallet.ts` wrapper around RPC functions
  - _Requirements: 6, 7, 10, 24_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/data-backend/postgres-patterns/SKILL.md_
  - **AC:** Balance reflects RPC state. History paginates correctly. Top-up returns Razorpay order id; balance NOT changed until webhook arrives. Client-supplied `amount` is ignored.

- [ ] 9. Content engine integration — atomic credit deduction
  - `POST /api/content/generate` flow: validate JWT → resolve wallet → generate `request_id` → call `fn_deduct_credits` → call Anthropic Claude → on success return `{result, credits_remaining}`; on AI failure call `fn_refund_credits(request_id)` and return original balance
  - Per-action cost from server-side config (`lib/config/credit-costs.ts`); never trust client-supplied cost
  - Generation log row: `user_id`, `action_type`, `model_used`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `status`, `request_id`
  - For long-running: `202 {job_id}` + `GET /api/jobs/:id`
  - Rate limit 30/min/user via Upstash
  - _Requirements: 6, 12, 21, 26_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/data-backend/postgres-patterns/SKILL.md_
  - **AC:** Insufficient balance → `402` no AI call. Successful gen → balance debited exactly once. AI error → balance restored to pre-call value. Duplicate `request_id` retry returns same result. Rate limit triggers 429.

- [ ] 10. Free credit protection — once-per-identity enforcement
  - `fn_grant_free_credits` enforces: email_verified true, domain not disposable, IP cap 3 grants/24h, fingerprint hash unique-lifetime
  - Trust-tier based amount: trust ≥ 40 → full grant (50 credits default), trust < 40 → 50% grant
  - `free_credit_grants` ledger row written atomically with wallet credit
  - On any check fail → grant 0 + set trust_score to 30
  - _Requirements: 13, 16, 17_
  - _Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md, .kit/skills/testing-quality/security-review/SKILL.md_
  - **AC:** Same email twice → 1 grant. Same IP 4× → 3 grants then block. Same fingerprint twice → 1 grant. Low-trust user → 25 credits. Each block writes `abuse_logs` entry.

- [ ] 11. Trust scoring engine
  - `lib/abuse/trust.ts`: `applyEvent(userId, event)` with deltas per R16.2 (disposable −30, VPN −15, multi-fp −25, verify +10, payment +30 cap 100, 7-day usage +5, admin abuse →0)
  - Atomic update: `UPDATE users SET trust_score = GREATEST(0, LEAST(100, trust_score + delta))` + INSERT `trust_score_events` row in same transaction
  - Score-based access tier resolver: ≥80 full, 40–79 standard+CAPTCHA-on-suspicion, 20–39 reduced limits, <20 suspended
  - Hook into all relevant events (signup, verify, payment, admin)
  - _Requirements: 13, 16_
  - _Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md, .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** Each event delta applied correctly with cap/floor. Every change writes `trust_score_events` row with prev/new/delta/reason. Score < 20 → user `account_status` flips to `restricted`. Admin abuse flag → 0.

- [ ] 12. IP controls + device fingerprinting
  - Signup hard cap: 3 accounts/IP/24h (Upstash sliding window + durable `users.created_at` count check)
  - VPN/proxy detection via IPQS API; cache 1h per exact IP in Upstash; on detection → trust −15, log `ip_type=vpn`
  - FingerprintJS OSS in client; only SHA-256 hash sent to server; stored in `user_devices.fingerprint_hash`
  - Same fingerprint detection: 2nd account → trust −25 + flag both; ≥4 accounts → block "Account limit reached from this device"
  - IP escalation: 3+ blocks/7d → admin alert + optional Vercel firewall block
  - _Requirements: 13, 18, 19, 28_
  - _Skills: .kit/skills/testing-quality/security-review/SKILL.md, .kit/skills/development/api-design/SKILL.md_
  - **AC:** 4th signup from IP → 403 "Account creation limit reached". VPN signup → trust 35 logged. 2nd account same fp → trust delta −25 + abuse_log entry. 4th same fp → block.

- [ ] 13. Behavioral analysis + rate limiting
  - Upstash sliding-window limiter `lib/abuse/ratelimit.ts` with scopes: `auth:ip` 10/min, `gen:user` 30/min, `webhook:ip` 100/min (alert at 1000), `otp:user` 5/10min, `magic:email` 5/10min, `signup:ip` 3/24h
  - Behavioral signals: action frequency >30/min → 5-min cooldown + trust −10; identical generation request >10/30min → flag + CAPTCHA; signup-to-first-action <5s → trust −20
  - CAPTCHA (reCAPTCHA v3) trigger logic: trust 40–79 + suspicious action OR low-trust first action
  - Auto-restrict on threshold breaches; `Retry-After` header on every 429
  - _Requirements: 12, 13, 20, 21, 28_
  - _Skills: .kit/skills/testing-quality/security-review/SKILL.md, .kit/skills/development/api-design/SKILL.md_
  - **AC:** Sliding-window limiter math verified by unit test with synthetic clock. 31st gen request in a minute → 429 with `Retry-After`. Identical prompt 11× in 30min → CAPTCHA required. Webhook burst 1000+/min → admin alert.

- [ ] 14. Razorpay Checkout integration — orders & PPP pricing
  - `lib/billing/razorpay.ts`: `createOrder(userId, packId)`, `createSubscription(userId, planId)`, `verifyWebhookSignature(headers, raw)` — server SDK only
  - `POST /api/credits/topup` and `POST /api/subscriptions` calculate `amount` from `ppp_tiers` server-side based on stored `users.country_code`; apply VPN-downgrade-prevention `max(stored_tier, detected_tier)`
  - Persist `payments` row in `pending` status pre-checkout
  - `GET /api/pricing` returns advisory display prices
  - _Requirements: 7, 9, 10, 12_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/testing-quality/security-review/SKILL.md_
  - **AC:** Top-up returns Razorpay order with server-calculated INR amount for IN user. Client-supplied amount ignored. VPN user from stored Tier 1 to detected Tier 4 → priced at Tier 1. Pricing endpoint matches resolved tier.

- [ ] 15. Razorpay webhook handler — signature verify + idempotency
  - `POST /api/webhooks/razorpay`: read raw body, verify `x-razorpay-signature` HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`; on fail → `400` + log payload + source IP
  - INSERT `webhook_events (provider, idempotency_key=event_id, payload, signature) ON CONFLICT DO NOTHING RETURNING id` — conflict → `200 {ok:true, replayed:true}`
  - Event router: `payment.captured` → `fn_credit_topup`, `payment.failed` → record + email, `subscription.activated` → activate + grant credits, `subscription.charged` → refill + extend period, `subscription.cancelled` → status update, `payment.refunded` → deduct equivalent credits
  - On exception leave `processed_at NULL` for Razorpay retry; on success `UPDATE … SET processed_at=now()`
  - _Requirements: 7, 8, 9, 12_
  - _Skills: .kit/skills/testing-quality/security-review/SKILL.md, .kit/skills/data-backend/postgres-patterns/SKILL.md_
  - **AC:** Tampered signature → 400 + log row. Same `payment_id` twice → second returns 200 replayed, no duplicate credit. `payment.captured` → wallet credited once. `payment.refunded` → equivalent credits deducted.

- [ ] 16. Subscription lifecycle — plans, renewal, upgrade/downgrade
  - `POST /api/subscriptions` creates Razorpay subscription, persists `subscriptions` row in `pending`, returns hosted URL
  - Webhook flows update status: `pending → active → past_due → cancelled/expired`
  - `POST /api/subscriptions/upgrade` — prorate, update Razorpay sub, immediate plan limits + credit delta
  - `POST /api/subscriptions/downgrade` — schedule via `scheduled_plan_id` + `scheduled_change_at` for next cycle
  - `POST /api/subscriptions/cancel` — set `cancel_at_period_end`
  - Renewal credit refill happens in `subscription.charged` webhook handler (Task 15)
  - `past_due` → block new generations; banner "payment failed"
  - _Requirements: 8, 24_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/data-backend/postgres-patterns/SKILL.md_
  - **AC:** Subscribe → pending → activated webhook → status active + credits granted. Renewal webhook → balance increments + `current_period_end` extends. Upgrade → prorated charge + new credits. Downgrade → `effective_at` next cycle. Past_due blocks generation.

- [ ] 17. Payment-based trust upgrade
  - In `payment.captured` handler: `users.trust_score = max(current, 80)` + `trust_score_events` row
  - Remove all CAPTCHA requirements + raise rate limits to plan max
  - Apply across all active sessions for user within 30s (broadcast revalidation)
  - On `payment.refunded` chargeback: trust −40 + reactivate standard limits
  - _Requirements: 13, 16, 22_
  - _Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md, .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** Trust-30 user pays → trust becomes 80 immediately, CAPTCHA dropped. Subsequent generation calls do not trigger CAPTCHA. Refund event → trust drops by 40, restrictions re-applied.

- [ ] 18. Team CRUD + invitations
  - `POST /api/teams` → create team + linked `credit_wallets(owner_kind='team')` + set `account_type='team_owner'`
  - `POST /api/teams/:id/invite` → generate 48h `team_invites` token (hashed at rest), send `team_invite` email
  - `POST /api/teams/invites/accept` → validate token, set `account_type='team_member'`, link `team_members`
  - `DELETE /api/teams/:id/members/:userId` → remove + revert `account_type='individual'` within 1s
  - `POST /api/teams/:id/transfer` → atomic role swap
  - `GET /api/teams/:id` → team detail + members
  - _Requirements: 11, 25_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/data-backend/postgres-patterns/SKILL.md_
  - **AC:** Owner creates team → wallet exists. Invite email sent <10s. Acceptance flips role. Removal reverts role + revokes wallet read within 1s (RLS recheck). Transfer atomically swaps owner.

- [ ] 19. Team credit pool — shared deduction + per-member tracking
  - Content generate handler: when caller is `team_member` or `team_owner`, resolve team wallet instead of user wallet; deduct from team wallet but `credit_transactions.acting_user_id` = caller
  - `GET /api/teams/:id/usage` → per-member rollup for current period
  - Team dashboard surface: per-member credits used + last-active
  - Team owner downgrade-on-removal flow
  - _Requirements: 11, 24_
  - _Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md, .kit/skills/development/api-design/SKILL.md_
  - **AC:** Team member generates → team wallet debited, `acting_user_id` matches caller. `/teams/:id/usage` returns per-member breakdown. Removed member can no longer deduct from team wallet.

- [ ] 20. Email notification system — Resend + 14 templates
  - `lib/email/sender.ts`: Resend wrapper with retry 3× exponential backoff (1s/4s/16s); writes `email_log` row with status
  - All 14 templates implemented (React Email or HTML): `magic_link`, `signup_verify_otp`, `signup_verify_resend`, `welcome`, `payment_captured`, `payment_failed`, `subscription_activated`, `subscription_renewed`, `subscription_past_due`, `subscription_cancelled`, `low_credits_alert`, `team_invite`, `team_member_removed`, `account_blocked`
  - Trigger hooks throughout system (after signup, post-webhook, on threshold crossing)
  - Low-credit alert: trigger when balance < 20% of plan monthly allocation, once per billing period
  - On 3rd failure → `email_log.status='failed'` + admin alert via `ADMIN_ALERT_WEBHOOK_URL`
  - _Requirements: 25, 28_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** All 14 templates render in Resend preview. Magic link delivered <5s p95. Each send writes `email_log`. Forced 3 failures → `status=failed` + admin alerted. Low-credit fires only once per period.

- [ ] 21. Admin API — users, payments, controls, blocklist, audit
  - All endpoints check `role='admin'` JWT claim AND `account_type='admin'` server-side
  - `GET /api/admin/users?cursor=&q=` paginated list with all required fields
  - `POST /api/admin/users/:id/credits {delta, reason}` — reason ≥10 chars; atomic adjust + `admin_actions` audit row with before/after balance
  - `POST /api/admin/users/:id/block` / `/unblock` — block sets `account_status='blocked'`, invalidates all sessions <5s
  - `POST /api/admin/users/:id/trust {score, reason}` — manual trust override
  - `GET /api/admin/abuse-log` filterable by date/IP/fingerprint/event/user/admin
  - `POST /api/admin/blocklist/domains` / `DELETE /:domain` — runtime updates without deploy (cache invalidate <60s)
  - _Requirements: 12, 23, 28_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/testing-quality/security-review/SKILL.md_
  - **AC:** Non-admin → 403 on all `/admin/*`. Credit adjust without reason → 400. Block invalidates sessions in <5s (verified). Domain added → next signup with that domain blocked within 60s. Every action → `admin_actions` row with before/after.

- [ ] 22. Admin UI — Next.js admin pages
  - `app/admin/users/page.tsx` — paginated table with search, country, trust, balance, status
  - `app/admin/users/[id]/page.tsx` — detail view with sessions/devices/IPs/abuse-log tabs + control buttons
  - `app/admin/payments/page.tsx` — payments table with filters
  - `app/admin/abuse/page.tsx` — abuse log viewer with filters
  - `app/admin/blocklist/page.tsx` — domain blocklist editor
  - `app/admin/alerts/page.tsx` — recent alerts feed
  - All wrapped in `app/admin/layout.tsx` admin guard
  - Tailwind + reuse design tokens from design.md
  - _Requirements: 23, 28_
  - _Skills: .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md, .kit/skills/development/build-website-web-app/SKILL.md_
  - **AC:** Non-admin redirected from `/admin`. Admin can search users, view detail, adjust credits with reason modal, block users. Pages keyboard-navigable, AA contrast, responsive (sticky-first-column at <lg).

- [ ] 23. User dashboard UI
  - `app/(app)/dashboard/page.tsx` — Balance card, Subscription status card, This-month usage card, Quick generate, Buy credits/Upgrade CTA
  - `app/(app)/billing/page.tsx` — billing history table with Razorpay invoice links
  - `app/(app)/account/page.tsx` — profile + sessions list with revoke
  - `app/(app)/teams/page.tsx` — team management (create/invite/members/transfer)
  - Status banners: `email-not-verified`, `subscription-past-due`, `low-credits`, `account-restricted`
  - Pricing page (PPP-aware) at `app/(marketing)/pricing/page.tsx`
  - Balance count-up animation 400ms (respects `prefers-reduced-motion`); skeleton loaders
  - WCAG 2.2 AA compliance per design.md
  - _Requirements: 10, 24_
  - _Skills: .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md, .kit/skills/development/build-website-web-app/SKILL.md_
  - **AC:** Dashboard renders balance/subscription/usage in 3-up at lg, stacked at <md. Pricing displays Tier 3 prices for IN user. Past-due banner appears when subscription status flips. Sessions revoke works. AA contrast verified.

- [ ] 24. Analytics endpoints + admin dashboard charts
  - Nightly cron rolls `credit_transactions` → `daily_credit_aggregates`
  - `conversion` event emitted on first paid payment with `{user_id, plan_id, country_code, days_since_signup, free_credits_used}`
  - `GET /api/admin/metrics/revenue` → MRR, churn, by_country breakdown, new-vs-returning split
  - `GET /api/admin/metrics/abuse` → rules fired/hour, top IPs, top fingerprints, trust histogram
  - `GET /api/admin/metrics/conversion` → free→paid rate, ARPU, failed payment rate by country
  - `app/admin/analytics/page.tsx` — charts (Recharts) for all of the above
  - 2-year retention enforced via partition retention policy
  - _Requirements: 27_
  - _Skills: .kit/skills/development/api-design/SKILL.md, .kit/skills/data-backend/postgres-patterns/SKILL.md_
  - **AC:** Nightly rollup populates `daily_credit_aggregates`. Revenue endpoint returns aggregated MRR for current month. Conversion event present in logs after first paid payment. Charts render and pass AA contrast.

- [ ] 25. Alerting & observability — abuse spikes + system health
  - Cron-triggered detector (every 5 min): scans `users` for /24 IP-subnet spike >50 in 1h, scans `user_devices` for fingerprint count >10 in 24h, scans `payments` for failed-payment rate >20 in 5min
  - On detection → `POST` to `ADMIN_ALERT_WEBHOOK_URL` + email to `ADMIN_NOTIFICATION_EMAIL` + dashboard alert row
  - Upstash rate-limit-breach hook for webhook endpoint >1000/min
  - Auto-block on 10+ accounts/fingerprint
  - Structured logging (`request_id`, `user_id`, `latency_ms`) for every event listed in design.md observability section
  - SLO probes per design.md table; dashboards (Reliability, Money, Abuse, Email, Content) configured in log-forwarder
  - Runbooks created at `docs/runbooks/{webhook-signature-failures,webhook-lag,payment-failure-spike,abuse-spike,email-delivery-failure}.md`
  - _Requirements: 18, 21, 28_
  - _Skills: .kit/skills/testing-quality/security-review/SKILL.md, .kit/skills/development/systematic-debugging/SKILL.md_
  - **AC:** Synthetic spike of 51 signups from /24 in 1h → admin alert fires. Webhook signature failure rate >5/min → page on-call. Auto-block triggers on 11th account from same fingerprint. All 5 runbooks present and linked from alerts.
