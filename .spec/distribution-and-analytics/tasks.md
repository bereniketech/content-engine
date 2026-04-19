# Tasks: distribution-and-analytics

Total: 18 tasks | Build order: DB schema → Social APIs → Email → Calendar → Analytics → Feedback loop

---

## Task 001 — Database Migration: distribution_logs + scheduled_posts

Create Supabase migration with `distribution_logs` and `scheduled_posts` tables, indexes, and RLS policies.

- Add `distribution_logs` table (id, session_id, user_id, platform, status, external_id, metadata, error_details, created_at)
- Add `scheduled_posts` table (id, session_id, user_id, platform, asset_type, content_snapshot, status, publish_at, published_at, external_id, error_details, created_at)
- Add indexes: `(session_id, platform)` on `distribution_logs`, `(status, publish_at)` on `scheduled_posts`
- Enable RLS on both tables; select/insert/update policies scoped to `user_id = auth.uid()`

_Requirements:_ Req 1.5, Req 2.3, Req 3.1, Req 3.2
_Skills:_ `.kit/skills/data-backend/database-migrations/SKILL.md`

**AC:**
- [ ] WHEN migration runs, THEN both tables exist with correct columns and constraints
- [ ] WHEN a user queries `distribution_logs`, THEN RLS returns only their own rows
- [ ] WHEN `publish_at` is older than now, THEN the row still inserts (constraint is in application layer)

---

## Task 002 — Database Migration: analytics_snapshots + refresh_triggers

Create Supabase migration for `analytics_snapshots` and `refresh_triggers` tables.

- Add `analytics_snapshots` (id, user_id, source, data, fetched_at) with index on `(user_id, source, fetched_at DESC)`
- Add `refresh_triggers` (id, user_id, session_id, query, old_rank, new_rank, trigger_reason, status, resolved_at, created_at)
- Add unique partial index on `refresh_triggers(session_id, query)` WHERE `status='pending'`
- Enable RLS on both tables

_Requirements:_ Req 4.1, Req 4.2, Req 5.1, Req 5.3
_Skills:_ `.kit/skills/data-backend/database-migrations/SKILL.md`

**AC:**
- [ ] WHEN migration runs, THEN both tables exist with correct columns
- [ ] WHEN duplicate pending trigger is inserted for same session_id+query, THEN Postgres rejects with unique violation
- [ ] WHEN `analytics_snapshots` is queried, THEN RLS returns only user's own rows

---

## Task 003 — Shared: distribution-log helper + secrets accessors

Create `lib/publish/distribution-log.ts` (check + write distribution_logs) and `lib/publish/secrets.ts` (typed env accessors for all platform credentials).

- `checkAlreadyPublished(supabase, sessionId, platform)` → throws `AlreadyPublishedError` if row exists with `status='published'`
- `writeDistributionLog(supabase, params)` → inserts row, returns log id
- `getTwitterSecrets()`, `getLinkedInSecrets()`, `getInstagramSecrets()`, `getRedditSecrets()`, `getMailchimpSecrets()`, `getSendGridSecrets()`, `getGoogleSecrets()` — each throws `ConfigError` on missing env

_Requirements:_ Req 1.5, Req 2.3
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`

**AC:**
- [ ] WHEN `checkAlreadyPublished` is called and a published log exists, THEN it throws `AlreadyPublishedError`
- [ ] WHEN `getTwitterSecrets` is called with missing env var, THEN it throws `ConfigError` with the var name
- [ ] WHEN `writeDistributionLog` is called with valid params, THEN it inserts and returns the log id

---

## Task 004 — Twitter/X Publish API

Create `lib/publish/twitter.ts` and `app/api/publish/x/route.ts` for posting tweets and threads via Twitter v2 API.

- `lib/publish/twitter.ts`: `postTweet(text)` → calls `POST https://api.twitter.com/2/tweets` with OAuth 1.0a signature (use `oauth-1.0a` + `crypto` node module)
- `postThread(tweets: string[])` → posts each tweet in sequence, each replying to the previous
- Route handler: validate JWT auth, check idempotency via `checkAlreadyPublished`, call `postTweet`/`postThread`, write `distribution_logs`, return 201
- Handle Twitter 429 → return 429 with `retry_after`

_Requirements:_ Req 1.1
_Skills:_ `.kit/skills/integrations/x-api/SKILL.md`, `.kit/skills/integrations/twitter-automation/SKILL.md`

**AC:**
- [ ] WHEN POST `/api/publish/x` with valid tweet text, THEN returns 201 with `externalId`
- [ ] WHEN same session_id + platform already published, THEN returns 409
- [ ] WHEN Twitter returns 429, THEN API returns 429 with `retry_after` in error message
- [ ] WHEN unauthenticated request, THEN returns 401

---

## Task 005 — LinkedIn Publish API

Create `lib/publish/linkedin.ts` and `app/api/publish/linkedin/route.ts`.

- `postToLinkedIn(content, personUrn)` → calls `POST https://api.linkedin.com/v2/ugcPosts` with Bearer token
- `personUrn` fetched from `GET https://api.linkedin.com/v2/userinfo` using the access token
- Route handler: auth check, idempotency check, post, log, return 201
- On LinkedIn 401 → return 401 with `"Reconnect LinkedIn"` message

_Requirements:_ Req 1.2
_Skills:_ `.kit/skills/integrations/linkedin-automation/SKILL.md`

**AC:**
- [ ] WHEN POST `/api/publish/linkedin` with valid content, THEN returns 201 with `externalId`
- [ ] WHEN LinkedIn token is expired, THEN returns 401 with reconnect message
- [ ] WHEN already published, THEN returns 409

---

## Task 006 — Instagram Publish API

Create `lib/publish/instagram.ts` and `app/api/publish/instagram/route.ts`.

- `publishToInstagram(caption, imageUrl, businessAccountId)` → step 1: create container `POST /{id}/media`, step 2: publish `POST /{id}/media_publish`
- Route handler: validate `imageUrl` is present; if absent return 400 with validation message; auth, idempotency, publish, log
- On any Graph API error, extract `error.message` from response and return 500

_Requirements:_ Req 1.3
_Skills:_ `.kit/skills/integrations/instagram-automation/SKILL.md`

**AC:**
- [ ] WHEN POST `/api/publish/instagram` with `imageUrl`, THEN returns 201 with `externalId`
- [ ] WHEN `imageUrl` is missing, THEN returns 400 with validation message
- [ ] WHEN already published, THEN returns 409

---

## Task 007 — Reddit Publish API

Create `lib/publish/reddit.ts` and `app/api/publish/reddit/route.ts`.

- `getRedditAccessToken()` → POST to `https://www.reddit.com/api/v1/access_token` using `REDDIT_REFRESH_TOKEN` + client credentials to get short-lived token
- `submitRedditPost(subreddit, title, body, accessToken)` → `POST https://oauth.reddit.com/api/submit`
- Route handler: validate subreddit not empty, auth, idempotency, get token, submit, log
- On Reddit 403 (banned/restricted sub) → return 403 with message

_Requirements:_ Req 1.4
_Skills:_ `.kit/skills/integrations/reddit-automation/SKILL.md`

**AC:**
- [ ] WHEN POST `/api/publish/reddit` with valid subreddit + content, THEN returns 201 with `externalId`
- [ ] WHEN subreddit is empty string, THEN returns 400
- [ ] WHEN already published, THEN returns 409

---

## Task 008 — Newsletter Dispatch API (Mailchimp + SendGrid)

Create `lib/publish/newsletter.ts` and `app/api/publish/newsletter/route.ts`.

- `dispatchMailchimp(subjectLine, htmlBody, audienceId)` → create campaign, set content, send
- `dispatchSendGrid(subjectLine, htmlBody, recipientEmail)` → single API call to `/v3/mail/send`
- Route handler: switch on `provider` field, auth, idempotency, dispatch, log
- `platform` in log = `newsletter_mailchimp` or `newsletter_sendgrid`

_Requirements:_ Req 2.1, Req 2.2, Req 2.3
_Skills:_ `.kit/skills/integrations/mailchimp-automation/SKILL.md`, `.kit/skills/integrations/sendgrid-automation/SKILL.md`

**AC:**
- [ ] WHEN POST with `provider='mailchimp'`, THEN Mailchimp campaign created and sent; returns 201
- [ ] WHEN POST with `provider='sendgrid'`, THEN SendGrid email dispatched; returns 201
- [ ] WHEN `MAILCHIMP_API_KEY` missing, THEN returns 500 with `config_error`
- [ ] WHEN already published, THEN returns 409

---

## Task 009 — PublishButton UI Component

Create `components/sections/PublishButton.tsx` — a reusable publish button with loading/success/error states, and wire it into XPanel, LinkedInPanel, InstagramPanel, RedditPanel, and NewsletterPanel.

- Props: `platform`, `sessionId`, `content`, `contentType`, `onSuccess`, `onError`
- States: `idle` → `loading` (spinner) → `success` (green check + "Posted {time}") | `error` (red + message + Retry)
- Calls the appropriate `/api/publish/{platform}` endpoint
- On 409: show "Already posted" in success state (not error)

_Requirements:_ Req 1.1, Req 1.2, Req 1.3, Req 1.4, Req 2.1, Req 2.2
_Skills:_ `.kit/skills/development/build-website-web-app/SKILL.md`

**AC:**
- [ ] WHEN button clicked, THEN enters loading state and disables re-click
- [ ] WHEN API returns 201, THEN shows success state with timestamp
- [ ] WHEN API returns error, THEN shows error message and Retry button
- [ ] WHEN API returns 409, THEN shows "Already posted" (success style)
- [ ] WHEN XPanel renders, THEN PublishButton is present for tweet and thread

---

## Task 010 — Schedule API (Queue + Cancel)

Create `app/api/schedule/route.ts` (POST) and `app/api/schedule/[id]/route.ts` (DELETE).

- POST: validate `publish_at > now()`, insert `scheduled_posts` row, return 201
- DELETE: verify row belongs to auth user, update `status='cancelled'`, return 200
- Both endpoints require JWT auth

_Requirements:_ Req 3.1, Req 3.4
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`

**AC:**
- [ ] WHEN POST with past `publish_at`, THEN returns 400
- [ ] WHEN POST with future `publish_at`, THEN inserts row and returns 201 with id
- [ ] WHEN DELETE valid id, THEN status becomes 'cancelled' and returns 200
- [ ] WHEN DELETE non-existent id, THEN returns 404

---

## Task 011 — Schedule Worker (Process Queued Posts)

Create `app/api/cron/schedule-worker/route.ts` — a Next.js route handler called on a cron schedule (e.g. Vercel Cron or manual trigger) that processes queued `scheduled_posts`.

- Query `scheduled_posts` WHERE `status='queued' AND publish_at <= now()` LIMIT 50
- For each: call the appropriate publish lib function (`postTweet`, `postToLinkedIn`, etc.)
- On success: update `status='published'`, set `published_at=now()`, set `external_id`
- On failure: update `status='failed'`, set `error_details`
- Protected by a shared `CRON_SECRET` env var in Authorization header

_Requirements:_ Req 3.2
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`, `.kit/skills/devops/terminal-cli-devops/SKILL.md`

**AC:**
- [ ] WHEN worker runs and a queued post's `publish_at` has passed, THEN it publishes and status becomes 'published'
- [ ] WHEN platform API fails, THEN status becomes 'failed' with error details
- [ ] WHEN request lacks `CRON_SECRET` header, THEN returns 401
- [ ] WHEN no queued posts exist, THEN returns 200 with `{ processed: 0 }`

---

## Task 012 — Schedule Modal UI + CalendarPanel Extension

Create `components/sections/ScheduleModal.tsx` and extend `CalendarPanel.tsx` to show scheduling controls and display queued/published status badges.

- ScheduleModal: datetime-local input, validates min 5 minutes ahead, calls `POST /api/schedule`
- CalendarPanel: fetch `/api/schedule?sessionId=...` on load, show badge per slot (queued: clock icon, published: green check, failed: red X)
- Add cancel button to queued slots (calls DELETE)

_Requirements:_ Req 3.1, Req 3.3, Req 3.4
_Skills:_ `.kit/skills/development/build-website-web-app/SKILL.md`

**AC:**
- [ ] WHEN user clicks clock icon on a slot, THEN ScheduleModal opens
- [ ] WHEN user selects past datetime, THEN "Schedule" button is disabled
- [ ] WHEN schedule API returns 201, THEN slot shows clock badge
- [ ] WHEN slot is published, THEN green check badge is shown
- [ ] WHEN user cancels a queued slot, THEN badge disappears

---

## Task 013 — GA4 Analytics API

Create `lib/analytics/ga4.ts` and `app/api/analytics/ga4/route.ts`.

- `fetchGA4Data(userId, supabase)`: check `analytics_snapshots` for source='ga4' within 24h; if fresh return cached; else call GA4 Data API, save snapshot, return
- GA4 Data API call: use `googleapis` or direct REST with service account JWT; request `sessions`, `screenPageViews` for last 30 days + top 5 pages by `screenPageViews`
- Route: auth, call `fetchGA4Data`, return 200

_Requirements:_ Req 4.1
_Skills:_ `.kit/skills/integrations/google-analytics-automation/SKILL.md`

**AC:**
- [ ] WHEN called with valid credentials, THEN returns sessions + pageViews + topPages
- [ ] WHEN snapshot exists < 24h old, THEN returns cached data without calling GA4 API
- [ ] WHEN `GA4_PROPERTY_ID` missing, THEN returns 500 with `config_error`
- [ ] WHEN unauthenticated, THEN returns 401

---

## Task 014 — Search Console Analytics API

Create `lib/analytics/search-console.ts` and `app/api/analytics/search-console/route.ts`.

- `fetchSearchConsoleData(userId, supabase)`: 24h cache same pattern as GA4; call Search Console API `searchanalytics.query` for last 28 days; return clicks, impressions, ctr, top 10 queries with position
- Route: auth, call `fetchSearchConsoleData`, return 200

_Requirements:_ Req 4.2
_Skills:_ `.kit/skills/integrations/google-analytics-automation/SKILL.md`

**AC:**
- [ ] WHEN called with valid credentials, THEN returns clicks, impressions, ctr, topQueries with position
- [ ] WHEN snapshot exists < 24h old, THEN returns cached without API call
- [ ] WHEN `GOOGLE_SEARCH_CONSOLE_SITE_URL` missing, THEN returns 500 `config_error`

---

## Task 015 — Analytics Dashboard UI

Replace the stubbed analytics page with a live `AnalyticsDashboard` component.

- Create `components/sections/AnalyticsDashboard.tsx` using recharts (`LineChart` for traffic, `BarChart` for CTR)
- Install `recharts` package
- Replace `app/dashboard/analytics/page.tsx` content with `<AnalyticsDashboard />`
- Fetch both `/api/analytics/ga4` and `/api/analytics/search-console` in parallel with `Promise.all`
- Skeleton loaders (`animate-pulse`) while loading; error cards with red border on failure

_Requirements:_ Req 4.3
_Skills:_ `.kit/skills/development/build-website-web-app/SKILL.md`, `.kit/skills/ui-design/ui-ux-pro-max/SKILL.md`

**AC:**
- [ ] WHEN page loads, THEN skeleton loaders visible during fetch
- [ ] WHEN data loads, THEN 4 cards render: traffic sparkline, top pages, CTR chart, top keywords
- [ ] WHEN GA4 API errors, THEN error card shown for that card only
- [ ] WHEN Search Console API errors, THEN error card shown for that card only

---

## Task 016 — Ranking Drop Detection + Refresh Triggers

Create `lib/analytics/delta.ts` and `app/api/cron/analytics-delta/route.ts`.

- `detectRankingDrops(userId, supabase)`: fetch two most recent `analytics_snapshots` for source='search_console' per user; for each query, if position increased > 5 (rank worsened), call `insertRefreshTrigger` (with duplicate guard)
- `insertRefreshTrigger(supabase, params)`: insert with ON CONFLICT DO NOTHING on unique partial index
- Cron route: loop all users (use Supabase service role), call `detectRankingDrops`, return `{ processed: N }`
- Protected by `CRON_SECRET` header

_Requirements:_ Req 5.1, Req 5.3
_Skills:_ `.kit/skills/integrations/google-analytics-automation/SKILL.md`

**AC:**
- [ ] WHEN two snapshots exist and a query dropped >5 positions, THEN `refresh_triggers` row inserted
- [ ] WHEN trigger already exists with status='pending' for same query+session, THEN no duplicate inserted
- [ ] WHEN cron runs with no drops, THEN no rows inserted; returns `{ processed: 0 }`
- [ ] WHEN no `CRON_SECRET`, THEN returns 401

---

## Task 017 — Refresh Trigger Banner + Regenerate Flow

Create `components/sections/RefreshTriggerBanner.tsx` and `app/api/analytics/refresh-triggers/route.ts`. Wire into Analytics page.

- GET route: return all `status='pending'` triggers for auth user
- `RefreshTriggerBanner`: fetch triggers on load; if >0 show banner above analytics grid
- Each row: "Query: '{q}' was #N now #M" + "Regenerate" button + "Dismiss" button
- "Regenerate" calls `POST /api/improve` (existing) with sessionId; on success update trigger `status='resolved'` via `PATCH /api/analytics/refresh-triggers/:id`
- Add PATCH route to `app/api/analytics/refresh-triggers/[id]/route.ts`
- Emit PostHog events on trigger + resolve

_Requirements:_ Req 5.2, Req 5.3, Req 5.4
_Skills:_ `.kit/skills/development/build-website-web-app/SKILL.md`, `.kit/skills/marketing-growth/content-strategy/SKILL.md`

**AC:**
- [ ] WHEN pending triggers exist, THEN banner shows above analytics grid
- [ ] WHEN user clicks Regenerate, THEN `/api/improve` is called with correct sessionId
- [ ] WHEN regeneration succeeds, THEN trigger status = 'resolved' and banner row disappears
- [ ] WHEN user clicks Dismiss, THEN trigger resolved without regeneration
- [ ] PostHog events emitted on both trigger and resolve

---

## Task 018 — Tests: Publish APIs + Analytics Caching

Write Jest unit tests for all publish lib functions and analytics caching logic.

- `lib/publish/twitter.test.ts` — mock fetch, test `postTweet` success/429/network error
- `lib/publish/distribution-log.test.ts` — mock Supabase client, test idempotency check and write
- `lib/analytics/ga4.test.ts` — mock fetch + Supabase, test cache hit (returns snapshot) and cache miss (calls GA4 API)
- `lib/analytics/delta.test.ts` — test ranking drop detection with fixture snapshots; test duplicate guard

_Requirements:_ All
_Skills:_ `.kit/skills/testing-quality/tdd-workflow/SKILL.md`, `.kit/skills/testing-quality/security-review/SKILL.md`

**AC:**
- [ ] WHEN tests run with `npm test`, THEN all 4 test files pass with 0 failures
- [ ] WHEN Twitter API returns 429, THEN `postTweet` throws with `retryAfter` property
- [ ] WHEN cache hit exists, THEN GA4 API fetch is NOT called (assert fetch not called)
- [ ] WHEN same query appears twice in drops, THEN only one trigger inserted (duplicate guard tested)
