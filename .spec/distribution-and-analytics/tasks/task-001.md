---
task: "001"
feature: distribution-and-analytics
status: COMPLETE
model: haiku
supervisor: software-cto
agent: database-architect
depends_on: []
---

# Task 001: DB Migration — distribution_logs + scheduled_posts

## Skills
- .kit/skills/data-backend/database-migrations/SKILL.md

## Agents
- @database-architect

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create a Supabase SQL migration file that adds the `distribution_logs` and `scheduled_posts` tables with indexes, check constraints, and RLS policies scoped to `auth.uid()`.

---

## Files
### Create
| File | Purpose |
|---|---|
| `supabase/migrations/20260420_distribution_and_analytics_001.sql` | New migration: distribution_logs + scheduled_posts tables |

### Modify
| File | What to change |
|---|---|
| — | No existing files modified |

---

## Dependencies
```bash
# No new npm packages needed.

# Env vars: none needed for this task (Supabase migration only)
```

---

## API Contracts
No API routes in this task. Pure SQL migration.

---

## Code Templates

```sql
-- Migration: distribution_logs + scheduled_posts
-- Feature: distribution-and-analytics / task-001

-- distribution_logs: records every platform publish attempt
CREATE TABLE IF NOT EXISTS public.distribution_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform     text        NOT NULL,
  status       text        NOT NULL CHECK (status IN ('published', 'failed')),
  external_id  text,
  metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  error_details text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS distribution_logs_session_platform_idx
  ON public.distribution_logs (session_id, platform);

CREATE INDEX IF NOT EXISTS distribution_logs_user_id_idx
  ON public.distribution_logs (user_id);

ALTER TABLE public.distribution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS distribution_logs_select_own ON public.distribution_logs;
DROP POLICY IF EXISTS distribution_logs_insert_own ON public.distribution_logs;

CREATE POLICY distribution_logs_select_own
  ON public.distribution_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY distribution_logs_insert_own
  ON public.distribution_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- scheduled_posts: queued future publishes
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform         text        NOT NULL,
  asset_type       text        NOT NULL,
  content_snapshot jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status           text        NOT NULL DEFAULT 'queued'
                               CHECK (status IN ('queued', 'published', 'failed', 'cancelled')),
  publish_at       timestamptz NOT NULL,
  published_at     timestamptz,
  external_id      text,
  error_details    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_posts_status_publish_at_idx
  ON public.scheduled_posts (status, publish_at);

CREATE INDEX IF NOT EXISTS scheduled_posts_user_id_idx
  ON public.scheduled_posts (user_id);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scheduled_posts_select_own ON public.scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_insert_own ON public.scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_update_own ON public.scheduled_posts;

CREATE POLICY scheduled_posts_select_own
  ON public.scheduled_posts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY scheduled_posts_insert_own
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY scheduled_posts_update_own
  ON public.scheduled_posts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## Codebase Context

### Key Code Snippets

Existing migration pattern (from `supabase/migrations/20260321_task_002_schema_auth.sql`):
```sql
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ...
);
alter table public.sessions enable row level security;
create policy sessions_select_own on public.sessions for select using (user_id = auth.uid());
```

Existing tables already in DB:
- `public.sessions` (id uuid PK, user_id, input_type, input_data jsonb, created_at)
- `public.content_assets` (id uuid PK, session_id FK → sessions, asset_type, content jsonb, version, created_at)

### Key Patterns in Use
- All tables use `gen_random_uuid()` as primary key
- All user-owned tables have `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- RLS always uses `user_id = auth.uid()`
- `DROP POLICY IF EXISTS` before `CREATE POLICY` for idempotency
- Migration files named `YYYYMMDD_description.sql`

---

## Implementation Steps
1. `supabase/migrations/20260420_distribution_and_analytics_001.sql` — paste the full SQL from Code Templates above exactly as written.

---

## Test Cases
Manual verification steps (no Jest tests for SQL migrations):

```
1. Run: npx supabase db push  OR  apply migration in Supabase dashboard
2. In Supabase Table Editor, confirm:
   - Table `distribution_logs` exists with columns: id, session_id, user_id, platform, status, external_id, metadata, error_details, created_at
   - Table `scheduled_posts` exists with columns: id, session_id, user_id, platform, asset_type, content_snapshot, status, publish_at, published_at, external_id, error_details, created_at
3. Confirm indexes exist via: SELECT indexname FROM pg_indexes WHERE tablename IN ('distribution_logs','scheduled_posts');
4. Confirm RLS enabled via: SELECT relrowsecurity FROM pg_class WHERE relname IN ('distribution_logs','scheduled_posts');
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `distribution_logs` already has a `(session_id, platform)` unique constraint needed | Do NOT add unique constraint here — idempotency enforced at application layer in task-003 |
| Migration needs to be re-run | All CREATE TABLE use `IF NOT EXISTS`; all DROP POLICY use `IF EXISTS` — safe to re-run |

---

## Acceptance Criteria
- [ ] WHEN migration file is applied, THEN `distribution_logs` table exists with all 9 columns
- [ ] WHEN migration file is applied, THEN `scheduled_posts` table exists with all 12 columns
- [ ] WHEN a user queries `distribution_logs` without a matching `user_id`, THEN RLS returns 0 rows
- [ ] WHEN `status` value other than 'published' or 'failed' is inserted into `distribution_logs`, THEN Postgres rejects with check constraint violation
- [ ] WHEN `status` value other than 'queued', 'published', 'failed', 'cancelled' is inserted into `scheduled_posts`, THEN Postgres rejects

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-002 creates `analytics_snapshots` and `refresh_triggers` tables — same migration pattern
**Open questions:** _(fill via /task-handoff)_
