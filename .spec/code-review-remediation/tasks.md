# Implementation Plan: Code Review Remediation

---

- [ ] 1. Extract `extractJsonPayload` to `lib/extract-json.ts`
  - Create `lib/extract-json.ts` exporting one `extractJsonPayload(raw: string): unknown` function
    (body copied verbatim from `app/api/data-driven/assess/route.ts:27–65`).
  - Write `lib/__tests__/extract-json.test.ts` covering: plain JSON, fenced JSON block,
    bare object extraction, throws on unparseable input.
  - Remove the local `extractJsonPayload` declaration from each of the 10 route files:
    `assess`, `multi-format`, `research`, `seo-geo`, `threads-campaign`, `x-campaign`,
    `distribute`, `flywheel`, `images`, `improve`.
  - Add `import { extractJsonPayload } from '@/lib/extract-json'` to each of the 10 routes.
  - Run `bun run type-check` — zero errors.
  - _Requirements: 3.1, 3.2, 3.3_
  - _Skills: .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** `grep -r "function extractJsonPayload" app/` returns zero results. `bun test lib/__tests__/extract-json.test.ts` passes.

---

- [ ] 2. Create `lib/type-guards.ts` (`isRecord`, `asStringArray`)
  - Create `lib/type-guards.ts` that re-exports `isRecord` from `lib/session-assets.ts`
    and declares `asStringArray` (body from `app/api/data-driven/assess/route.ts:16–25`).
  - Write `lib/__tests__/type-guards.test.ts` covering all branches.
  - Remove local `isRecord` declarations from: `multi-format/route.ts`, `research/route.ts`,
    and any other route files that declare it locally.
  - Remove local `asStringArray` declarations from: `assess/route.ts`, `research/route.ts`,
    `social/regenerate/route.ts`.
  - Add `import { isRecord, asStringArray } from '@/lib/type-guards'` to each affected route.
  - Run `bun run type-check` — zero errors.
  - _Requirements: 4.1, 4.2, 4.3_
  - _Skills: .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** `grep -r "function isRecord\|function asStringArray" app/` returns zero results. `bun test lib/__tests__/type-guards.test.ts` passes.

---

- [ ] 3. Move `SeoResult` interface to `types/index.ts`
  - Add `SeoResult` interface (from `app/api/seo/route.ts:10–30`) to `types/index.ts`.
  - Remove the `export interface SeoResult` declaration from `app/api/seo/route.ts`.
  - Add `import type { SeoResult } from '@/types'` to `app/api/seo/route.ts`.
  - Search for any component importing `SeoResult` from `app/api/seo/route.ts` and update
    those imports to `@/types`.
  - Run `bun run type-check` — zero errors.
  - _Requirements: 5.1, 5.2, 5.3_
  - _Skills: .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** `grep -r "from.*app/api/seo/route" src/ app/ components/` returns zero results. `bun run type-check` passes.

---

- [ ] 4. Export `getWordCount` from `lib/utils.ts`
  - Add `export function getWordCount(text: string): number { return text.trim().split(/\s+/).filter(Boolean).length }` to `lib/utils.ts`.
  - Write `lib/__tests__/utils.test.ts` with test cases for empty string, single word,
    multi-word, and excessive whitespace.
  - Remove local `getWordCount` from `app/api/data-driven/article/route.ts`
    and `app/api/data-driven/multi-format/route.ts`.
  - Replace inline `fullMarkdown.trim().split(/\s+/).filter(Boolean).length` in
    `app/api/blog/route.ts` (lines 124 and 143) with `getWordCount(fullMarkdown)`.
  - Add `import { getWordCount } from '@/lib/utils'` to all three files.
  - Run `bun run type-check` — zero errors.
  - _Requirements: 6.1, 6.2, 6.3_
  - _Skills: .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** `grep -rn "function getWordCount" app/` returns zero results. `bun test lib/__tests__/utils.test.ts` passes.

---

- [ ] 5. Export `SESSION_ID_UUID_REGEX` from `lib/session-assets.ts`
  - Add `export const SESSION_ID_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` to `lib/session-assets.ts`.
  - Remove local `SESSION_ID_UUID_REGEX` const declarations from:
    `multi-format/route.ts`, `seo-geo/route.ts`, `threads-campaign/route.ts`,
    `x-campaign/route.ts`, and any other route with a local copy.
  - Add `import { SESSION_ID_UUID_REGEX } from '@/lib/session-assets'` to each.
  - Run `bun run type-check` — zero errors.
  - _Requirements: 7.1, 7.2, 7.3_
  - _Skills: .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** `grep -rn "SESSION_ID_UUID_REGEX\s*=" app/` returns zero results. `bun run type-check` passes.

---

- [ ] 6. Create `lib/sse-parser.ts`
  - Create `lib/sse-parser.ts` exporting `parseSseEvents(body: string): StreamEvent[]`
    (logic from `app/dashboard/data-driven/page.tsx:140–163`).
  - Write `lib/__tests__/sse-parser.test.ts`.
  - Replace the two inline SSE parsing implementations (in page.tsx and any other consumer)
    with `import { parseSseEvents } from '@/lib/sse-parser'`.
  - Run `bun run type-check` — zero errors.
  - _Requirements: 8.1, 8.2_
  - _Skills: .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** `bun test lib/__tests__/sse-parser.test.ts` passes. `bun run type-check` passes.

---

- [ ] 7. Create `lib/validation.ts` and fix validation asymmetry
  - Create `lib/validation.ts` exporting `VALIDATION_CONSTANTS` with keys:
    `MIN_SOURCE_TEXT_LENGTH` (10), `MIN_ARTICLE_IMPROVE_LENGTH` (101),
    `SCHEDULING_BUFFER_HOURS` (1), `ALLOWED_FILE_EXTENSIONS`, `ALLOWED_MIME_TYPES`.
  - Update `lib/data-driven-form.ts` to import `VALIDATION_CONSTANTS` from `lib/validation.ts`
    and use `VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH` in the validation function.
  - Update `app/api/data-driven/assess/route.ts`: replace `MIN_SOURCE_TEXT_LENGTH = 1`
    with `import { VALIDATION_CONSTANTS } from '@/lib/validation'` and use
    `VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH`.
  - Update `app/api/improve/route.ts`: replace `MIN_ARTICLE_LENGTH = 101` constant with
    `VALIDATION_CONSTANTS.MIN_ARTICLE_IMPROVE_LENGTH`.
  - Write `lib/__tests__/validation.test.ts` asserting constants are correct values.
  - Run `bun run type-check` — zero errors.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Skills: .kit/skills/development/code-writing-software-development/SKILL.md, .kit/skills/testing-quality/security-review/SKILL.md_
  - **AC:** Frontend and backend import `MIN_SOURCE_TEXT_LENGTH` from same file. `bun test lib/__tests__/validation.test.ts` passes.

---

- [ ] 8. Create `GET /api/sessions` to remove dashboard N+1
  - Create `app/api/sessions/route.ts` with a `GET` handler that calls `requireAuth`,
    queries Supabase `content_sessions` with a left join on `content_assets` for the
    authenticated user, and returns `SessionsResponse`.
  - Support optional `?id=` query param to return a single session.
  - Write `app/api/sessions/route.test.ts` covering: unauthenticated → 401; valid user →
    200 with sessions array; `?id=` filter returns one session.
  - Remove direct `supabase.from('content_sessions')` calls from the dashboard page and
    replace with a `fetch('/api/sessions')` call.
  - _Requirements: 9.1, 9.2, 9.3_
  - _Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md, .kit/skills/development/code-writing-software-development/SKILL.md_
  - **AC:** `bun test app/api/sessions/route.test.ts` passes. Dashboard page contains no `supabase.from('content_sessions')`. `bun run type-check` passes.

---

- [ ] 9. Create `GET /api/pipeline/state` to move P0 state server-side
  - Create `app/api/pipeline/state/route.ts` with a `GET` handler that reads pipeline step
    state from `content_assets` for the given `?sessionId=` parameter.
  - Validate `sessionId` with `SESSION_ID_UUID_REGEX` (imported from `lib/session-assets.ts`).
  - Returns `PipelineStateResponse` mapping asset types to step statuses.
  - Write `app/api/pipeline/state/route.test.ts` covering: missing sessionId → 400;
    invalid UUID → 400; unknown session → 404; valid → 200 with step map.
  - Update `app/dashboard/data-driven/page.tsx` to initialize step state from
    `GET /api/pipeline/state` on mount instead of deriving it from `useSessionContext`.
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Skills: .kit/skills/development/code-writing-software-development/SKILL.md, .kit/skills/data-backend/postgres-patterns/SKILL.md_
  - **AC:** `bun test app/api/pipeline/state/route.test.ts` passes. Dashboard `page.tsx` has no Supabase imports. `bun run type-check` passes.

---

- [ ] 10. Create `lib/api-client.ts` and remove `postJson` from page
  - Create `lib/api-client.ts` exporting `postJson<TResponse>(url: string, body: Record<string, unknown>): Promise<TResponse>` (implementation from `app/dashboard/data-driven/page.tsx:164–175`).
  - Remove the local `postJson` function declaration from `app/dashboard/data-driven/page.tsx`.
  - Add `import { postJson } from '@/lib/api-client'` to the page.
  - Run `bun run type-check` — zero errors.
  - _Requirements: 10.1, 10.2_
  - _Skills: .kit/skills/development/build-website-web-app/SKILL.md_
  - **AC:** `grep -n "function postJson" app/dashboard/data-driven/page.tsx` returns zero results. `bun run type-check` passes.
