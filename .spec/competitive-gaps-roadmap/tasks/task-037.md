---
task: "037"
feature: competitive-gaps-roadmap
rec: R9
title: "Create approval API routes and WorkspaceDashboard component"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["035", "036"]
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create the content approval API routes with state machine enforcement, and build the `WorkspaceDashboard` and `ApprovalQueue` components.

## Files

### Create
- `D:/content-engine/app/api/approval/route.ts`
- `D:/content-engine/app/api/approval/[id]/route.ts`
- `D:/content-engine/components/sections/WorkspaceDashboard.tsx`
- `D:/content-engine/components/ui/ApprovalQueue.tsx`
- `D:/content-engine/app/dashboard/workspace/page.tsx`

## Dependencies
- TASK-035: tables exist
- TASK-036: workspace routes
- `lib/auth.ts`, `lib/workspace-email.ts`

## API Contracts

**POST /api/approval:**
```typescript
// Request
{ sessionId: string; workspaceId: string }
// Creates approval with status='review', sets submitted_at
// Response 201: { data: ContentApproval }
// Response 403: not workspace member
// Response 409: approval already exists for this session
```

**PATCH /api/approval/[id]:**
```typescript
// Request
{ status: 'approved' | 'changes_requested' | 'published'; feedback?: string }
// Response 200: { data: ContentApproval }
// Response 403: writer trying to approve own submission
// Response 422: invalid state transition
```

## State Machine

Valid transitions:
```
draft → review         (writer submits — via POST /api/approval)
review → approved      (editor/admin approves)
review → changes_requested (editor/admin requests changes)
changes_requested → review (writer resubmits — via PATCH with status='review')
approved → published   (admin marks published)
```

Invalid transitions (return 422):
- review → draft
- approved → review
- published → any

## Implementation Steps

1. Create `app/api/approval/route.ts` (POST):
   - Auth
   - Validate `{ sessionId, workspaceId }`
   - Verify user is active workspace member
   - Check no existing approval for sessionId (unless status='changes_requested' → resubmit)
   - Insert with `status = 'review'`, `submitted_by = user.id`, `submitted_at = now()`
   - Send notification email to workspace editors/admins
   - Return 201

2. Create `app/api/approval/[id]/route.ts` (PATCH):
   - Auth
   - Fetch approval by id, verify access (RLS + role check)
   - Validate state transition in `VALID_TRANSITIONS` map
   - If approving/rejecting: check user is editor/admin (not the submitter)
   - Update approval with new status, reviewed_by, reviewed_at, feedback
   - Send notification email to submitter on status change
   - Return 200

3. State machine implementation:
```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['review'],
  review: ['approved', 'changes_requested'],
  changes_requested: ['review'],
  approved: ['published'],
  published: [],
}

function validateTransition(current: string, next: string): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false
}
```

4. Create `components/ui/ApprovalQueue.tsx`:
```typescript
interface ApprovalQueueProps {
  approvals: ContentApproval[]
  userRole: 'writer' | 'editor' | 'admin'
  onApprove: (id: string) => void
  onRequestChanges: (id: string, feedback: string) => void
  onMarkPublished: (id: string) => void
}
```
- Table with columns: Title, Author, Submitted, Status, Actions
- Status badge colors: review=blue, approved=green, changes_requested=amber, published=gray
- Editor/admin actions: Approve button + "Request Changes" button (opens inline feedback textarea)
- Writer view: shows own submissions with status; "Resubmit" button on changes_requested items

5. Create `components/sections/WorkspaceDashboard.tsx`:
- Workspace selector dropdown (if multiple workspaces)
- Members list with invite button (calls /api/workspace/[id]/invite)
- ApprovalQueue component below
- Gate behind `workspace.feature_enabled` check

6. Create `app/dashboard/workspace/page.tsx`:
- `'use client'`, fetches workspaces list then renders WorkspaceDashboard
- Show "Request Early Access" message if no workspaces and feature not enabled

## Test Cases

- POST /api/approval as workspace member → 201 with status='review'
- POST /api/approval as non-member → 403
- PATCH status='approved' by editor → 200
- PATCH status='approved' by writer (submitter) → 403
- Invalid transition (approved → review) → 422
- PATCH with feedback for changes_requested → feedback stored

## Decision Rules
- State machine validation must be the first check after auth in PATCH.
- Email notifications are best-effort — failures logged, not surfaced to user.
- Writers cannot approve their own submissions (check `submitted_by !== user.id`).
- `feature_enabled` check: if false, all workspace routes return 403 with message 'Feature not enabled'.

## Acceptance Criteria
- `POST /api/approval` creates approval for workspace member, 403 for non-member.
- `PATCH /api/approval/[id]` enforces state machine — invalid transitions return 422.
- Writers cannot approve their own submissions.
- ApprovalQueue shows correct actions per role.
- WorkspaceDashboard gated by `feature_enabled` flag.
- `/dashboard/workspace` page accessible.

Status: COMPLETE
Completed: 2026-04-28T10:20:00Z
