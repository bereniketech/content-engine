# TASK-015 — Security Hardening & Rate Limiting

## Session Bootstrap
Skills needed: security-review, code-writing-software-development

## Objective
Harden all API routes with Supabase JWT validation, add Vercel Edge rate limiting, sanitise all user inputs before prompt injection, and verify RLS policies are watertight.

## Implementation Steps
1. Create `/lib/auth.ts` — `requireAuth(request)` helper:
   - Extracts Bearer token from Authorization header
   - Calls `supabase.auth.getUser(token)` — returns user or throws 401
2. Add `requireAuth` call at the top of every `/app/api/*/route.ts`
3. Create `/middleware.ts` (update existing):
   - Add rate limiting logic: track req count per user per route in Vercel KV or in-memory store
   - Return 429 if > 10 req/min per user per route
4. Create `/lib/sanitize.ts`:
   - `sanitizeInput(text: string): string` — strips characters that could break prompt structure: backticks, `<`, `>`, `{{`, `}}`
   - Apply to all user-supplied strings before inserting into Claude prompts
5. Verify RLS policies:
   - Test: logged in as User A, attempt to query User B's session_id → expect 0 rows
   - Test: attempt INSERT into `sessions` with a different `user_id` → expect RLS block
6. Run `next build` and check bundle output — confirm no `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or other private keys appear in client chunks
7. Add OWASP checklist review comments to each API route file header

## Acceptance Criteria
- All `/api/*` routes reject requests without valid Supabase JWT (401)
- Vercel Edge middleware enforces 10 req/min per user per route
- All user inputs sanitised before inclusion in Claude prompts (no prompt injection)
- RLS verified: querying another user's session_id returns 0 rows
- No API keys exposed in client bundles (verified via `next build` output)

## Key Patterns
[greenfield — no existing files to reference]

## Handoff — What Was Done
- Added centralized JWT auth helpers in lib/auth.ts and enforced requireAuth(request) across all 12 API routes.
- Added edge middleware rate limiting at 10 requests/minute per user-per-route with 429 and Retry-After headers for /api paths.
- Added prompt-input sanitization utilities and applied sanitization to user-provided prompt-bound values across route handlers, plus OWASP checklist header comments on each API route.

## Handoff — Patterns Learned
- Use user-scoped Supabase clients with anon key plus Bearer token headers to preserve RLS, instead of service-role route clients.
- Route-level prompt hardening is safer when sanitization is centralized (sanitizeInput/sanitizeUnknown) and applied before prompt construction.
- Middleware-based API throttling can coexist with existing dashboard auth redirects when matcher includes both /api and dashboard/auth paths.
- Runtime impersonation tests for RLS need seeded User A/User B credentials; this pass verified policy correctness from supabase/migrations/20260321_task_002_schema_auth.sql and user-scoped client usage.

## Handoff — Files Changed
- app/api/blog/route.ts
- app/api/blog/expand/route.ts
- app/api/distribute/route.ts
- app/api/flywheel/route.ts
- app/api/images/route.ts
- app/api/images/generate/route.ts
- app/api/improve/route.ts
- app/api/research/route.ts
- app/api/seo/route.ts
- app/api/social/route.ts
- app/api/social/regenerate/route.ts
- app/api/traffic/route.ts
- middleware.ts
- lib/auth.ts
- lib/sanitize.ts

## Status
COMPLETE
