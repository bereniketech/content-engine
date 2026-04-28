---
task: "024"
feature: competitive-gaps-roadmap
rec: R2
title: "Brief DB migration"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: []
---

## Skills
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Create the `briefs` Supabase table migration with RLS policies. One brief per session, editable by the owner.

## Files

### Create
- `D:/content-engine/supabase/migrations/20260428_briefs.sql`

## Dependencies
- Existing `sessions` table, `auth.users`

## Implementation Steps

```sql
-- Migration: briefs table for R2 Living Content Brief
-- Feature: competitive-gaps-roadmap / task-024

CREATE TABLE IF NOT EXISTS public.briefs (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id                uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword                text        NOT NULL DEFAULT '',
  search_intent          text,
  audience               text,
  suggested_h1           text,
  h2_outline             jsonb       NOT NULL DEFAULT '[]',
  competitor_gaps        jsonb       NOT NULL DEFAULT '[]',
  recommended_word_count integer,
  ctas                   text[]      NOT NULL DEFAULT '{}',
  status                 text        NOT NULL DEFAULT 'draft'
                                     CHECK (status IN ('draft', 'approved')),
  raw_markdown           text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- One brief per session
CREATE UNIQUE INDEX IF NOT EXISTS briefs_session_id_unique_idx
  ON public.briefs (session_id);

CREATE INDEX IF NOT EXISTS briefs_user_id_idx
  ON public.briefs (user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS briefs_updated_at ON public.briefs;
CREATE TRIGGER briefs_updated_at
  BEFORE UPDATE ON public.briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS briefs_select_own ON public.briefs;
DROP POLICY IF EXISTS briefs_insert_own ON public.briefs;
DROP POLICY IF EXISTS briefs_update_own ON public.briefs;
DROP POLICY IF EXISTS briefs_delete_own ON public.briefs;

CREATE POLICY briefs_select_own ON public.briefs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY briefs_insert_own ON public.briefs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY briefs_update_own ON public.briefs
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY briefs_delete_own ON public.briefs
  FOR DELETE USING (user_id = auth.uid());
```

## Test Cases

- Table created with all columns
- Unique constraint on session_id: two inserts for same session → second fails
- `updated_at` trigger fires on UPDATE
- RLS: user can only see own briefs

## Decision Rules
- `session_id` unique index ensures one brief per session (upsert possible via INSERT ... ON CONFLICT).
- `updated_at` trigger is reusable — check if function already exists in DB before creating.
- All SQL idempotent with IF NOT EXISTS.

## Acceptance Criteria
- `briefs` table created with unique session_id constraint.
- RLS with 4 policies (select, insert, update, delete).
- `updated_at` auto-updates on row modification.
- Migration is idempotent.

Status: COMPLETE
Completed: 2026-04-28T07:28:40Z
