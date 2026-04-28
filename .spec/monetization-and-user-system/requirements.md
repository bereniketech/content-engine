# Requirements: Monetization and User System

## Introduction

This feature delivers the complete monetization, user identity, billing, and anti-abuse infrastructure for the AI Content Engine. It enables users to sign up, authenticate, purchase credits or subscriptions, generate content against a deducted credit balance, and manage teams — all backed by Razorpay payments with country-based purchasing-power-parity pricing. A layered anti-abuse system protects free credit grants, validates email quality, and tracks behavioral signals to assign per-user trust scores that gate access to platform capabilities.

---

## Requirements

### Requirement 1: Email-Based Authentication

**User Story:** As a new visitor, I want to create an account with my email address and optionally set a password, so that I can access the platform.

#### Acceptance Criteria

1. WHEN a user submits a valid email and optional password THEN the system SHALL create a new user record in Supabase Auth and redirect to onboarding.
2. WHEN a user submits an email that is already registered THEN the system SHALL return a `409 Conflict` response with the message "An account with this email already exists."
3. WHEN a user submits a malformed email address THEN the system SHALL reject the request with a `422 Unprocessable Entity` response before contacting Supabase.
4. IF the submitted email domain is on the disposable-email blocklist THEN the system SHALL reject signup with the message "Disposable email addresses are not allowed."
5. WHEN a user signs up successfully THEN the system SHALL send a verification email within 30 seconds.

---

### Requirement 2: Magic Link Login (Passwordless)

**User Story:** As a registered user, I want to log in via a one-click magic link sent to my email, so that I do not need to remember a password.

#### Acceptance Criteria

1. WHEN a user requests a magic link THEN the system SHALL dispatch a time-limited (15-minute) signed link to the user's email.
2. WHEN the user clicks a valid, unexpired magic link THEN the system SHALL create a JWT session and redirect to the dashboard.
3. WHEN the user clicks an expired or previously used magic link THEN the system SHALL display "This login link has expired. Please request a new one." and redirect to the login page.
4. WHEN more than 5 magic link requests are made for the same email within 10 minutes THEN the system SHALL block further requests and return "Too many login attempts. Please try again in 10 minutes."

---

### Requirement 3: JWT Session Management

**User Story:** As an authenticated user, I want my session to persist securely across browser tabs and devices, so that I do not have to re-authenticate on every visit.

#### Acceptance Criteria

1. WHEN a user authenticates successfully THEN the system SHALL issue a signed JWT (HS256) with a 1-hour expiry and an HttpOnly, Secure, SameSite=Strict cookie.
2. WHEN a JWT is within 5 minutes of expiry THEN the system SHALL silently refresh it using the stored refresh token without requiring user action.
3. WHEN a refresh token is invalid or expired THEN the system SHALL invalidate the session, clear all cookies, and redirect the user to the login page.
4. WHEN a user explicitly logs out THEN the system SHALL invalidate all active refresh tokens for that device and clear the session cookie.
5. WHEN a user logs out from all devices THEN the system SHALL invalidate all refresh tokens across all sessions for that user.
6. The system SHALL validate JWT authenticity and expiry on every authenticated API request before executing any business logic.

---

### Requirement 4: Multi-Device Session Handling

**User Story:** As a user who uses multiple devices, I want to manage my active sessions, so that I can revoke access from lost or untrusted devices.

#### Acceptance Criteria

1. WHEN a user logs in from a new device THEN the system SHALL create a distinct session record with device metadata (user-agent, IP, timestamp).
2. WHEN a user views their account security settings THEN the system SHALL list all active sessions with device type, IP geolocation, and last-active timestamp.
3. WHEN a user revokes a specific session THEN the system SHALL invalidate that session's refresh token within 5 seconds and return a `204 No Content` response.

---

### Requirement 5: User Data Model

**User Story:** As the platform, I need a canonical user record that tracks identity, account type, country, and activity metadata, so that all downstream systems have a single source of truth.

#### Acceptance Criteria

1. WHEN a new user is created THEN the system SHALL persist: `user_id` (UUID v4), `email` (unique), `account_type` (enum: `individual` | `team_owner` | `team_member`), `country_code` (ISO 3166-1 alpha-2, derived from IP at signup), `created_at`, `last_active_at`, `email_verified` (boolean), `trust_score` (integer 0–100, default 50).
2. WHEN a user's last activity is recorded THEN the system SHALL update `last_active_at` without modifying `updated_at` on the base user row.
3. IF the country cannot be detected from IP THEN the system SHALL default `country_code` to `"XX"` and flag the record for manual review.

---

### Requirement 6: Credit Wallet System

**User Story:** As a user, I want a credit balance that is deducted when I use AI features, so that I have clear visibility and control over my usage costs.

#### Acceptance Criteria

1. WHEN a new user account is created and email is verified THEN the system SHALL grant an initial free credit balance as configured per plan (default: 50 credits) within a single atomic transaction.
2. WHEN a user triggers an AI generation action THEN the system SHALL deduct the configured credit cost for that action server-side within the same transaction as the action, and reject the action if balance is insufficient.
3. IF a user's credit balance is zero or negative THEN the system SHALL block all credit-consuming actions and return `402 Payment Required` with the message "Insufficient credits. Please top up to continue."
4. WHEN a credit deduction occurs THEN the system SHALL append a record to `credit_usage_history` with: `action_type`, `credits_deducted`, `timestamp`, `request_id`.
5. The system SHALL never expose a credit mutation endpoint that can be called from client-side JavaScript — all credit mutations MUST execute in Next.js API routes or Supabase Edge Functions with service-role credentials.
6. WHEN credits are granted via a top-up purchase THEN the system SHALL credit the wallet atomically with the payment confirmation webhook before returning success to the client.

---

### Requirement 7: Credit Purchase (Top-Up Packs)

**User Story:** As a user who has run out of credits, I want to purchase a credit pack, so that I can resume using AI features immediately.

#### Acceptance Criteria

1. WHEN a user selects a credit pack THEN the system SHALL initiate a Razorpay Checkout session using the server-side calculated price for the user's country tier.
2. WHEN Razorpay fires a `payment.captured` webhook THEN the system SHALL verify the webhook signature, credit the purchased pack amount to the user's wallet, and update `payment_history`, all within a single atomic DB transaction.
3. WHEN a payment webhook arrives with an already-processed `payment_id` THEN the system SHALL return `200 OK` (idempotent) without crediting again.
4. WHEN a payment fails THEN the system SHALL record the failure in `payment_history` with status `failed` and send the user an email notification.
5. IF the webhook signature verification fails THEN the system SHALL return `400 Bad Request`, log the attempt with the raw payload, and NOT credit any account.

---

### Requirement 8: Subscription System

**User Story:** As a user who wants predictable monthly access, I want to subscribe to a monthly plan that auto-renews and refills my credits, so that I never run out mid-month.

#### Acceptance Criteria

1. WHEN a user subscribes to a plan THEN the system SHALL create a Razorpay subscription, store the `razorpay_subscription_id`, and set `subscription_status` to `pending` until the activation webhook is received.
2. WHEN Razorpay fires a `subscription.activated` webhook THEN the system SHALL set `subscription_status` to `active`, grant the plan's monthly credit allocation, and set `current_period_end`.
3. WHEN Razorpay fires a `subscription.charged` (renewal) webhook THEN the system SHALL top up the user's credit balance with the plan's monthly allocation and extend `current_period_end`.
4. WHEN Razorpay fires a `subscription.cancelled` webhook THEN the system SHALL set `subscription_status` to `cancelled` and cease credit refills.
5. WHEN a subscription enters `past_due` state (failed renewal) THEN the system SHALL set `subscription_status` to `past_due`, send a payment-failure email, and restrict new AI generation actions.
6. WHEN a user upgrades their plan THEN the system SHALL prorate and credit the difference, update the Razorpay subscription, and reflect the new plan limits immediately.
7. WHEN a user downgrades their plan THEN the system SHALL schedule the downgrade for the next billing cycle and display "Your plan will change on [date]."

---

### Requirement 9: Razorpay Payment Integration

**User Story:** As the platform, I need all Razorpay transactions to be processed securely with signature verification, so that no fraudulent payment confirmation can credit a user account.

#### Acceptance Criteria

1. WHEN creating any Razorpay order or subscription THEN the system SHALL use the Razorpay server SDK from a Next.js API route — never from client-side code.
2. WHEN a webhook payload arrives at `/api/webhooks/razorpay` THEN the system SHALL verify the `x-razorpay-signature` header using HMAC-SHA256 with the webhook secret before processing any event.
3. IF signature verification fails THEN the system SHALL return `400` and log the source IP and raw payload body, without processing the event.
4. WHEN a `payment.captured` event is verified THEN the system SHALL process it idempotently using `payment_id` as the idempotency key.
5. The system SHALL support payment states: `pending`, `captured` (success), `failed`, `refunded`.
6. WHEN a refund is issued THEN the system SHALL record it in `payment_history` and deduct the equivalent credits from the user's wallet if they were granted from this payment.

---

### Requirement 10: Country-Based Purchasing Power Parity (PPP) Pricing

**User Story:** As a user in an emerging market, I want to see prices that reflect my local purchasing power, so that the platform is affordable to me.

#### Acceptance Criteria

1. WHEN a new user signs up THEN the system SHALL detect their country from the `CF-IPCountry` header (Cloudflare) or `X-Forwarded-For` IP with a MaxMind GeoIP lookup as fallback, and store it in the user record.
2. WHEN a user visits the pricing page THEN the system SHALL display the localized price for their stored country tier without requiring manual selection.
3. WHEN a Razorpay order is created THEN the system SHALL calculate the `amount` using the server-side country tier mapping — the client MUST NOT supply the amount.
4. The system SHALL enforce four pricing tiers: Tier 1 (US, UK, CA, AU — base price), Tier 2 (EU + 20 developed countries — 80% of base), Tier 3 (India, SE Asia, LATAM — 50% of base), Tier 4 (low-income countries — 30% of base).
5. WHEN a price is calculated for INR THEN the system SHALL round to the nearest 10 INR; for USD to the nearest $1; for EUR to the nearest €1.
6. WHEN a user changes their VPN-detected country THEN the system SHALL apply the higher of their stored country tier and the current detected tier (prevent downgrade abuse).

---

### Requirement 11: Team Functionality

**User Story:** As a business user, I want to create a team, invite members, and share a credit pool, so that my organization can collaborate on content generation under one billing account.

#### Acceptance Criteria

1. WHEN a user creates a team THEN the system SHALL set their `account_type` to `team_owner`, create a `teams` record, and create a shared `credit_wallet` linked to the team.
2. WHEN a team owner invites a member by email THEN the system SHALL send an invitation email with a time-limited (48-hour) invite token.
3. WHEN an invitee accepts the invitation THEN the system SHALL set their `account_type` to `team_member` and link them to the team.
4. WHEN a team member uses a credit-consuming action THEN the system SHALL deduct from the team's shared credit wallet and record the usage against the member's `user_id`.
5. WHEN a team owner views the team dashboard THEN the system SHALL display per-member credit usage, totals, and last-active timestamps.
6. WHEN a team owner removes a member THEN the system SHALL set the member's `account_type` back to `individual` and revoke team wallet access within 1 second.
7. WHEN a team owner transfers ownership THEN the system SHALL update the `team_owner_id`, set the old owner's `account_type` to `team_member`, and set the new owner's `account_type` to `team_owner`, all atomically.

---

### Requirement 12: Security — Non-Negotiable Invariants

**User Story:** As the platform operator, I need all credit mutations and payment logic to be enforced server-side with no client bypass, so that no user can gain unauthorized credits or access.

#### Acceptance Criteria

1. The system SHALL perform all credit deduction, grant, and balance checks exclusively in server-side code (Next.js API routes or Supabase Edge Functions).
2. The system SHALL validate the JWT on every authenticated request; a missing or invalid JWT MUST return `401 Unauthorized` with no additional information.
3. The system SHALL enforce rate limiting on: authentication endpoints (10 req/min/IP), generation endpoints (30 req/min/user), and webhook endpoints (100 req/min/IP).
4. WHEN a Razorpay webhook arrives THEN the system SHALL verify the HMAC-SHA256 signature before processing — absence or mismatch MUST return `400` and log the event.
5. The system SHALL log every credit mutation (grant, deduct, expire) with: `user_id`, `amount`, `reason`, `request_id`, `timestamp`, `actor` (system | admin | webhook).
6. WHEN an admin manually adjusts credits THEN the system SHALL record the admin's `user_id`, reason text, and before/after balance in the audit log.
7. The system SHALL enforce HTTPS on all endpoints — HTTP requests MUST be redirected to HTTPS.
8. WHEN an unauthenticated request targets a protected route THEN the system SHALL return `401` without leaking internal route structure.

---

### Requirement 13: Anti-Abuse System

**User Story:** As the platform operator, I need to detect and limit abusive behavior — including free credit farming and fake account creation — so that the platform remains economically viable.

#### Acceptance Criteria

1. WHEN a new user account is created THEN the system SHALL check: email domain against the disposable-domain blocklist, IP against the max-accounts-per-IP-per-day limit (default: 3), and device fingerprint against known multi-account fingerprints.
2. IF any anti-abuse check triggers THEN the system SHALL grant zero free credits and set `trust_score` below 30, pending manual or behavioral upgrade.
3. WHEN a user attempts to create more than 3 accounts from the same IP within 24 hours THEN the system SHALL block the signup with "Account creation limit reached from this location."
4. WHEN a user's trust score drops below 20 THEN the system SHALL restrict the account to read-only access and queue it for admin review.
5. WHEN a CAPTCHA challenge is required (trust score < 40 on first action) THEN the system SHALL present a CAPTCHA before proceeding.
6. WHEN a user completes a successful payment THEN the system SHALL automatically upgrade their trust score to at least 80 and remove CAPTCHA requirements.
7. WHEN admin flags a user THEN the system SHALL immediately set `account_status` to `blocked` and invalidate all sessions.

---

### Requirement 14: Email Validation & Disposable Email Detection

**User Story:** As the platform, I need to validate email quality at signup and block disposable addresses, so that fake users cannot exploit free credits.

#### Acceptance Criteria

1. WHEN a signup or email-update request arrives THEN the system SHALL validate email format against RFC 5321/5322 before any further processing.
2. WHEN a valid-format email is submitted THEN the system SHALL check the domain against a maintained blocklist of known disposable-email providers (minimum 100,000 entries).
3. WHEN an email domain has no valid MX records THEN the system SHALL reject it with "This email domain does not accept mail."
4. WHEN a likely typo is detected (e.g., `gmal.com` → `gmail.com`) THEN the system SHALL surface a suggestion: "Did you mean [corrected address]?" without blocking submission.
5. IF the domain passes all checks THEN the system SHALL record a `domain_reputation_score` alongside the user record for future trust calculations.
6. The disposable-email blocklist SHALL be updateable by admins without a code deploy.

---

### Requirement 15: OTP and Magic Link Email Verification

**User Story:** As a new user, I want to verify my email via OTP or magic link, so that I can unlock free credits and full platform access.

#### Acceptance Criteria

1. WHEN a new user registers THEN the system SHALL send a 6-digit OTP valid for 10 minutes to the registered email.
2. WHEN a user submits a correct OTP THEN the system SHALL set `email_verified = true`, grant free credits (if anti-abuse checks pass), and return a success response.
3. WHEN a user submits an incorrect OTP 5 times THEN the system SHALL invalidate the current OTP, require a new one to be requested, and log the event.
4. WHEN a user requests a new OTP within 60 seconds of the last one THEN the system SHALL return "Please wait before requesting another code." and not send a new OTP.
5. IF a user has not verified their email within 24 hours THEN the system SHALL send a reminder email and allow re-request with the same rate limit rules.
6. WHEN a user's email is unverified THEN the system SHALL restrict access to read-only content previews and block all credit-consuming actions.

---

### Requirement 16: User Trust Scoring System

**User Story:** As the platform, I need a per-user trust score that reflects the likelihood of legitimate use, so that I can apply graduated access controls rather than binary allow/block.

#### Acceptance Criteria

1. WHEN a user account is created THEN the system SHALL initialize `trust_score = 50`.
2. WHEN any of the following events occur THEN the system SHALL adjust `trust_score` by the specified delta:
   - Email from known disposable domain: −30
   - IP flagged as VPN/proxy: −15
   - Multiple accounts from same device fingerprint: −25
   - Successful email verification: +10
   - Successful payment: +30 (capped at 100)
   - Consistent normal usage for 7 days: +5
   - Abuse flag from admin: set to 0
3. WHEN `trust_score` changes THEN the system SHALL log the event with: `user_id`, `previous_score`, `new_score`, `reason`, `timestamp`.
4. IF `trust_score` ≥ 80 THEN the system SHALL grant full platform access with no CAPTCHA.
5. IF `trust_score` is 40–79 THEN the system SHALL apply standard limits with CAPTCHA on first suspicious action.
6. IF `trust_score` is 20–39 THEN the system SHALL apply reduced free credits and rate limits.
7. IF `trust_score` < 20 THEN the system SHALL suspend the account pending admin review.

---

### Requirement 17: Free Credit Protection

**User Story:** As the platform operator, I need free credits to be granted only once per legitimate user identity, so that users cannot exploit the system by creating multiple accounts.

#### Acceptance Criteria

1. WHEN a user requests free credit grant THEN the system SHALL check: email verified = true, email domain NOT on disposable list, IP has not already received free credits today (max 3 grants/IP/24h), device fingerprint has not received free credits (max 1 grant/fingerprint/lifetime).
2. IF all free-credit checks pass THEN the system SHALL grant free credits atomically with a `credit_grant` record containing `user_id`, `email`, `ip_address`, `device_fingerprint_hash`, `granted_at`.
3. IF any check fails THEN the system SHALL grant zero free credits and set `trust_score` to 30 for the new account.
4. WHEN a user with `trust_score` < 40 is granted free credits THEN the system SHALL grant 50% of the standard amount.

---

### Requirement 18: IP-Based Controls

**User Story:** As the platform, I need to track and rate-limit by IP address, so that coordinated abuse from a single source can be blocked.

#### Acceptance Criteria

1. WHEN any signup or authentication request is processed THEN the system SHALL record the source IP alongside the event.
2. WHEN more than 3 accounts are created from a single IP within 24 hours THEN the system SHALL block further signups from that IP for 24 hours.
3. WHEN a VPN or known proxy IP is detected (via IP reputation API) THEN the system SHALL subtract 15 points from `trust_score` and log `ip_type = vpn`.
4. WHEN an IP has triggered abuse blocks 3 or more times in 7 days THEN the system SHALL escalate to admin alert and optionally block the IP at the Vercel edge.
5. The system SHALL store IP lookups in a local cache (TTL: 1 hour) to avoid redundant external API calls.

---

### Requirement 19: Device Fingerprinting

**User Story:** As the platform, I need to identify devices across sessions, so that multi-account abuse from the same device can be detected even when users change emails.

#### Acceptance Criteria

1. WHEN a user loads the signup or login page THEN the system SHALL collect a browser fingerprint (using FingerprintJS or equivalent) and associate it with the user's session.
2. WHEN a new account is created THEN the system SHALL store the `device_fingerprint_hash` (SHA-256 of raw fingerprint) in the `user_devices` table.
3. WHEN a fingerprint hash matches an existing account THEN the system SHALL decrement `trust_score` by 25 for the new account and flag both accounts for review.
4. WHEN the same device fingerprint is associated with more than 3 accounts THEN the system SHALL block new account creation from that fingerprint with "Account limit reached from this device."
5. The system SHALL NOT store raw fingerprint data — only the SHA-256 hash.

---

### Requirement 20: Behavioral Analysis

**User Story:** As the platform, I need to detect abnormal usage patterns, so that automated abuse bots can be identified and rate-limited.

#### Acceptance Criteria

1. WHEN an authenticated user performs actions THEN the system SHALL record: `action_type`, `timestamp`, `session_id`, `time_since_last_action_ms`.
2. WHEN a user's action frequency exceeds 30 actions per minute THEN the system SHALL apply a 5-minute cooldown and decrement `trust_score` by 10.
3. WHEN a user performs the exact same generation request more than 10 times in 30 minutes THEN the system SHALL flag the account for review and require CAPTCHA.
4. WHEN a user's signup-to-first-action time is less than 5 seconds THEN the system SHALL treat it as a bot signal and reduce `trust_score` by 20.

---

### Requirement 21: Rate Limiting and Throttling

**User Story:** As the platform, I need hard rate limits on all sensitive endpoints, so that brute-force and abuse attacks are automatically mitigated.

#### Acceptance Criteria

1. WHEN an IP exceeds 10 requests/minute to `/api/auth/*` THEN the system SHALL respond `429 Too Many Requests` with a `Retry-After` header.
2. WHEN a user exceeds 30 AI generation requests per minute THEN the system SHALL respond `429` with `Retry-After`.
3. WHEN a user exceeds 5 OTP verification attempts in 10 minutes THEN the system SHALL lock OTP verification for 10 minutes for that user.
4. WHEN a burst of more than 1,000 requests/minute arrives at the webhook endpoint from a single IP THEN the system SHALL return `429` and alert the on-call channel.
5. The system SHALL implement rate limits using a sliding-window algorithm backed by Redis or Upstash Redis.

---

### Requirement 22: Payment-Based Trust Upgrade

**User Story:** As a paid user, I want my platform access restrictions removed after I make a payment, so that I am not treated as a potential abuser after proving intent to pay.

#### Acceptance Criteria

1. WHEN a `payment.captured` webhook is processed for a user THEN the system SHALL set `trust_score` to max(`current_trust_score`, 80).
2. WHEN a user becomes trusted (trust_score ≥ 80) THEN the system SHALL remove all CAPTCHA requirements and raise all rate limits to the plan maximum.
3. WHEN multiple sessions exist for the same user at the time of trust upgrade THEN the system SHALL apply the upgrade to all active sessions within 30 seconds.
4. WHEN a trusted user's payment is reversed (chargeback) THEN the system SHALL reduce `trust_score` by 40 and reactivate standard abuse limits.

---

### Requirement 23: Admin Panel

**User Story:** As an admin, I want a protected dashboard where I can view users, adjust credits, block accounts, and monitor revenue, so that I can operate and audit the platform.

#### Acceptance Criteria

1. WHEN an admin logs in THEN the system SHALL verify the `role = admin` claim in the JWT before granting access to any admin route.
2. WHEN an admin views the user list THEN the system SHALL return paginated user records with: `user_id`, `email`, `account_type`, `trust_score`, `credit_balance`, `subscription_status`, `country_code`, `last_active_at`.
3. WHEN an admin adjusts a user's credit balance THEN the system SHALL require a mandatory `reason` field (min 10 chars), log the adjustment with admin `user_id`, and apply the change atomically.
4. WHEN an admin blocks a user THEN the system SHALL set `account_status = blocked`, invalidate all sessions for that user within 5 seconds, and log the block with reason.
5. WHEN an admin views the abuse log THEN the system SHALL display filterable entries: IP, device fingerprint, email, event type, timestamp, action taken.
6. WHEN an admin views revenue metrics THEN the system SHALL display: total MRR, churn rate, country-wise revenue breakdown, new-vs-returning payment split.

---

### Requirement 24: User Dashboard

**User Story:** As a logged-in user, I want a personal dashboard showing my credits, usage history, subscription, and billing, so that I can manage my account self-serve.

#### Acceptance Criteria

1. WHEN a user opens their dashboard THEN the system SHALL display current credit balance, subscription plan name, billing cycle dates, and a "Buy credits" / "Upgrade" CTA.
2. WHEN a user views usage history THEN the system SHALL return a paginated list of credit deductions: `action_type`, `credits_used`, `timestamp`, most recent first.
3. WHEN a user views billing history THEN the system SHALL list all payments: `amount`, `currency`, `status`, `payment_date`, `invoice_link` (if available from Razorpay).
4. WHEN a user views the team section THEN the system SHALL display all team members with per-member credit usage for the current billing period.
5. IF a user's subscription is `past_due` THEN the system SHALL show a banner: "Your payment failed. Please update your payment method to avoid service interruption."

---

### Requirement 25: Email Notification System

**User Story:** As a user, I want to receive timely email notifications for critical account events, so that I am never surprised by an action the platform has taken.

#### Acceptance Criteria

1. WHEN a magic login link is requested THEN the system SHALL send it within 5 seconds of the request.
2. WHEN a payment is captured THEN the system SHALL send a payment confirmation email within 60 seconds.
3. WHEN a subscription renews THEN the system SHALL send a renewal confirmation email within 60 seconds of the `subscription.charged` webhook.
4. WHEN a user's credit balance falls below 20% of their plan's monthly allocation THEN the system SHALL send a low-credit alert email (once per billing period).
5. WHEN a team invitation is issued THEN the system SHALL send an invite email with the accept link within 10 seconds.
6. WHEN an email is sent THEN the system SHALL log: `user_id`, `template_id`, `sent_at`, `status` (sent | failed) to `email_log`.
7. WHEN an email delivery fails THEN the system SHALL retry up to 3 times with exponential backoff and alert the admin if all retries fail.

---

### Requirement 26: Content Engine Integration

**User Story:** As a developer, I want AI generation endpoints to deduct credits atomically with the generation action, so that no generation succeeds without a valid credit deduction.

#### Acceptance Criteria

1. WHEN a content generation request arrives THEN the system SHALL: validate JWT, check credit balance ≥ cost, deduct credits, run generation, log result — all within a single request lifecycle with no partial states persisted on failure.
2. WHEN the AI generation step fails THEN the system SHALL roll back the credit deduction and return the original balance.
3. WHEN a credit cost is configured per action type THEN the system SHALL retrieve the cost from a server-side config — never trusting a client-supplied cost value.
4. WHEN generation completes THEN the system SHALL log: `user_id`, `action_type`, `credits_deducted`, `model_used`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `status`, `request_id`.
5. WHEN async processing is required for long-running generations THEN the system SHALL return a `202 Accepted` with a `job_id`, and the client SHALL poll `/api/jobs/{job_id}` for status.

---

### Requirement 27: Analytics

**User Story:** As the platform operator, I want analytics on user conversion, credit usage patterns, and revenue performance, so that I can make data-driven product decisions.

#### Acceptance Criteria

1. WHEN a user converts from free to paid THEN the system SHALL emit a `conversion` event with: `user_id`, `plan_id`, `country_code`, `days_since_signup`, `free_credits_used`.
2. WHEN the admin views the analytics dashboard THEN the system SHALL display: free-to-paid conversion rate, average revenue per user (ARPU), country-wise revenue, credit usage by action type, failed payment rate.
3. WHEN a payment fails THEN the system SHALL increment the `failed_payments` counter tagged by `country_code` and `failure_reason`.
4. The system SHALL retain analytics data for a minimum of 2 years.
5. WHEN a user's credit usage is tracked THEN the system SHALL aggregate daily totals per `action_type` in a `daily_credit_aggregates` table to support efficient reporting.

---

### Requirement 28: Admin Abuse Controls and Alerting

**User Story:** As an admin, I want automated alerts when abuse spikes occur, so that I can respond before significant harm is done.

#### Acceptance Criteria

1. WHEN more than 50 new accounts are created from the same IP subnet (/24) within 1 hour THEN the system SHALL send an alert to the admin notification channel (email + dashboard).
2. WHEN more than 10 users from the same device fingerprint are detected within 24 hours THEN the system SHALL auto-block new signups from that fingerprint and alert admins.
3. WHEN a spike in failed payment webhooks exceeds 20 in 5 minutes THEN the system SHALL alert admins with the payload details.
4. WHEN an admin adds a domain to the disposable-email blocklist THEN the system SHALL apply the block within 60 seconds without a code deploy or server restart.
5. WHEN a user is auto-blocked by the abuse system THEN the system SHALL log the reason, triggering rule, and all relevant identifiers (IP, fingerprint, email) for admin audit.
6. WHEN admin audit logs are queried THEN the system SHALL support filtering by: date range, event type, user ID, IP address, admin actor.

---

## Open Questions

[OPEN QUESTION: Razorpay international card support — Razorpay's international card acceptance requires RBI approval for Indian businesses. Assumption: the platform has or will obtain the required international payment approval. If not, international users may need to use wire transfer or a different payment provider for non-INR currencies. Flag this before launch.]

[OPEN QUESTION: SMTP provider — the email system requires a transactional email provider (Resend, SendGrid, Postmark, AWS SES). No provider is specified in the project stack. Assumption: Resend will be used, as it has a generous free tier and a Next.js SDK. This should be confirmed before Phase 2 design.]

[OPEN QUESTION: Redis / Upstash for rate limiting — rate limiting requires a fast in-memory store. The project stack does not include Redis. Assumption: Upstash Redis will be used (serverless, no-ops, Vercel-native integration). Confirm before design.]

[OPEN QUESTION: FingerprintJS licensing — the open-source version of FingerprintJS has lower accuracy (~60%) vs the pro version (~99.5%). Assumption: FingerprintJS OSS is acceptable for MVP anti-abuse, with an upgrade path to Pro if abuse levels require it.]

[OPEN QUESTION: GDPR / data residency — storing IP addresses, device fingerprints, and behavioral logs triggers GDPR obligations for EU users. Assumption: the platform will implement GDPR-compliant data retention (90-day IP log retention, right-to-erasure endpoint). This needs legal confirmation before launch.]
