---
task: "015"
feature: competitive-gaps-roadmap
rec: R4
title: "Add title column to scheduled_posts — migration file"
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
Create a non-breaking SQL migration that adds a nullable `title` text column to the existing `scheduled_posts` table for display purposes in the calendar UI.

## Files

### Create
- `D:/content-engine/supabase/migrations/20260428_scheduled_posts_title.sql`

## Dependencies
- Existing `scheduled_posts` table (created in `20260420_distribution_and_analytics_001.sql`)

## Codebase Context

Existing `scheduled_posts` table columns (from migration 20260420):
```sql
id, session_id, user_id, platform, asset_type, content_snapshot, status, publish_at, published_at, external_id, error_details, created_at
```

Existing `POST /api/schedule/route.ts` accepts `{ sessionId, platform, publishAt, assetType, contentSnapshot }`. It will need to accept `title` after this migration — that is handled in TASK-016 (PATCH/DELETE routes) and wired in schedule creation in TASK-018.

## Implementation Steps

```sql
-- Migration: Add title column to scheduled_posts for calendar display
-- Feature: competitive-gaps-roadmap / R4

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS title text;

COMMENT ON COLUMN public.scheduled_posts.title IS 'Display title for calendar UI — derived from session content_assets blog.title';
```

Also update the existing `POST /api/schedule/route.ts` to accept and store `title` when provided:
- Find the body parsing section
- Add `const title = typeof body.title === 'string' ? body.title.trim() : null`
- Add `title` to the Supabase insert object

## Test Cases

- Migration is idempotent: running twice does not error (`ADD COLUMN IF NOT EXISTS`)
- After migration: `INSERT INTO scheduled_posts (..., title) VALUES (..., 'My Article')` succeeds
- After migration: `INSERT INTO scheduled_posts (...)` without title column also succeeds (nullable)

## Decision Rules
- Use `ADD COLUMN IF NOT EXISTS` to be idempotent.
- Column must be nullable (no DEFAULT, no NOT NULL) — existing rows have no title.
- Timestamp prefix must be `20260428` to sort after existing migrations.

## Acceptance Criteria
- Migration file created with correct SQL.
- `ALTER TABLE` uses `IF NOT EXISTS` guard.
- Column is nullable text.
- `POST /api/schedule/route.ts` updated to accept and store optional `title` field.

Status: COMPLETE
Completed: 2026-04-28T07:24:02Z
