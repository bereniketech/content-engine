---
task: "002"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: database-architect
depends_on: ["001"]
---

# Task 002: DB Migration — analytics_snapshots + refresh_triggers

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
Create a Supabase SQL migration file that adds the `analytics_snapshots` and `refresh_triggers` tables, including a unique partial index on `refresh_triggers` to prevent duplicate pending triggers.

---

## Files
### Create
| File | Purpose |
|---|---|
| `supabase/migrations/20260420_distribution_and_analytics_002.sql` | New migration: analytics_snapshots + refresh_triggers |

### Modify
| File | What to change |
|---|---|
| — | No existing files modified |

---

## Dependencies
```bash
# No new npm packages.
# Env vars: none needed for this task.
```

---

## Code Templates

```sql
-- Migration: analytics_snapshots + refresh_triggers
-- Feature: distribution-and-analytics / task-002

-- analytics_snapshots: cached GA4 / Search Console responses
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source     text        NOT NULL CHECK (source IN ('ga4', 'search_console')),
  data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_snapshots_user_source_fetched_idx
  ON public.analytics_snapshots (user_id, source, fetched_at DESC);

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_snapshots_select_own ON public.analytics_snapshots;
DROP POLICY IF EXISTS analytics_snapshots_insert_own ON public.analytics_snapshots;

CREATE POLICY analytics_snapshots_select_own
  ON public.analytics_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY analytics_snapshots_insert_own
  ON public.analytics_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- refresh_triggers: detected ranking drops that need content refresh
CREATE TABLE IF NOT EXISTS public.refresh_triggers (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id     uuid        REFERENCES public.sessions(id) ON DELETE SET NULL,
  query          text        NOT NULL,
  old_rank       numeric,
  new_rank       numeric,
  trigger_reason text        NOT NULL DEFAULT 'ranking_drop',
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'resolved')),
  resolved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_triggers_user_status_idx
  ON public.refresh_triggers (user_id, status);

-- Unique partial index: prevent duplicate pending triggers for same query+session
CREATE UNIQUE INDEX IF NOT EXISTS refresh_triggers_pending_unique_idx
  ON public.refresh_triggers (session_id, query)
  WHERE status = 'pending';

ALTER TABLE public.refresh_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refresh_triggers_select_own ON public.refresh_triggers;
DROP POLICY IF EXISTS refresh_triggers_insert_own ON public.refresh_triggers;
DROP POLICY IF EXISTS refresh_triggers_update_own ON public.refresh_triggers;

CREATE POLICY refresh_triggers_select_own
  ON public.refresh_triggers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY refresh_triggers_insert_own
  ON public.refresh_triggers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY refresh_triggers_update_own
  ON public.refresh_triggers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## Codebase Context

### Key Code Snippets

Existing tables already in DB (from prior migrations):
- `public.sessions` (id uuid PK, user_id, input_type, input_data jsonb, created_at)
- `public.content_assets` (id uuid PK, session_id FK, asset_type, content jsonb, version, created_at)
- `public.distribution_logs` (from task-001)
- `public.scheduled_posts` (from task-001)

### Key Patterns in Use
- All tables use `gen_random_uuid()` as primary key
- RLS always `user_id = auth.uid()`
- `DROP POLICY IF EXISTS` before `CREATE POLICY`
- Unique partial index: `CREATE UNIQUE INDEX ... WHERE status = 'pending'` prevents duplicate pending rows without blocking resolved duplicates

---

## Implementation Steps
1. `supabase/migrations/20260420_distribution_and_analytics_002.sql` — paste the full SQL from Code Templates above.

---

## Test Cases

```
1. Apply migration via Supabase dashboard or `npx supabase db push`
2. Confirm tables exist: analytics_snapshots (5 cols), refresh_triggers (10 cols)
3. Test unique partial index:
   INSERT INTO public.refresh_triggers (user_id, session_id, query, status)
     VALUES ('user-uuid', 'session-uuid', 'best python tutorial', 'pending');
   -- Second insert with same session_id+query+status='pending' should FAIL
   INSERT INTO public.refresh_triggers (user_id, session_id, query, status)
     VALUES ('user-uuid', 'session-uuid', 'best python tutorial', 'pending');
   -- EXPECTED: ERROR 23505 unique violation
   -- But: insert with status='resolved' for same query should SUCCEED
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `session_id` is NULL on `refresh_triggers` | Allowed — some triggers may not link to a session |
| `analytics_snapshots` grows unbounded | Future task can add a cleanup cron; for now no TTL delete |

---

## Acceptance Criteria
- [ ] WHEN migration applied, THEN `analytics_snapshots` exists with columns: id, user_id, source, data, fetched_at
- [ ] WHEN migration applied, THEN `refresh_triggers` exists with all 10 columns
- [ ] WHEN `source` value is not 'ga4' or 'search_console', THEN Postgres rejects with check constraint
- [ ] WHEN two rows inserted with same `session_id + query` and both `status='pending'`, THEN second insert fails with unique violation
- [ ] WHEN first trigger resolved and a new pending trigger inserted for same query, THEN insert succeeds

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-003 creates TypeScript helpers that read/write these tables
**Open questions:** _(fill via /task-handoff)_
