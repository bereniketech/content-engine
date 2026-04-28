---
task: "046"
feature: competitive-gaps-roadmap
rec: R9
title: "Security review of workspace RLS policies"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: security-reviewer
depends_on: ["035", "036", "037"]
---

## Skills
- `.kit/skills/testing-quality/security-review/SKILL.md`

## Agents
- `.kit/agents/software-company/qa/security-reviewer.md`

## Commands
- `.kit/commands/development/code-review.md`

---

## Objective
Dedicated security review of the workspace RLS policies and approval state machine to prevent privilege escalation and unauthorized data access.

## Files

### Review
- `D:/content-engine/supabase/migrations/20260428_workspaces.sql`
- `D:/content-engine/app/api/workspace/route.ts`
- `D:/content-engine/app/api/workspace/[id]/invite/route.ts`
- `D:/content-engine/app/api/approval/route.ts`
- `D:/content-engine/app/api/approval/[id]/route.ts`

## Security Checklist

1. **RLS — Writer can't read other workspace's content:**
   - Test: writer in workspace A cannot SELECT from content_approvals for workspace B

2. **RLS — Non-member cannot access workspace data:**
   - Test: user not in workspace_members cannot SELECT workspace or approvals

3. **Role escalation prevention:**
   - A writer cannot promote themselves to admin via PATCH to workspace_members
   - The invite route checks caller is admin/owner before inserting

4. **Approval self-approval prevention:**
   - API-level check: submitted_by !== reviewer for approve/reject
   - This is API-layer only (not RLS) — verify it's implemented in PATCH /api/approval/[id]

5. **State machine integrity:**
   - Invalid transitions return 422, not silently accepted
   - `published` state has no outgoing transitions (cannot be undone)

6. **Feature flag gate:**
   - All workspace routes check `feature_enabled` flag
   - If false: 403 returned before any data access

7. **Email injection:**
   - Invite email validated server-side with RFC-compliant regex
   - No email header injection possible in notification stub

8. **Slug injection:**
   - Workspace slug validated against `^[a-z0-9-]+$` after generation
   - No SQL injection surface (Supabase client uses parameterized queries)

## Acceptance Criteria
- Items 1-3 verified as compliant (High severity if not).
- Self-approval prevention confirmed in API code.
- State machine confirmed to reject invalid transitions.
- Feature flag gate confirmed present in all workspace routes.
- Any High findings must be fixed before R9 tasks are marked complete.

Status: COMPLETE
Completed: 2026-04-28T11:30:00Z
Findings: No HIGH issues. MEDIUM fixed (feature_enabled gate added to invite+approval POST). LOW fixed (email regex hardened to RFC 5322 pattern).
