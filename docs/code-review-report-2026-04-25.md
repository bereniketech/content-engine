# Code Review Report: content-engine

**Reviewer:** AI Code Review Agent  
**Date:** 2026-04-25  
**Scope:** Full codebase — logic placement, separation of concerns, modularity, duplication  
**Branch:** main

---

## Executive Summary

The codebase is a Next.js 14 App Router monolith with no separate backend process — all API logic lives in `/app/api/` route handlers. The overall architecture is sound, but there are **significant violations of separation of concerns**, **pervasive logic duplication**, and **validation asymmetry** between frontend and backend.

The most critical issues are:
- Pipeline orchestration running entirely in the browser
- Social normalization logic duplicated across three locations
- Business constants scattered with no single source of truth
- Backend validation that is weaker than frontend validation in four cases

---

## Section 1: Correctly Placed Logic

These areas correctly isolate logic in API routes or shared `lib/` modules.

| Area | Location | Notes |
|---|---|---|
| Session resolution | `lib/session-assets.ts` `resolveSessionId` | Backend-only; falls back to session creation |
| Input sanitization | `lib/sanitize.ts` | Backend-only; every route calls this |
| Assessment normalization | `app/api/data-driven/assess/route.ts` `normalizeAssessmentResult` | Backend enforces structure |
| SEO/GEO normalization | `app/api/data-driven/seo-geo/route.ts` `normalizeSeoGeoResult` | Deep validation, all backend |
| SEO score clamping | `app/api/data-driven/seo-geo/route.ts` line 174 | `Math.max(0, Math.min(100, ...))` — backend only |
| Research error classification | `app/api/data-driven/research/route.ts` `classifyResearchError` | Maps errors to HTTP status codes |
| Publish idempotency | `app/api/publish/` `checkAlreadyPublished` | Consistent across all publish routes |
| Analytics delta computation | `lib/analytics/delta.ts` | Backend cron, not client |
| Rate limiting | `middleware.ts` | Middleware layer (with caveats — see Section 2) |
| Shared asset utilities | `lib/session-assets.ts` `getLatestAssetByType`, `mapAssetRowToContentAsset` | Canonical shared module exists |

---

## Section 2: Redundant or Misplaced Logic

### 2.1 Pipeline Orchestration in the Browser — Critical

**Locations:**
- `app/dashboard/data-driven/page.tsx` lines 210–481
- `lib/data-driven-pipeline.ts` lines 57–155

**Description:**  
The entire data-driven pipeline — which steps run, in which order, whether the research step is included, which assets are deleted on regeneration — is orchestrated by the frontend page component. Specific violations:

- `mode` derivation (`"topic"` vs `"data"`) is computed on the client from `inputData.topic` (line 213). The backend receives this result rather than computing it.
- `buildRestoredPipelineState()` reconstructs which pipeline steps completed by reading stored Supabase asset types — this restoration logic only lives in `lib/data-driven-pipeline.ts` (frontend-only).
- The decision to include or skip the research step (`buildStepKeys("data", false)` vs with research) is made at lines 291–297 based on `assessData.sufficient`. The backend returns the boolean; the client applies it.
- `getDownstreamAssetTypesForRegenerate()` (lines 141–155 in `lib/data-driven-pipeline.ts`) — the cascade dependency graph (what to delete when regenerating a step) is a hardcoded frontend-only data structure.
- Distribution step fires three parallel API calls (lines 455–481) and assembles results client-side with no server-side coordination.

**Impact:**  
If the page is refreshed or a different client connects, pipeline state is reconstructed from asset presence alone using frontend-only rules. Any divergence between stored assets and the frontend's expectations will silently produce wrong pipeline state. Business rules about step ordering and asset cascade are invisible to the backend.

**Recommendation:**  
Introduce a `/api/pipeline/state` endpoint that accepts `sessionId` and returns the current pipeline state (which steps are complete, which is active, what the mode is). Move `buildRestoredPipelineState`, `buildStepKeys`, and `getDownstreamAssetTypesForRegenerate` into a backend service. The frontend should only render what the server returns.

---

### 2.2 Social Platform Normalization — Three Copies

**Locations:**

| Copy | File | Function |
|---|---|---|
| 1 | `components/sections/SocialPanel.tsx` lines 140–203 | `normalizePlatformData` |
| 2 | `app/api/social/route.ts` | `normalizeSocialOutput` |
| 3 | `app/api/social/regenerate/route.ts` | `normalizePlatformOutput` |

**Description:**  
Three near-identical implementations normalize raw AI output into typed per-platform social content objects. All three handle the same platforms (`linkedin`, `x`, `instagram`, `reddit`, `medium`, `pinterest`), perform the same field extraction, and apply the same fallback logic.

**Impact:**  
Any change to the platform schema requires updating three files. A discrepancy between copies has already emerged: the frontend copy handles `thread` as an array path (`thread.0`) using `setValueAtPath`, while the backend copies use direct object access.

**Recommendation:**  
Extract a single `normalizeSocialPlatformOutput(raw: unknown): SocialContent` function into `lib/social-normalize.ts`. Import it in both API routes. The frontend `SocialPanel` should not normalize — it should receive already-normalized data from the API.

---

### 2.3 Word Count Logic — Four Copies

**Locations:**

| Copy | File | Notes |
|---|---|---|
| 1 | `app/api/blog/route.ts` | Inline |
| 2 | `app/api/data-driven/article/route.ts` line 30–32 | Inline |
| 3 | `app/api/data-driven/multi-format/route.ts` | Inline |
| 4 | `components/sections/BlogPanel.tsx` line 181 | Frontend fallback |

**Description:**  
`text.trim().split(/\s+/).filter(Boolean).length` — four separate declarations of the same one-liner.

**Impact:**  
Copy 4 (frontend) exists as a fallback when the server does not return `wordCount`. If the server always returns `wordCount`, the fallback is dead code. If the server sometimes omits it, the client silently recomputes with potentially different results.

**Recommendation:**  
Add `getWordCount(text: string): number` to `lib/utils.ts`. Import it in all three backend routes. Remove the frontend fallback — the server should always return `wordCount`.

---

### 2.4 `extractJsonPayload` — Five Backend Copies

**Locations:**  
`app/api/data-driven/assess/route.ts`, `seo-geo/route.ts`, `multi-format/route.ts`, `x-campaign/route.ts`, `threads-campaign/route.ts`

**Description:**  
JSON extraction with markdown fence-stripping and brace-depth-tracking is copied verbatim into five route files. The older `/api/seo/route.ts` uses a weaker `JSON.parse` + regex fallback instead, and has already diverged from the robust pattern used in newer routes.

**Impact:**  
Any improvement to the extraction algorithm must be applied to six files. The `seo` route is more brittle than all others as a result of this drift.

**Recommendation:**  
Move to `lib/extract-json.ts` as a single exported `extractJsonPayload(text: string): unknown` function. Replace all inline copies. Upgrade `app/api/seo/route.ts` to use the shared version.

---

### 2.5 `isRecord` and `asStringArray` Type Guards — Pervasive Duplication

**Locations:**  
`components/sections/SocialPanel.tsx` line 49, `app/dashboard/data-driven/page.tsx` line 83, plus every data-driven and social API route (6+ files).

**Description:**  
`isRecord(v: unknown): v is Record<string, unknown>` and `asStringArray(v: unknown): string[]` are copy-pasted into every file that touches AI output. There are 8+ copies across the codebase.

**Recommendation:**  
Move to `lib/type-guards.ts`. Import from this shared module in all consumers.

---

### 2.6 Tone Allowlist — Three Declarations

**Locations:**

| Copy | File | Identifier |
|---|---|---|
| 1 | `types/index.ts` | `TOPIC_TONES` |
| 2 | `components/input/TopicForm.tsx` | `toneOptions` (inline array) |
| 3 | `app/api/blog/route.ts` | `VALID_TONES` |

**Description:**  
`["authority", "casual", "storytelling"]` appears three times. `types/index.ts` is the canonical location, but the backend route does not import from it, and `TopicForm.tsx` redeclares it inline.

**Impact:**  
Adding a fourth tone requires three edits. A mismatch between frontend options and backend `VALID_TONES` would silently allow the backend to normalize an invalid tone to `"authority"` with no user-visible error.

**Recommendation:**  
Use `TOPIC_TONES` from `types/index.ts` in all three locations. The backend's `normalizeTone` should import and validate against this constant.

---

### 2.7 `SESSION_ID_UUID_REGEX` — Four Backend Copies

**Locations:**  
`seo-geo/route.ts`, `multi-format/route.ts`, `x-campaign/route.ts`, `threads-campaign/route.ts`

**Description:**  
The same UUID validation regex is copy-pasted verbatim into four route files.

**Recommendation:**  
Export `SESSION_ID_UUID_REGEX` from `lib/session-assets.ts` and import it in all four routes.

---

### 2.8 SSE Chunk Parsing — Two Frontend Copies

**Locations:**  
`app/dashboard/data-driven/page.tsx` lines 143–162 (`parseSseChunk`)  
`components/sections/BlogPanel.tsx` lines 52–71 (`parseSSEChunk`)

**Description:**  
Functionally identical SSE buffer parsers — one is camelCase, one PascalCase, indicating they were written independently.

**Recommendation:**  
Extract to `lib/sse-parser.ts`. Import in both consumers.

---

### 2.9 `SeoResult` Type Imported from an API Route File

**Locations:**  
Defined in: `app/api/seo/route.ts`  
Imported by: `components/sections/BlogPanel.tsx` and `components/sections/SEOPanel.tsx`

**Description:**  
Frontend components import a type from an API route module, creating a hard compile-time dependency between the presentation layer and a server-side handler file.

**Impact:**  
Any refactor of the API route (e.g., splitting into a service) breaks component imports. The route file cannot be moved to a server-only context without breaking the frontend build.

**Recommendation:**  
Move `SeoResult` and any other shared types to `types/index.ts` or a dedicated `types/seo.ts`. Both the route and the components import from there.

---

### 2.10 Direct Supabase Queries from the Browser — N+1 Pattern

**Location:**  
`app/dashboard/page.tsx` lines 46–120

**Description:**  
The dashboard page fetches sessions then runs a separate `asset_count` query per session in `Promise.all`. This is an N+1 query pattern executed entirely client-side, exposing the Supabase anon key to the browser and bypassing the API layer entirely.

**Impact:**  
Performance degrades linearly as session count grows. No rate limiting or server-side validation applies to these queries. Business logic about what constitutes a valid "session" view is effectively in the browser.

**Recommendation:**  
Add a `GET /api/sessions` route that returns sessions with pre-aggregated asset counts in a single JOIN query. The dashboard page fetches from this endpoint rather than querying Supabase directly.

---

### 2.11 `mapAssetRowToContentAsset` Used Inline in Dashboard

**Locations:**  
`app/dashboard/page.tsx` lines 139–145 — manual inline mapping  
Canonical: `lib/session-assets.ts` `mapAssetRowToContentAsset`

**Description:**  
The canonical shared function exists but the dashboard page implements its own inline mapping instead of importing it.

**Recommendation:**  
Replace the inline mapping with the canonical import from `lib/session-assets.ts`.

---

## Section 3: Validation Asymmetry

Backend validation is weaker than frontend in several cases, meaning any API client can bypass frontend rules entirely.

| Rule | Frontend Enforcement | Backend Enforcement | Gap |
|---|---|---|---|
| Topic minimum length | `TOPIC_MIN_LENGTH = 6` in `TopicForm.tsx` | Only checks non-empty | Backend accepts 1–5 character topics |
| Scheduling minimum time | 5-minute buffer in `ScheduleModal.tsx` | Only checks `> now` | Backend accepts scheduling 1 second ahead |
| Supported file types | `TEXT_FILE_EXTENSIONS = {"txt","md"}` in `lib/data-driven-form.ts` | Accepts any multipart upload | Backend accepts unsupported file types |
| Article improve minimum | None | `MIN_ARTICLE_LENGTH = 101` in `app/api/improve/route.ts` | Frontend sends short articles; backend rejects with no UI warning |

**Recommendation:**  
All validation rules should be authoritative in the backend. Frontend validation is a UX optimization (fail fast), not the source of truth. Backend must enforce the same rules so API clients and automated scripts cannot bypass them.

---

## Section 4: Other Architecture Issues

### 4.1 Rate Limiting is In-Memory

**Location:** `middleware.ts` line 12 — `const rateLimitStore = new Map()`

**Issue:** Does not survive server restarts. Does not work across multiple Node.js instances or Vercel edge replicas. In production, each server instance has its own independent counter, making the limit effectively useless under any meaningful load distribution.

**Recommendation:** Use Redis (already in the project stack) for rate limit counters with TTL-keyed entries. Libraries like `@upstash/ratelimit` integrate directly with Next.js middleware.

---

### 4.2 `PIPELINE_ASSET_TYPES` Mapping Only in Frontend

**Location:** `lib/data-driven-pipeline.ts` lines 23–32

**Issue:** The mapping from pipeline step names to Supabase `asset_type` string values (`dd_article`, `dd_seo_geo`, etc.) exists only in frontend code. The backend uses raw string literals. If an `asset_type` value changes, the backend is updated but the frontend mapping becomes stale silently with no compile-time error.

**Recommendation:** Move to `types/index.ts` or a shared `lib/asset-types.ts` constant. Backend routes import and use it rather than inline string literals.

---

### 4.3 Platform List Inconsistency Across Three Files

**Locations:**  
`app/api/schedule/route.ts` `VALID_PLATFORMS` — includes `newsletter_mailchimp`, `newsletter_sendgrid`  
`lib/prompts/social.ts` — includes `medium`, `pinterest` but not mailchimp/sendgrid variants  
`components/sections/PublishButton.tsx` `endpointMap` — maps both newsletter variants to the same endpoint

**Issue:** Three different files have three different definitions of what "valid platforms" means. Scheduling accepts platforms that the social generator doesn't know about, and vice versa.

**Recommendation:** Define a single `SUPPORTED_PLATFORMS` constant in `types/index.ts`. Derive the schedule allowlist and prompt context from it. The publish endpoint map becomes a function of this constant.

---

### 4.4 `postJson` Helper Redeclared in Page Component

**Location:** `app/dashboard/data-driven/page.tsx` lines 164–178

**Issue:** A `postJson(url, body)` fetch wrapper is defined inside the page component scope. This will be duplicated as the codebase grows.

**Recommendation:** Move to `lib/api-client.ts` and import where needed.

---

## Section 5: Redundant Logic Manifest

| # | Logic | Frontend Location | Backend Location | Impact | Recommended Consolidation |
|---|---|---|---|---|---|
| 1 | Social platform normalization | `SocialPanel.tsx:140-203` | `social/route.ts`, `regenerate/route.ts` | Schema changes require 3 edits; copy drift already observed | Extract to `lib/social-normalize.ts` |
| 2 | Word count | `BlogPanel.tsx:181` | `blog/route.ts`, `article/route.ts`, `multi-format/route.ts` | 4 copies, silent divergence possible | `getWordCount` in `lib/utils.ts` |
| 3 | `extractJsonPayload` | None | 5 route files | One copy already diverged (`seo/route.ts`) | `lib/extract-json.ts` |
| 4 | `isRecord` / `asStringArray` | 2 frontend files | 6+ route files | 8+ copies | `lib/type-guards.ts` |
| 5 | Tone allowlist | `TopicForm.tsx`, `types/index.ts` | `blog/route.ts` | 3 copies; mismatch silently falls back | Use `TOPIC_TONES` from `types/index.ts` everywhere |
| 6 | UUID regex | None | 4 route files | 4 backend copies | Export from `lib/session-assets.ts` |
| 7 | SSE chunk parser | `data-driven/page.tsx`, `BlogPanel.tsx` | None | 2 frontend copies, named differently | `lib/sse-parser.ts` |
| 8 | Pipeline step orchestration | `data-driven/page.tsx`, `lib/data-driven-pipeline.ts` | None | Critical: business rules invisible to backend | Server-side pipeline state endpoint |
| 9 | Asset type string literals | `lib/data-driven-pipeline.ts` `PIPELINE_ASSET_TYPES` | Inline strings in route files | Stale on backend changes | `lib/asset-types.ts` |
| 10 | Platform list | `PublishButton.tsx`, `lib/prompts/social.ts` | `schedule/route.ts` | 3 inconsistent definitions | `SUPPORTED_PLATFORMS` in `types/index.ts` |

---

## Section 6: Priority Recommendations

### P0 — Critical (business logic correctness)

1. **Move pipeline orchestration to a server-side endpoint.**  
   The current design means pipeline rules are enforced exclusively by a browser session — a reload or client bug silently corrupts state. Introduce `GET /api/pipeline/state?sessionId=` and move `buildRestoredPipelineState`, `buildStepKeys`, and `getDownstreamAssetTypesForRegenerate` into backend services.

2. **Align backend validation with frontend rules.**  
   Enforce `TOPIC_MIN_LENGTH`, the 5-minute scheduling buffer, and supported file type restrictions in API routes. Frontend validation should be a UX convenience that duplicates — not replaces — backend rules.

### P1 — High (duplication and maintainability)

3. **Extract `lib/social-normalize.ts`.**  
   Eliminate the 3-copy normalization problem before adding more social platforms. The frontend `SocialPanel` should receive already-normalized data from the API.

4. **Extract `lib/extract-json.ts`.**  
   Five copies with one already diverged. The `seo/route.ts` divergence is the clearest evidence this needs to be a shared utility now.

5. **Move `SeoResult` and API-defined types to `types/index.ts`.**  
   Frontend components must not import from API route files.

### P2 — Medium (consolidation)

6. Centralize `TOPIC_TONES` / `SUPPORTED_PLATFORMS` / `PIPELINE_ASSET_TYPES` in `types/index.ts`.  
7. Extract `lib/type-guards.ts` for `isRecord`, `asStringArray`.  
8. Extract `lib/sse-parser.ts` to eliminate the two independently named SSE parsers.  
9. Add `GET /api/sessions` route; remove direct Supabase client queries from the browser.  

### P3 — Low (cleanup)

10. Move `postJson` to `lib/api-client.ts`.  
11. Replace inline `mapAssetRowToContentAsset` in dashboard with the canonical import from `lib/session-assets.ts`.  
12. Replace in-memory rate limit `Map` with Redis-backed counters.

---

## Section 7: Overall Assessment

| Principle | Status | Notes |
|---|---|---|
| Business logic in backend only | **Partially violated** | Pipeline orchestration and several validation rules are frontend-only |
| Single source of truth per rule | **Violated** | 10 distinct duplication instances catalogued |
| Frontend is presentation-only | **Partially violated** | `SocialPanel` normalizes data; dashboard queries DB directly; data-driven page orchestrates pipeline |
| Modular, shared utilities | **Partially met** | `lib/session-assets.ts` and `lib/sanitize.ts` are good examples; `extractJsonPayload`, word count, type guards, and SSE parsing are not shared |
| Validation parity (frontend ↔ backend) | **Violated in 4 cases** | Backend is more permissive than frontend |

The foundation is solid — the route handler pattern, Supabase integration, and sanitization layer are all correctly structured. Addressing the P0 items (pipeline state endpoint, validation parity) and P1 items (social normalization, JSON extraction, type placement) would close the most significant architectural gaps.
