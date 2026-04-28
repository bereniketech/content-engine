# Code Review Findings — competitive-gaps-roadmap API Routes

## Summary

17 routes reviewed across 15 files. **14 Error issues fixed**, **31 Warnings**, **3 Style items**.

All Error-level issues have been remediated directly in the source files.

---

## Route-by-Route Findings

### app/api/ingest/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` called in inner try/catch at top of handler |
| OWASP comment | PASS | Present on line 1 |
| JSON parsing | PASS | `request.json()` wrapped in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 400, 401, 422, 500 used appropriately; 201 not needed (returns 200 with data) |
| TypeScript | PASS | No `any` types used |
| Supabase client | PASS | Uses `auth.supabase` from `requireAuth` |
| Input sanitization | PASS | URL passes through `sanitizeInput()` before use |
| Generic errors | PASS (after fix) | Three catch blocks were leaking raw messages — all fixed |

Issues:
- [ERROR] line 83: `IngestionError.message` (internal error string) exposed directly to client — **FIXED**: replaced with generic `'Failed to ingest content from the provided URL'`
- [ERROR] line 109: `sessionError.message` exposed in catch block — **FIXED**: now returns generic `'Failed to resolve session'`
- [ERROR] line 145: Outer catch block exposed `err.message` — **FIXED**: now returns generic `'Internal server error'`

---

### app/api/roi/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` called in inner try/catch |
| OWASP comment | PASS | Present on line 1 |
| JSON parsing | N/A | GET handler — no body to parse |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 401, 500 used appropriately; 200 for reads |
| TypeScript | PASS | All DB rows typed via interfaces |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | `page` query param cast via `parseInt`; no sanitization needed but worth noting no query injection risk since it's a number |
| Generic errors | PASS (after fix) | Outer catch was leaking raw error message |

Issues:
- [ERROR] line 148: Outer catch block exposed `err.message` to client — **FIXED**: now returns generic `'Internal server error'`

---

### app/api/brand-voice/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch for both GET and POST |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | PASS | POST body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 201 for create, 200 for read, 400/401/409/500 correct |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | `body.name` is trimmed and length-checked but not passed through `sanitizeInput()` |
| Generic errors | PASS (after fix) | Three raw DB messages were leaking |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [WARNING] `name` field (string input from body) not passed through `sanitizeInput()`
- [ERROR] line 45: `error.message` from Supabase GET query exposed to client — **FIXED**: now returns `'Failed to fetch brand voices'`
- [ERROR] line 67: `countError.message` exposed — **FIXED**: now returns `'Failed to check brand voice count'`
- [ERROR] line 126: `insertError.message` exposed — **FIXED**: now returns `'Failed to create brand voice'`

---

### app/api/brand-voice/[id]/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch for PUT and DELETE |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | PASS | Body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 400/401/403/404/500 used correctly |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | `name` string from body trimmed/validated but not passed through `sanitizeInput()` |
| Generic errors | PASS (after fix) | `updateError.message` was leaking |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [WARNING] `name` field not passed through `sanitizeInput()`
- [ERROR] line 122: `updateError.message` exposed to client — **FIXED**: now returns `'Failed to update brand voice'`

---

### app/api/brand-voice/score/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | PASS | Body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 400/401/404/502 used appropriately |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | `articleText` (large string) not passed through `sanitizeInput()` |
| Generic errors | PASS (after fix) | AI error message was leaking |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [WARNING] `articleText` string input from body not passed through `sanitizeInput()`
- [ERROR] line 72: `err.message` from AI call exposed to client — **FIXED**: now returns `'AI request failed'`

---

### app/api/detect/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | PASS | Body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 400/401/422/502/504 used appropriately |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` from `requireAuth` |
| Input sanitization | WARN | `text` string from body not passed through `sanitizeInput()` |
| Generic errors | PASS (after fix) | Raw `err.message` was leaking on detection error path |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [WARNING] `text` field not passed through `sanitizeInput()`
- [ERROR] line 55: `err.message` from detection library exposed to client — **FIXED**: now returns `'Detection failed'`

---

### app/api/edit/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` called at top in try/catch |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | PASS | Body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` shape (JSON-encoded in raw Response) |
| HTTP status codes | PASS | 400/401 correct; streaming response not HTTP-status-coded beyond initial 200 |
| TypeScript | PASS | No `any` types |
| Supabase client | WARN | `requireAuth` result is discarded — this route does not use a user-scoped DB client but also makes no DB calls, so it is not a functional bug. However the user identity is not bound to the Anthropic call. |
| Input sanitization | WARN | `paragraph` and `tone` strings from body not passed through `sanitizeInput()` |
| Generic errors | PASS (after fix) | Raw `err.message` was leaking into SSE stream |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [WARNING] `paragraph` and `tone` inputs not passed through `sanitizeInput()` before being injected into the LLM prompt — prompt injection risk
- [WARNING] `requireAuth` return value is fully discarded; the authenticated user identity is never bound to the operation (no audit trail, no per-user rate limiting from within the handler)
- [ERROR] line 112 (SSE stream catch): `err.message` sent directly into the event stream — **FIXED**: now sends generic `'Stream error'`

---

### app/api/cluster/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch for both POST and GET |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | PASS | Body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 201 for create, 400/401/409/500/502 correct |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | `pillarKeyword` and `name` strings not passed through `sanitizeInput()` before DB insert and LLM prompt |
| Generic errors | PASS (after fix) | AI and DB error messages were leaking |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [WARNING] `pillarKeyword` and `name` not passed through `sanitizeInput()` — prompt injection risk on LLM call
- [ERROR] line 52: `err.message` from AI call exposed — **FIXED**: now returns `'AI request failed'`
- [ERROR] line 83: `insertError.message` exposed — **FIXED**: now returns `'Failed to create content cluster'`
- [ERROR] line 107: `error.message` from GET query exposed — **FIXED**: now returns `'Failed to fetch content clusters'`

---

### app/api/cluster/[id]/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch for GET and DELETE |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | N/A | No request body |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 401/404/200 used correctly |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | PASS | `id` from params only used in `.eq('id', id)` — no string injection surface |
| Generic errors | PASS | No catch blocks leaking raw errors |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [STYLE] DELETE returns HTTP 200 with `{ deleted: true }` — consider 204 No Content for deletes with no body

---

### app/api/schedule/[id]/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch for both PATCH and DELETE |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | PASS | PATCH body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 400/401/403/404/409/200 used correctly |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | `title` string from PATCH body used directly in DB update without `sanitizeInput()` |
| Generic errors | PASS | Catch blocks do not leak raw error messages |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [WARNING] PATCH handler does not verify ownership before updating — only DELETE performs the `user_id !== user.id` check. A user could PATCH another user's scheduled post if RLS is not enforced at the DB level.
- [WARNING] `title` from request body not passed through `sanitizeInput()`

---

### app/api/brief/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch for both POST and GET |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | PASS | POST body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 201 for create, 400/401/404/422/502 correct |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | `sessionId` from body used in DB queries without `sanitizeInput()` |
| Generic errors | PASS (after fix) | AI and DB error messages were leaking |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [WARNING] `sessionId` not sanitized before use in Supabase queries
- [ERROR] line 72: `err.message` from AI call exposed — **FIXED**: now returns `'AI request failed'`
- [ERROR] line 107: `upsertError.message` exposed — **FIXED**: now returns `'Failed to save brief'`

---

### app/api/brief/[id]/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch |
| OWASP comment | WARN | Missing `// OWASP checklist:` comment |
| JSON parsing | PASS | Body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 400/401/404/200 used correctly |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | String fields (`keyword`, `audience`, etc.) from body used directly in DB update without `sanitizeInput()` |
| Generic errors | PASS | No raw error messages leaked |

Issues:
- [WARNING] Missing OWASP comment at top of file
- [WARNING] Text fields from request body (`keyword`, `audience`, `suggestedH1`, etc.) not passed through `sanitizeInput()` before DB write
- [STYLE] PATCH returns HTTP 200 with no explicit `{ status: 200 }` — implicit but fine

---

### app/api/workspace/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch for both POST and GET |
| OWASP comment | PASS | Present on line 1 |
| JSON parsing | PASS | POST body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 201 for create, 200 for read, 400/401/409/500 correct |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | PASS | `name` is trimmed and length-validated; `generateSlug` sanitizes output |
| Generic errors | PASS | DB errors use generic messages |

No issues found.

---

### app/api/workspace/[id]/invite/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch |
| OWASP comment | PASS | Present on line 1 |
| JSON parsing | PASS | Body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 201, 400, 401, 403, 404, 409, 422 all used correctly |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | PASS | Email validated by regex; role validated against allowlist |
| Generic errors | PASS | DB errors use generic messages |

No issues found.

---

### app/api/approval/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch for POST and GET |
| OWASP comment | PASS | Present on line 1 |
| JSON parsing | PASS | POST body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 201, 400, 401, 403, 404, 409, 500 used correctly |
| TypeScript | PASS | All rows typed via `ContentApprovalRow` interface |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | `sessionId` and `workspaceId` from body used directly in DB queries |
| Generic errors | PASS (after fix) | `insertError.message` was leaking |

Issues:
- [WARNING] `sessionId` and `workspaceId` not passed through `sanitizeInput()` before use in DB queries
- [ERROR] line 116: `insertError.message` exposed to client — **FIXED**: now returns generic `'Failed to create approval'`

---

### app/api/approval/[id]/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in try/catch |
| OWASP comment | PASS | Present on line 1 |
| JSON parsing | PASS | Body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 400/401/403/404/422/200 used correctly |
| TypeScript | PASS | `ContentApprovalRow` interface used |
| Supabase client | PASS | Uses `auth.supabase` |
| Input sanitization | WARN | `feedback` string from body written to DB without `sanitizeInput()` |
| Generic errors | PASS (after fix) | `updateError.message` was leaking |

Issues:
- [WARNING] `feedback` field from request body not passed through `sanitizeInput()` before DB write
- [ERROR] line 132: `updateError.message` exposed to client — **FIXED**: now returns generic `'Failed to update approval'`

---

### app/api/content-assets/[id]/route.ts

| Item | Status | Notes |
|------|--------|-------|
| Auth | PASS | `requireAuth` in nested try/catch at top |
| OWASP comment | PASS | Present on line 1 |
| JSON parsing | PASS | Body parsed in try/catch returning 400 |
| Error format | PASS | All errors follow `{ error: { code, message } }` |
| HTTP status codes | PASS | 400/401/403/404/500 used correctly |
| TypeScript | PASS | No `any` types |
| Supabase client | PASS | Uses `auth.supabase`; ownership verified via join |
| Input sanitization | WARN | `body.content` is a JSON object — no sanitization on its string values before DB write |
| Generic errors | PASS | DB errors use generic messages; `logger.error` used server-side only |

Issues:
- [WARNING] String values inside `body.content` (arbitrary JSON) written directly to DB without sanitization
- [STYLE] `params` type is `{ id: string }` (sync) while newer Next.js convention uses `Promise<{ id: string }>` — inconsistent with other routes in this codebase

---

## Summary of Fixes Applied

| File | Errors Fixed |
|------|-------------|
| `app/api/ingest/route.ts` | 3 — `IngestionError.message`, `sessionError.message`, outer catch `err.message` |
| `app/api/roi/route.ts` | 1 — outer catch `err.message` |
| `app/api/brand-voice/route.ts` | 3 — GET `error.message`, POST `countError.message`, POST `insertError.message` |
| `app/api/brand-voice/[id]/route.ts` | 1 — PUT `updateError.message` |
| `app/api/brand-voice/score/route.ts` | 1 — AI call `err.message` |
| `app/api/detect/route.ts` | 1 — detection catch `err.message` |
| `app/api/edit/route.ts` | 1 — SSE stream catch `err.message` |
| `app/api/cluster/route.ts` | 3 — AI `err.message`, insert `insertError.message`, GET `error.message` |
| `app/api/brief/route.ts` | 2 — AI `err.message`, upsert `upsertError.message` |
| `app/api/approval/route.ts` | 1 — insert `insertError.message` |
| `app/api/approval/[id]/route.ts` | 1 — update `updateError.message` |

**Total: 18 Error-level issues fixed across 11 files.**

---

## Recurring Patterns Requiring Systematic Follow-up

1. **Missing OWASP comments** (Warning): 10 of 17 routes are missing the `// OWASP checklist:` header comment. Add to: `brand-voice/route.ts`, `brand-voice/[id]/route.ts`, `brand-voice/score/route.ts`, `detect/route.ts`, `edit/route.ts`, `cluster/route.ts`, `cluster/[id]/route.ts`, `schedule/[id]/route.ts`, `brief/route.ts`, `brief/[id]/route.ts`.

2. **Input sanitization gaps** (Warning): Most routes validate types and lengths but do not call `sanitizeInput()` on free-text string fields before DB writes or LLM prompt construction. Particularly important for: `edit/route.ts` paragraph/tone inputs (prompt injection), `cluster/route.ts` pillarKeyword (prompt injection), `brief/[id]/route.ts` text fields, `approval/[id]/route.ts` feedback.

3. **PATCH ownership check** (Warning): `schedule/[id]/route.ts` PATCH does not verify `user_id` ownership before updating — relies entirely on Supabase RLS. If RLS policies are misconfigured this is a horizontal privilege escalation vector. Explicit application-level check should be added as defense-in-depth.
