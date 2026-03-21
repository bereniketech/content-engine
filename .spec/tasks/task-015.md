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

## Handoff
- Completed: [ ]
- Next task: task-016.md
- Notes: ___
