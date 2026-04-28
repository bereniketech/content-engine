---
task: "032"
feature: competitive-gaps-roadmap
rec: R8
title: "Content clusters DB migration"
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
Create the `content_clusters` Supabase table migration for topical authority planning. Articles are stored as a JSONB array for simplicity (avoids a separate `cluster_articles` table for MVP).

## Files

### Create
- `D:/content-engine/supabase/migrations/20260428_content_clusters.sql`

## Implementation Steps

```sql
-- Migration: content_clusters for R8 Topical Authority Planner
-- Feature: competitive-gaps-roadmap / task-032

CREATE TABLE IF NOT EXISTS public.content_clusters (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar_keyword   text        NOT NULL,
  name             text        NOT NULL,
  total_articles   integer     NOT NULL DEFAULT 0
                               CHECK (total_articles BETWEEN 0 AND 13),
  published_count  integer     NOT NULL DEFAULT 0
                               CHECK (published_count >= 0),
  articles         jsonb       NOT NULL DEFAULT '[]',
  -- articles JSONB schema:
  -- [{ id: uuid, keyword: string, searchIntent: string, estimatedVolume: number,
  --    difficulty: number, internalLinkTarget: string, publishOrder: number,
  --    status: 'pending'|'in_progress'|'published', sessionId?: string }]
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_clusters_user_id_idx
  ON public.content_clusters (user_id);

CREATE INDEX IF NOT EXISTS content_clusters_created_at_idx
  ON public.content_clusters (user_id, created_at DESC);

-- Limit: max 20 clusters per user (enforced at application layer)
-- updated_at trigger
DROP TRIGGER IF EXISTS content_clusters_updated_at ON public.content_clusters;
CREATE TRIGGER content_clusters_updated_at
  BEFORE UPDATE ON public.content_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Note: update_updated_at_column() function created in briefs migration

-- RLS
ALTER TABLE public.content_clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clusters_select_own ON public.content_clusters;
DROP POLICY IF EXISTS clusters_insert_own ON public.content_clusters;
DROP POLICY IF EXISTS clusters_update_own ON public.content_clusters;
DROP POLICY IF EXISTS clusters_delete_own ON public.content_clusters;

CREATE POLICY clusters_select_own ON public.content_clusters
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY clusters_insert_own ON public.content_clusters
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY clusters_update_own ON public.content_clusters
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY clusters_delete_own ON public.content_clusters
  FOR DELETE USING (user_id = auth.uid());
```

## Test Cases

- Table created with all columns and constraints
- `total_articles` check: value 14 → constraint violation
- `published_count` check: -1 → constraint violation
- RLS: user sees only own clusters
- `updated_at` trigger fires on UPDATE

## Decision Rules
- Articles stored as JSONB array (not separate table) — simpler for MVP, acceptable for ≤13 articles.
- `update_updated_at_column()` function referenced from briefs migration — must run after TASK-024 migration.
- Max 20 clusters enforced at application layer, not DB constraint.
- `total_articles` max 13 (1 pillar + 12 supporting max).

## Acceptance Criteria
- `content_clusters` table created with JSONB `articles` column.
- RLS with 4 policies.
- `total_articles` CHECK constraint (0-13).
- `updated_at` trigger wired.
- Migration idempotent.

Status: COMPLETE
Completed: 2026-04-28T09:56:24Z
