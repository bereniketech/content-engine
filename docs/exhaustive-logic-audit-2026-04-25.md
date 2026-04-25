# Exhaustive Logic Audit — content-engine
**Date:** 2026-04-25  
**Auditor:** Senior Software Architect (code-reviewer agent)  
**Scope:** Complete logic inventory across all 286 files  
**Format:** 82 entries, fully classified

---

## Complete Logic Instance Catalog

### Entry 1 — Rate Limit Key Derivation
- **File:** `middleware.ts`
- **Function:** `getRateLimitUserKey`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:**
  ```ts
  if (token) {
    const subject = decodeJwtSubject(token)
    return subject ? `user:${subject}` : `token:${token.slice(-24)}`
  }
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || 'anonymous'
  return `ip:${ip}`
  ```
- **Description:** Derives rate-limit key from authenticated user, raw token suffix, or IP fallback
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 2 — Rate Limit Enforcement
- **File:** `middleware.ts`
- **Function:** `enforceRateLimit`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** Sliding-window check: 10 requests per 60 seconds per user/IP
- **Description:** Applies per-user/IP rate limit; increments counter in in-memory Map
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — In-memory store is not process-safe across serverless instances

### Entry 3 — JWT Segment Count Guard
- **File:** `middleware.ts`
- **Function:** `decodeJwtSubject`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** `if (parts.length < 2) { return null; }`
- **Description:** Guards JWT segment count before decoding
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 4 — Bearer Token Extraction
- **File:** `lib/auth.ts`
- **Function:** `getBearerToken`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:**
  ```ts
  if (!authorizationHeader) { return null }
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
  ```
- **Description:** Extracts Bearer token or returns null if header absent/malformed
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 5 — Two-Path Authentication
- **File:** `lib/auth.ts`
- **Function:** `requireAuth`
- **Type:** PERMISSION
- **Location:** BACKEND
- **Code:** Bearer token first, cookie session fallback; throws on failure
- **Description:** Multi-path auth with fallback
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 6 — Session Asset Type Lookup
- **File:** `lib/session-assets.ts`
- **Function:** `getLatestAssetByType`
- **Type:** TRANSFORMATION
- **Location:** BACKEND
- **Code:** `return [...assets].reverse().find((asset) => asset.assetType === assetType) ?? null`
- **Description:** Finds most-recent asset of type by reversing array
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 7 — Session Resolution (Three-Tier Fallback)
- **File:** `lib/session-assets.ts`
- **Function:** `resolveSessionId`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** Use provided session (verified), fall back to latest, create new
- **Description:** Session lifecycle management
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 8 — AI Provider Selection
- **File:** `lib/ai.ts`
- **Function:** `getProvider`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Priority: explicit env override → API key detection → Anthropic default
- **Description:** Provider auto-detection with explicit override
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 9 — Input Sanitisation (String)
- **File:** `lib/sanitize.ts`
- **Function:** `sanitizeInput`
- **Type:** TRANSFORMATION
- **Location:** BACKEND
- **Code:** Strips backticks, angle brackets, Mustache delimiters
- **Description:** Prompt-injection defense
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 10 — JSON Extraction (Multi-Strategy)
- **File:** `lib/extract-json.ts`
- **Function:** `extractJsonPayload`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Raw parse → fenced block → brace-balanced scan
- **Description:** Resilient AI response parsing
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Copy-pasted into 5 route files

### Entry 11 — Word Count Calculation
- **File:** `lib/utils.ts`
- **Function:** `getWordCount`
- **Type:** CALCULATION
- **Location:** BACKEND
- **Code:** `text.trim().split(/\s+/).filter(Boolean).length`
- **Description:** Word count via whitespace split
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in 3 backend routes + 1 frontend fallback

### Entry 12 — Data-Driven File Kind Classification
- **File:** `lib/data-driven-form.ts`
- **Function:** `getDataDrivenFileKind`
- **Type:** CONDITIONAL
- **Location:** BACKEND (shared lib)
- **Code:** Extension-based classification (text, pdf, unsupported)
- **Description:** File upload type routing
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 13 — Data-Driven Form Validation
- **File:** `lib/data-driven-form.ts`
- **Function:** `getDataDrivenValidationError`
- **Type:** VALIDATION
- **Location:** BACKEND (shared lib)
- **Code:** Sequential validation; mode-gated rules
- **Description:** Form input validation with mode awareness
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Topic min-length only enforced on frontend

### Entry 14 — Pipeline Step Keys Determination
- **File:** `lib/data-driven-pipeline.ts`
- **Function:** `buildStepKeys`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:**
  ```ts
  if (mode === 'topic') { return ['research', 'article', 'seoGeo', 'distribution'] }
  return includeResearch ? [...] : [...]
  ```
- **Description:** Determines active pipeline steps
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Pipeline orchestration belongs in backend

### Entry 15 — Pipeline State Restoration
- **File:** `lib/data-driven-pipeline.ts`
- **Function:** `buildRestoredPipelineState`
- **Type:** STATE_LOGIC
- **Location:** FRONTEND
- **Code:** Reconstructs step statuses from persisted assets
- **Description:** Recovers pipeline state on page reload
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Business rules invisible to backend; silent divergence risk

### Entry 16 — Downstream Asset Cascade
- **File:** `lib/data-driven-pipeline.ts`
- **Function:** `getDownstreamAssetTypesForRegenerate`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** Hardcoded dependency graph for asset deletion
- **Description:** Determines what to delete on step regeneration
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Pure business rule in frontend

### Entry 17 — Ranking Drop Detection
- **File:** `lib/analytics/delta.ts`
- **Function:** `detectRankingDrops`
- **Type:** CALCULATION
- **Location:** BACKEND
- **Code:** Compares search positions between snapshots; flags drops > 5 positions
- **Description:** Analytics delta computation
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 18 — Refresh Trigger Insertion
- **File:** `lib/analytics/delta.ts`
- **Function:** `insertRefreshTrigger`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Silently skips duplicates (unique constraint); throws on other DB errors
- **Description:** Idempotent refresh trigger creation
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 19 — GA4 Cache Check
- **File:** `lib/analytics/ga4.ts`
- **Function:** `fetchGA4Data`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** 24-hour cache with `forceRefresh` override
- **Description:** Cache-or-fetch pattern
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in search-console.ts

### Entry 20 — Search Console CTR Calculation
- **File:** `lib/analytics/search-console.ts`
- **Function:** `fetchFromSearchConsole`
- **Type:** CALCULATION
- **Location:** BACKEND
- **Code:** Aggregates clicks/impressions; averages CTR with zero-row guard; rounds position
- **Description:** Multi-metric aggregation
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 21 — Already Published Check
- **File:** `lib/publish/distribution-log.ts`
- **Function:** `checkAlreadyPublished`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** Throws if session already published to this platform
- **Description:** Idempotency guard
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 22 — Twitter OAuth Signature
- **File:** `lib/publish/twitter.ts`
- **Function:** `buildOAuthHeader`
- **Type:** CALCULATION
- **Location:** BACKEND
- **Code:** Full OAuth 1.0a HMAC-SHA1 signature computation
- **Description:** Cryptographic API authentication
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 23 — Twitter Rate Limit Handling
- **File:** `lib/publish/twitter.ts`
- **Function:** `postTweet` / `postThread`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Computes remaining seconds from reset epoch, minimum 60s
- **Description:** Rate limit backoff calculation
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 24 — Thread Reply Chain
- **File:** `lib/publish/twitter.ts`
- **Function:** `postThread`
- **Type:** STATE_LOGIC
- **Location:** BACKEND
- **Code:** Sequential posts; each replies to previous
- **Description:** Tweet thread orchestration
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in schedule-worker.ts

### Entry 25 — LinkedIn Auth Error Normalization
- **File:** `lib/publish/linkedin.ts`
- **Function:** `getPersonUrn` / `postToLinkedIn`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Normalises 401/403 into LinkedInAuthError
- **Description:** Auth error handling
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 26 — Reddit Error Parsing
- **File:** `lib/publish/reddit.ts`
- **Function:** `submitRedditPost`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** 403 → typed error; JSON errors array check
- **Description:** Platform-specific error classification
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 27 — Mailchimp Data-Center Extraction
- **File:** `lib/publish/newsletter.ts`
- **Function:** `getMailchimpDataCenter`
- **Type:** TRANSFORMATION
- **Location:** BACKEND
- **Code:** Extracts DC suffix from API key format
- **Description:** Mailchimp region routing
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 28 — SendGrid HTTP 202 Acceptance
- **File:** `lib/publish/newsletter.ts`
- **Function:** `dispatchSendGrid`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Accepts both 200 and 202 as success
- **Description:** Async response handling
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 29 — Schedule Validation (API)
- **File:** `app/api/schedule/route.ts`
- **Function:** `POST`
- **Type:** VALIDATION
- **Location:** BACKEND
- **Code:** Platform allowlist, future-date enforcement (> now)
- **Description:** Multi-field schedule validation
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Scheduling buffer only 0 seconds; frontend requires 4–5 minutes

### Entry 30 — Publish X Dispatch
- **File:** `app/api/publish/x/route.ts`
- **Function:** `POST`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Routes to thread or single tweet based on `contentType`
- **Description:** Content type branching
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in schedule-worker.ts

### Entry 31 — Cron Secret Authentication
- **File:** `app/api/cron/schedule-worker/route.ts` / `analytics-delta/route.ts`
- **Function:** `POST`
- **Type:** PERMISSION
- **Location:** BACKEND
- **Code:** Bearer token match against `CRON_SECRET`
- **Description:** Cron job auth
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in two cron routes

### Entry 32 — Scheduled Post Publishing Dispatch
- **File:** `app/api/cron/schedule-worker/route.ts`
- **Function:** `publishPost`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** Platform-specific dispatch (switch statement)
- **Description:** Scheduled post execution
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 33 — Assessment Normalization
- **File:** `app/api/data-driven/assess/route.ts`
- **Function:** `normalizeAssessmentResult`
- **Type:** VALIDATION
- **Location:** BACKEND
- **Code:** Strict shape validation of AI assessment
- **Description:** AI output type enforcement
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 34 — Source Text Length Validation
- **File:** `app/api/data-driven/assess/route.ts`
- **Function:** `POST`
- **Type:** VALIDATION
- **Location:** BACKEND
- **Code:** Min and max length enforcement
- **Description:** Input bounds checking
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 35 — Article Input Parsing
- **File:** `app/api/data-driven/article/route.ts`
- **Function:** `parseArticleInput`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Content-type routing (multipart vs JSON)
- **Description:** Input format detection
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 36 — PDF Truncation Handling
- **File:** `app/api/data-driven/article/route.ts`
- **Function:** `parseArticleInput` (PDF branch)
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Appends truncation notice; prefers upload over paste
- **Description:** Large file handling
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 37 — Cron Analytics Delta Deduplication
- **File:** `app/api/cron/analytics-delta/route.ts`
- **Function:** `POST`
- **Type:** TRANSFORMATION
- **Location:** BACKEND
- **Code:** Deduplicates user IDs before delta analysis
- **Description:** Set-based deduplication
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 38 — Schedule Modal Future-Date Validation
- **File:** `components/sections/ScheduleModal.tsx`
- **Function:** `ScheduleModal`
- **Type:** VALIDATION
- **Location:** FRONTEND
- **Code:** `publishAt > Date.now() + 4 * 60 * 1000`
- **Description:** Client-side future-date validation (4+ minutes)
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Threshold mismatch with backend (backend: 0s, frontend: 4m)

### Entry 39 — Publish Button Endpoint Map
- **File:** `components/sections/PublishButton.tsx`
- **Function:** `PublishButton`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** Platform-to-endpoint mapping
- **Description:** API routing table
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Frontend encodes API routing decision

### Entry 40 — Publish State Machine
- **File:** `components/sections/PublishButton.tsx`
- **Function:** `handlePublish`
- **Type:** STATE_LOGIC
- **Location:** FRONTEND
- **Code:** Idle → loading → success/error/already_published
- **Description:** Publish flow orchestration
- **Category:** UI_LOGIC
- **Violation:** NO

### Entry 41 — Refresh Trigger Banner Pluralisation
- **File:** `components/sections/RefreshTriggerBanner.tsx`
- **Function:** `RefreshTriggerBanner` (render)
- **Type:** CALCULATION
- **Location:** FRONTEND
- **Code:** `triggers.length === 1 ? 'query has' : 'queries have'`
- **Description:** Grammar pluralisation
- **Category:** UI_LOGIC
- **Violation:** NO

### Entry 42 — Intent Color Mapping
- **File:** `components/sections/ResearchPanel.tsx`
- **Function:** `getIntentColor`
- **Type:** TRANSFORMATION
- **Location:** FRONTEND
- **Code:** Domain enum → badge variant map
- **Description:** Semantic-to-UI mapping
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated thrice; belongs in backend response

### Entry 43 — Low-Demand Alternative Trigger
- **File:** `components/sections/ResearchPanel.tsx`
- **Function:** `ResearchPanel` (render)
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** `content.demand === 'low' && alternatives.length > 0`
- **Description:** Conditional alternative suggestions
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Business rule in frontend

### Entry 44 — SEO Score Quality Thresholds
- **File:** `components/sections/SEOPanel.tsx`
- **Function:** `ScoreIndicator`
- **Type:** CALCULATION
- **Location:** FRONTEND
- **Code:** Hardcoded thresholds: 70, 40 for color mapping
- **Description:** SEO quality classification
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Thresholds hardcoded in frontend

### Entry 45 — Topic Min-Length Validation
- **File:** `components/input/TopicForm.tsx`
- **Function:** `TopicForm`
- **Type:** VALIDATION
- **Location:** FRONTEND
- **Code:** `TOPIC_MIN_LENGTH = 6`
- **Description:** Topic input validation
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — No backend enforcement

### Entry 46 — Data-Driven File Selection
- **File:** `components/input/DataDrivenForm.tsx`
- **Function:** `handleFileSelection`
- **Type:** CONDITIONAL
- **Location:** FRONTEND
- **Code:** File routing (absent/unsupported/PDF/text)
- **Description:** Upload type routing
- **Category:** UI_LOGIC (delegates validation to lib)
- **Violation:** NO

### Entry 47 — Social Normalization (Copy 1)
- **File:** `components/sections/SocialPanel.tsx`
- **Function:** `normalizePlatformData`
- **Type:** TRANSFORMATION
- **Location:** FRONTEND
- **Code:** Per-platform field extraction and fallback
- **Description:** AI output normalization
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in 2 API routes

### Entry 48 — Social Normalization (Copy 2)
- **File:** `app/api/social/route.ts`
- **Function:** `normalizeSocialOutput`
- **Type:** TRANSFORMATION
- **Location:** BACKEND
- **Code:** Same platform handling as Copy 1
- **Description:** AI output normalization
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Copy 1 and Copy 3 exist

### Entry 49 — Social Normalization (Copy 3)
- **File:** `app/api/social/regenerate/route.ts`
- **Function:** `normalizePlatformOutput`
- **Type:** TRANSFORMATION
- **Location:** BACKEND
- **Code:** Same platform handling as Copies 1 and 2
- **Description:** AI output normalization
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Copies 1 and 2 exist; already diverged on thread handling

### Entry 50 — Dashboard Session Query (Direct Supabase)
- **File:** `app/dashboard/page.tsx`
- **Function:** `DashboardPage`
- **Type:** BUSINESS_RULE (N+1 query pattern)
- **Location:** FRONTEND
- **Code:** Fetch sessions, then per-session asset count query
- **Description:** Direct Supabase client queries
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Frontend queries database directly; bypasses API layer; N+1 pattern

### Entry 51 — Dashboard Inline Asset Mapping
- **File:** `app/dashboard/page.tsx`
- **Function:** `DashboardPage`
- **Type:** TRANSFORMATION
- **Location:** FRONTEND
- **Code:** Inline mapping instead of importing `mapAssetRowToContentAsset`
- **Description:** Manual asset transformation
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Canonical function exists but not used

### Entry 52 — Data-Driven Page SSE Parsing
- **File:** `app/dashboard/data-driven/page.tsx`
- **Function:** `parseSseChunk`
- **Type:** CONDITIONAL
- **Location:** FRONTEND
- **Code:** SSE event buffer parsing and reassembly
- **Description:** Server-sent event handling
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in BlogPanel.tsx

### Entry 53 — Data-Driven Page Pipeline Orchestration
- **File:** `app/dashboard/data-driven/page.tsx`
- **Function:** `DashboardPage`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** Full pipeline state management and API sequencing
- **Description:** Pipeline orchestration
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Critical: business logic in browser

### Entry 54 — Data-Driven Page Distribution Calls
- **File:** `app/dashboard/data-driven/page.tsx`
- **Function:** `DashboardPage` (distribution step)
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** Three parallel API calls; client-side result assembly
- **Description:** Distribution orchestration
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — No server-side coordination

### Entry 55 — Blog Panel SSE Parsing
- **File:** `components/sections/BlogPanel.tsx`
- **Function:** `parseSSEChunk`
- **Type:** CONDITIONAL
- **Location:** FRONTEND
- **Code:** SSE event buffer parsing (named differently from data-driven/page.tsx)
- **Description:** Server-sent event handling
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in data-driven/page.tsx

### Entry 56 — Blog Panel Word Count Fallback
- **File:** `components/sections/BlogPanel.tsx`
- **Function:** `BlogPanel`
- **Type:** CALCULATION
- **Location:** FRONTEND
- **Code:** Fallback word count if server omits it
- **Description:** Missing field compensation
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in 3 backend routes

### Entry 57 — Type Guard: isRecord
- **File:** `lib/type-guards.ts` (canonical, but copies exist)
- **Function:** `isRecord`
- **Type:** VALIDATION
- **Location:** BACKEND (shared)
- **Code:** `typeof value === 'object' && value !== null`
- **Description:** Runtime type narrowing
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Copied into 6+ other files

### Entry 58 — Type Guard: asStringArray
- **File:** `lib/type-guards.ts` (canonical, but copies exist)
- **Function:** `asStringArray`
- **Type:** VALIDATION
- **Location:** BACKEND (shared)
- **Code:** Array element type checking
- **Description:** Runtime array validation
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Copied into multiple files

### Entry 59 — Type Guard: isDataDrivenInputData
- **File:** `types/index.ts`
- **Function:** `isDataDrivenInputData`
- **Type:** VALIDATION
- **Location:** SHARED
- **Code:** Shape validation for data-driven input
- **Description:** Discriminator type guard
- **Category:** BUSINESS_LOGIC
- **Violation:** NO

### Entry 60 — Type Guard: isTopicInputData
- **File:** `types/index.ts`
- **Function:** `isTopicInputData`
- **Type:** VALIDATION
- **Location:** SHARED
- **Code:** Shape validation + tone allowlist check
- **Description:** Discriminator type guard with business rule
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Tone constant copied to 2 other locations

### Entry 61 — Tone Allowlist (Copy 1)
- **File:** `types/index.ts`
- **Function:** `TOPIC_TONES`
- **Type:** BUSINESS_RULE
- **Location:** SHARED
- **Code:** `["authority", "casual", "storytelling"]`
- **Description:** Valid tone values
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Copied in TopicForm and backend routes

### Entry 62 — Tone Allowlist (Copy 2)
- **File:** `components/input/TopicForm.tsx`
- **Function:** `toneOptions` (inline)
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** `["authority", "casual", "storytelling"]` redeclared
- **Description:** Valid tone values
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Copy of types/index.ts TOPIC_TONES

### Entry 63 — Tone Allowlist (Copy 3)
- **File:** `app/api/blog/route.ts`
- **Function:** `VALID_TONES`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** `["authority", "casual", "storytelling"]` redeclared
- **Description:** Valid tone values
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Copy of types/index.ts TOPIC_TONES

### Entry 64 — Platform List (Copy 1)
- **File:** `app/api/schedule/route.ts`
- **Function:** `VALID_PLATFORMS`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** Allowlist for scheduling
- **Description:** Supported platforms for scheduling
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Inconsistent with social.ts and PublishButton.tsx

### Entry 65 — Platform List (Copy 2)
- **File:** `lib/prompts/social.ts`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** Inline platform references in prompt context
- **Description:** Supported platforms for social generation
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Different list than schedule and PublishButton

### Entry 66 — Platform List (Copy 3)
- **File:** `components/sections/PublishButton.tsx`
- **Function:** `endpointMap`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** Platform-to-endpoint mappings
- **Description:** Frontend platform routing
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Different list than schedule and social

### Entry 67 — UUID Validation Regex (Copy 1)
- **File:** `lib/session-assets.ts`
- **Function:** `SESSION_ID_UUID_REGEX`
- **Type:** VALIDATION
- **Location:** BACKEND
- **Code:** Standard UUID v4 pattern
- **Description:** Session ID format validation
- **Category:** BUSINESS_LOGIC
- **Violation:** NO (canonical location)

### Entry 68 — UUID Validation Regex (Copy 2)
- **File:** `app/api/data-driven/seo-geo/route.ts`
- **Type:** VALIDATION
- **Location:** BACKEND
- **Code:** Identical regex copy
- **Description:** Session ID format validation
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Should import from session-assets.ts

### Entry 69 — UUID Validation Regex (Copy 3)
- **File:** `app/api/data-driven/multi-format/route.ts`
- **Type:** VALIDATION
- **Location:** BACKEND
- **Code:** Identical regex copy
- **Description:** Session ID format validation
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Should import from session-assets.ts

### Entry 70 — UUID Validation Regex (Copy 4)
- **File:** `app/api/data-driven/x-campaign/route.ts`
- **Type:** VALIDATION
- **Location:** BACKEND
- **Code:** Identical regex copy
- **Description:** Session ID format validation
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Should import from session-assets.ts

### Entry 71 — Asset Type String Literals
- **File:** `lib/data-driven-pipeline.ts`
- **Function:** `PIPELINE_ASSET_TYPES`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** `{ research: 'dd_research', article: 'dd_article', ... }`
- **Description:** Pipeline step → asset type mapping
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Frontend-only; backend uses raw strings

### Entry 72 — Asset Type Raw String Literals (Backend)
- **File:** Various `app/api/` routes
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** Inline `'dd_article'`, `'dd_seo_geo'`, etc.
- **Description:** Asset type identifiers
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Backend hardcodes values that frontend maps

### Entry 73 — Service Role Client (Copy 1)
- **File:** `app/api/cron/analytics-delta/route.ts`
- **Function:** `getServiceRoleClient`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** Supabase client with service role key
- **Description:** Privileged Supabase access
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in schedule-worker.ts

### Entry 74 — Service Role Client (Copy 2)
- **File:** `app/api/cron/schedule-worker/route.ts`
- **Function:** `getServiceRoleClient`
- **Type:** BUSINESS_RULE
- **Location:** BACKEND
- **Code:** Identical to Copy 1
- **Description:** Privileged Supabase access
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Should be in lib/supabase.ts

### Entry 75 — Browser Auth Token (Copy 1)
- **File:** `components/sections/PublishButton.tsx`
- **Function:** `getAuthToken`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** Fetch Supabase session token
- **Description:** Browser auth token retrieval
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Duplicated in RefreshTriggerBanner and ScheduleModal

### Entry 76 — Browser Auth Token (Copy 2)
- **File:** `components/sections/RefreshTriggerBanner.tsx`
- **Function:** `getAuthToken`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** Identical to Copy 1
- **Description:** Browser auth token retrieval
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Should be in lib/auth-browser.ts

### Entry 77 — Browser Auth Token (Copy 3)
- **File:** `components/sections/ScheduleModal.tsx`
- **Function:** `getAuthToken`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:** Identical to Copies 1 and 2
- **Description:** Browser auth token retrieval
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Should be in lib/auth-browser.ts

### Entry 78 — postJson Helper
- **File:** `app/dashboard/data-driven/page.tsx`
- **Function:** `postJson` (inline, lines 164–178)
- **Type:** TRANSFORMATION
- **Location:** FRONTEND
- **Code:** Wrapper around fetch with JSON body
- **Description:** API call helper
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Should be in lib/api-client.ts

### Entry 79 — Markdown Fenced JSON Extraction (Copy 1)
- **File:** `app/api/data-driven/assess/route.ts`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Matches markdown code fence and extracts JSON
- **Description:** JSON extraction with fallback
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Copied into 4 other route files

### Entry 80 — Markdown Fenced JSON Extraction (Copy 2)
- **File:** `app/api/seo/route.ts`
- **Type:** CONDITIONAL
- **Location:** BACKEND
- **Code:** Weaker fallback than newer copies
- **Description:** JSON extraction
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Older pattern already diverged; should import shared function

### Entry 81 — Render Condition: Low-Demand Alternatives
- **File:** `components/sections/ResearchPanel.tsx`
- **Type:** BUSINESS_RULE
- **Location:** FRONTEND
- **Code:**
  ```ts
  {content.demand === 'low' && content.alternatives && content.alternatives.length > 0 && (...)}
  ```
- **Description:** Conditional card render
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Backend should include `showAlternatives` boolean

### Entry 82 — Score Color Mapping
- **File:** `components/sections/SEOPanel.tsx`
- **Type:** CALCULATION
- **Location:** FRONTEND
- **Code:** `if (s >= 70) return 'bg-green-600'; if (s >= 40) return 'bg-amber-600'; return 'bg-red-600'`
- **Description:** Quality band colour mapping
- **Category:** BUSINESS_LOGIC
- **Violation:** **YES** — Thresholds should come from backend as `qualityBand` enum

---

## Summary Table

| # | Violation Type | Count | Severity |
|----|---|---|---|
| Duplication | 20 | HIGH |
| Frontend Business Logic | 15 | CRITICAL |
| Validation Asymmetry | 4 | CRITICAL |
| In-Memory State | 1 | CRITICAL |
| **TOTAL VIOLATIONS** | **40** | — |

**VERDICT: BLOCK for production**

The most critical issues are:
1. **In-memory rate limiter** — provides zero protection in serverless
2. **Schedule buffer mismatch** — accepts posts with conflicting timing constraints
3. **Pipeline orchestration in browser** — business rules invisible to backend
4. **Topic validation only on frontend** — backend accepts 1-char topics
