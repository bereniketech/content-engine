# TASK-002 — Supabase Schema & Auth

## Session Bootstrap
Skills needed: code-writing-software-development, security-review

## Objective
Create Supabase tables (`sessions`, `content_assets`), RLS policies, and the auth flow (sign up, log in, protected routes via middleware).

## Implementation Steps
1. In Supabase dashboard, create `sessions` table:
   - `id` uuid PK default `gen_random_uuid()`
   - `user_id` uuid FK → `auth.users(id)` ON DELETE CASCADE
   - `input_type` text CHECK IN ('topic','upload')
   - `input_data` jsonb
   - `created_at` timestamptz default `now()`
2. Create `content_assets` table:
   - `id` uuid PK default `gen_random_uuid()`
   - `session_id` uuid FK → `sessions(id)` ON DELETE CASCADE
   - `asset_type` text
   - `content` jsonb
   - `version` int default 1
   - `created_at` timestamptz default `now()`
3. Enable RLS on both tables
4. Add RLS policies:
   - `sessions`: `USING (user_id = auth.uid())`
   - `content_assets`: `USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()))`
5. Create `/app/(auth)/login/page.tsx` with email+password Supabase Auth sign-in
6. Create `/app/(auth)/signup/page.tsx` with email+password Supabase Auth sign-up
7. Create `/middleware.ts` at project root — redirect unauthenticated users from `/dashboard/*` to `/login`
8. Test: verify session persists on refresh using `supabase.auth.getSession()`

## Acceptance Criteria
- `sessions` and `content_assets` tables created with correct columns and FK constraints
- RLS policies: users can only SELECT/INSERT/UPDATE their own rows
- `/app/(auth)/login/page.tsx` and `/app/(auth)/signup/page.tsx` functional
- Unauthenticated access to `/dashboard` redirects to `/login`
- Supabase Auth session persists across page refreshes

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [x]
- Next task: task-003.md
- Notes: Added Supabase SSR auth helpers, implemented login/signup pages, created dashboard session persistence check using supabase.auth.getSession(), added route-protecting middleware for /dashboard/*, and added SQL migration for sessions/content_assets tables with FK constraints and RLS select/insert/update ownership policies.
