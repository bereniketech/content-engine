---
task: "035"
feature: competitive-gaps-roadmap
rec: R9
title: "Workspaces DB migration with full RLS"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: []
---

## Skills
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`
- `.kit/skills/testing-quality/security-review/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`
- `.kit/agents/software-company/qa/security-reviewer.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Create the three workspace-related tables (`workspaces`, `workspace_members`, `content_approvals`) with comprehensive RLS policies that enforce role-based access control.

## Files

### Create
- `D:/content-engine/supabase/migrations/20260428_workspaces.sql`

## Implementation Steps

```sql
-- Migration: workspaces, workspace_members, content_approvals
-- Feature: competitive-gaps-roadmap / R9 Team Workspaces

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  slug            text        NOT NULL UNIQUE,
  feature_enabled boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspaces_owner_id_idx ON public.workspaces (owner_id);
CREATE INDEX IF NOT EXISTS workspaces_slug_idx ON public.workspaces (slug);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Members can see workspaces they belong to; owners always see theirs
DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
CREATE POLICY workspaces_select ON public.workspaces FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only owner can insert (via API layer)
DROP POLICY IF EXISTS workspaces_insert ON public.workspaces;
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only owner can update
DROP POLICY IF EXISTS workspaces_update ON public.workspaces;
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Only owner can delete
DROP POLICY IF EXISTS workspaces_delete ON public.workspaces;
CREATE POLICY workspaces_delete ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================
-- WORKSPACE_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email        text        NOT NULL,
  role         text        NOT NULL DEFAULT 'writer'
                           CHECK (role IN ('writer', 'editor', 'admin')),
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'active', 'removed')),
  joined_at    timestamptz
);

CREATE INDEX IF NOT EXISTS wm_workspace_id_idx ON public.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS wm_user_id_idx ON public.workspace_members (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS wm_workspace_email_unique ON public.workspace_members (workspace_id, email);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Members can see all other members in their workspace
DROP POLICY IF EXISTS wm_select ON public.workspace_members;
CREATE POLICY wm_select ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members AS wm2
      WHERE wm2.user_id = auth.uid() AND wm2.status = 'active'
    )
    OR workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Only admins/owners can insert members
DROP POLICY IF EXISTS wm_insert ON public.workspace_members;
CREATE POLICY wm_insert ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Admins/owners can update members (change role, status)
DROP POLICY IF EXISTS wm_update ON public.workspace_members;
CREATE POLICY wm_update ON public.workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- ============================================================
-- CONTENT_APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_approvals (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  submitted_by  uuid        NOT NULL REFERENCES auth.users(id),
  reviewed_by   uuid        REFERENCES auth.users(id),
  status        text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','review','approved','published','changes_requested')),
  feedback      text,
  submitted_at  timestamptz,
  reviewed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS approvals_workspace_status_idx ON public.content_approvals (workspace_id, status);
CREATE INDEX IF NOT EXISTS approvals_submitted_by_idx ON public.content_approvals (submitted_by);

ALTER TABLE public.content_approvals ENABLE ROW LEVEL SECURITY;

-- Writers see own submissions; editors/admins see all in workspace
DROP POLICY IF EXISTS approvals_select ON public.content_approvals;
CREATE POLICY approvals_select ON public.content_approvals FOR SELECT
  USING (
    submitted_by = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('editor', 'admin')
        AND status = 'active'
    )
    OR workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Writers can insert approvals for their workspace
DROP POLICY IF EXISTS approvals_insert ON public.content_approvals;
CREATE POLICY approvals_insert ON public.content_approvals FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Editors/admins can update (approve/reject)
DROP POLICY IF EXISTS approvals_update ON public.content_approvals;
CREATE POLICY approvals_update ON public.content_approvals FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('editor', 'admin')
        AND status = 'active'
    )
    OR workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );
```

## Test Cases

- Writer selects own approval → visible
- Writer selects another writer's approval → not visible (RLS blocks)
- Editor selects all approvals in their workspace → all visible
- Writer inserts approval → succeeds
- Writer updates approval (approve action) → RLS blocks (403)
- Editor updates approval → succeeds
- Unique constraint: duplicate email per workspace → rejected

## Decision Rules
- All RLS policies use subquery pattern (not JOIN) for Supabase compatibility.
- `feature_enabled = false` by default — gated rollout.
- `workspace_members` unique index on `(workspace_id, email)` prevents duplicate invites.
- Security reviewer should verify RLS policies before running.

## Acceptance Criteria
- All three tables created with correct schemas.
- RLS enabled on all tables.
- Writers cannot see/update other writers' approvals.
- Editors/admins can see all workspace approvals.
- Only owners/admins can invite members.
- All SQL idempotent.

Status: COMPLETE
Completed: 2026-04-28T10:08:00Z
