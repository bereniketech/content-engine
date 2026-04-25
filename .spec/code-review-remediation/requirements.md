# Requirements: Code Review Remediation

## Introduction

The content-engine codebase has been audited and 10 instances of code duplication,
validation asymmetries, and architectural issues were identified in the 2026-04-25 code
review. This remediation addresses all findings ordered by priority (P0 → P1 → P2 → P3),
producing a codebase where shared logic lives in single canonical locations, validation is
symmetric between frontend and backend, and heavy operations no longer run in the browser.

---

## Requirements

### Requirement 1: Pipeline State Moved to Server (P0)

**User Story:** As a backend engineer, I want pipeline orchestration state to live on the
server, so that browser refreshes do not lose state and the UI remains a thin presentation
layer.

#### Acceptance Criteria

1. WHEN a client POSTs to `/api/pipeline/state` THEN the server SHALL return the current
   pipeline state (step statuses, asset IDs) for the given session.
2. WHEN the data-driven dashboard page mounts THEN it SHALL fetch pipeline state from
   `/api/pipeline/state` rather than deriving it from `useSessionContext` in the browser.
3. WHEN `app/dashboard/data-driven/page.tsx` is inspected THEN it SHALL contain no direct
   `supabase.from(...)` calls — all DB reads SHALL go through the new API route.
4. WHEN `lib/data-driven-pipeline.ts` contains pipeline orchestration logic THEN that logic
   SHALL be callable from the server route, not duplicated in the page component.

---

### Requirement 2: Validation Symmetry — Backend Equals or Exceeds Frontend (P0)

**User Story:** As a security engineer, I want backend validation to be at least as strict
as frontend validation, so that bypassing the UI does not allow invalid data to reach the
database or LLM.

#### Acceptance Criteria

1. WHEN the backend `assess` route receives a `sourceText` shorter than the frontend
   minimum (currently 1 char — backend must match or tighten to a meaningful minimum)
   THEN the server SHALL return HTTP 422.
2. WHEN the backend `improve` route receives an article shorter than `MIN_ARTICLE_LENGTH`
   (101 chars) THEN it SHALL return HTTP 422 — this is already present and SHALL remain.
3. WHEN a scheduling request arrives without the required buffer period THEN the backend
   SHALL validate the scheduling buffer and return HTTP 422 if violated.
4. WHEN a file-upload request arrives with a disallowed MIME type or extension THEN the
   backend SHALL reject it with HTTP 422.
5. The system SHALL export a `VALIDATION_CONSTANTS` object from `lib/validation.ts` so that
   both frontend and backend import limits from the same source.

---

### Requirement 3: Single `extractJsonPayload` in `lib/extract-json.ts` (P1)

**User Story:** As a developer, I want a single canonical `extractJsonPayload` function,
so that bug fixes and improvements propagate to all API routes automatically.

#### Acceptance Criteria

1. WHEN `lib/extract-json.ts` is created THEN it SHALL export one `extractJsonPayload`
   function identical in behaviour to the existing copies.
2. WHEN all API routes that currently declare a local `extractJsonPayload` are updated THEN
   each SHALL import from `lib/extract-json.ts` and the local declaration SHALL be removed.
3. WHEN `grep -r "function extractJsonPayload"` is run on the project THEN it SHALL return
   zero results (all local copies removed).

---

### Requirement 4: Single `isRecord` / `asStringArray` in `lib/type-guards.ts` (P1)

**User Story:** As a developer, I want type-guard utilities in one file, so that they can
be unit-tested once and reused everywhere.

#### Acceptance Criteria

1. WHEN `lib/type-guards.ts` is created THEN it SHALL export `isRecord`, `asStringArray`,
   and re-export `isRecord` from `lib/session-assets.ts` (or vice versa — one canonical
   location for both).
2. WHEN all files that declare local `isRecord` or `asStringArray` are updated THEN the
   local declarations SHALL be removed and replaced with imports from `lib/type-guards.ts`.
3. WHEN `grep -r "function isRecord\|function asStringArray"` is run THEN it SHALL return
   zero results outside of `lib/type-guards.ts` and `lib/session-assets.ts`.

---

### Requirement 5: `SeoResult` type moved to `types/index.ts` (P1)

**User Story:** As a frontend developer, I want `SeoResult` in the shared types file, so
that both API routes and UI components import from one authoritative source.

#### Acceptance Criteria

1. WHEN `types/index.ts` is updated THEN it SHALL export the `SeoResult` interface.
2. WHEN `app/api/seo/route.ts` is updated THEN the `SeoResult` interface declaration SHALL
   be removed and replaced with an import from `@/types`.
3. WHEN any component that imports `SeoResult` from `app/api/seo/route.ts` is updated THEN
   it SHALL import from `@/types` instead.

---

### Requirement 6: Single `getWordCount` in `lib/utils.ts` (P2)

**User Story:** As a developer, I want word-count logic in one place, so that the counting
algorithm is consistent across blog and data-driven article routes.

#### Acceptance Criteria

1. WHEN `lib/utils.ts` is updated THEN it SHALL export a `getWordCount(text: string): number`
   function.
2. WHEN `app/api/data-driven/article/route.ts`, `app/api/data-driven/multi-format/route.ts`,
   and `app/api/blog/route.ts` are updated THEN they SHALL import `getWordCount` from
   `lib/utils.ts` and the local declarations SHALL be removed.
3. WHEN `grep -r "function getWordCount\|\.split.*filter.*length"` is run on route files
   THEN it SHALL return zero results.

---

### Requirement 7: `UUID_SESSION_REGEX` exported from `lib/session-assets.ts` (P2)

**User Story:** As a developer, I want UUID validation in one place, so that all routes
use the same regex and a single change updates all validation.

#### Acceptance Criteria

1. WHEN `lib/session-assets.ts` is updated THEN it SHALL export `SESSION_ID_UUID_REGEX`.
2. WHEN all data-driven API routes that declare a local `SESSION_ID_UUID_REGEX` constant
   are updated THEN they SHALL import it from `lib/session-assets.ts`.
3. WHEN `grep -r "SESSION_ID_UUID_REGEX\s*=" ` is run on API route files THEN it SHALL
   return zero results (all local declarations removed).

---

### Requirement 8: Single SSE chunk parser in `lib/sse-parser.ts` (P2)

**User Story:** As a developer, I want SSE parsing in one utility, so that the parsing
logic is testable and consistent across all frontend consumers.

#### Acceptance Criteria

1. WHEN `lib/sse-parser.ts` is created THEN it SHALL export a `parseSseEvents` function.
2. WHEN the two frontend files that currently contain inline SSE parsing logic are updated
   THEN they SHALL use `parseSseEvents` from `lib/sse-parser.ts`.

---

### Requirement 9: `GET /api/sessions` endpoint to remove dashboard N+1 (P2)

**User Story:** As a developer, I want a `GET /api/sessions` endpoint, so that the
dashboard fetches session data in a single query rather than making N direct Supabase
calls from the browser.

#### Acceptance Criteria

1. WHEN `GET /api/sessions` is called with valid auth THEN it SHALL return the authenticated
   user's sessions with their associated assets in a single Supabase query.
2. WHEN `GET /api/sessions?id={sessionId}` is called THEN it SHALL return the single
   session matching that ID.
3. WHEN the dashboard component is updated THEN it SHALL fetch from `/api/sessions` and
   SHALL contain no direct `supabase.from('content_sessions')` calls.

---

### Requirement 10: `postJson` helper in `lib/api-client.ts` (P3)

**User Story:** As a frontend developer, I want `postJson` in a shared utility, so that
error-handling improvements propagate to all pages automatically.

#### Acceptance Criteria

1. WHEN `lib/api-client.ts` is created THEN it SHALL export the `postJson<TResponse>`
   generic helper.
2. WHEN `app/dashboard/data-driven/page.tsx` is updated THEN the local `postJson`
   declaration SHALL be removed and replaced with an import from `lib/api-client.ts`.
