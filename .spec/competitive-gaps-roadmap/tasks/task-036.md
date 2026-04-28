---
task: "036"
feature: competitive-gaps-roadmap
rec: R9
title: "Create workspace API routes (create, invite, list members)"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["035"]
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create the workspace management API routes: create workspace, list members, and invite a new member (with email notification via Supabase Edge Function stub).

## Files

### Create
- `D:/content-engine/app/api/workspace/route.ts`
- `D:/content-engine/app/api/workspace/[id]/members/route.ts`
- `D:/content-engine/app/api/workspace/[id]/invite/route.ts`

## Dependencies
- TASK-035: workspace tables exist
- `lib/auth.ts` — `requireAuth`

## API Contracts

**POST /api/workspace:**
```typescript
// Request
{ name: string }
// Response 201
{ data: { id: string; name: string; slug: string; ownerId: string } }
// Response 400: name missing/invalid
// Response 409: slug already taken
```

**GET /api/workspace/[id]/members:**
```typescript
// Response 200
{ data: Array<{ id: string; email: string; role: string; status: string; joinedAt: string | null }> }
// Response 403: not a member
// Response 404: workspace not found
```

**POST /api/workspace/[id]/invite:**
```typescript
// Request
{ email: string; role: 'writer' | 'editor' | 'admin' }
// Response 201
{ data: { id: string; email: string; role: string; status: 'pending' } }
// Response 403: not an admin/owner
// Response 409: email already a member
// Response 422: max 25 members
```

## Implementation Steps

1. Create `app/api/workspace/route.ts` (POST):
   - Auth
   - Validate `name` (required, 2-100 chars)
   - Generate `slug` from name: `name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50)`
   - Insert into `workspaces` with `owner_id = user.id`
   - Insert into `workspace_members`: `{ workspace_id, user_id, email: user.email, role: 'admin', status: 'active', joined_at: now() }`
   - On unique violation on slug: append random 4-char suffix and retry once
   - Return 201 with workspace data

2. Create `app/api/workspace/[id]/members/route.ts` (GET):
   - Auth
   - Verify user is a member of the workspace (query workspace_members)
   - If not member and not owner: 403
   - Query all workspace_members for this workspace_id
   - Return member list

3. Create `app/api/workspace/[id]/invite/route.ts` (POST):
   - Auth
   - Verify user is admin or owner of workspace
   - Validate email format
   - Count existing members; if ≥25 return 422
   - Check no existing active/pending member with same email; if exists return 409
   - Insert workspace_member with `status = 'pending'`
   - Call email notification (stub: log the invite email instead of real send for MVP)
   - Return 201 with pending member

4. Email notification stub in `lib/workspace-email.ts`:
```typescript
export async function sendWorkspaceInviteEmail(email: string, workspaceName: string, inviterEmail: string) {
  // TODO: Replace with Resend/SendGrid when RESEND_API_KEY is configured
  if (process.env.RESEND_API_KEY) {
    // Real email send
  } else {
    console.log(`[WORKSPACE INVITE] To: ${email}, Workspace: ${workspaceName}, From: ${inviterEmail}`)
  }
}
```

## Test Cases

- POST /api/workspace with valid name → 201 with workspace + member as admin
- POST with slug collision → retry with suffix → 201
- GET /api/workspace/[id]/members as member → 200 with list
- GET as non-member → 403
- POST /api/workspace/[id]/invite as admin → 201 with pending member
- POST invite as writer → 403
- POST invite for existing email → 409
- POST invite when 25 members exist → 422

## Decision Rules
- Creator automatically becomes admin member on workspace creation.
- Slug generation must sanitize all special characters.
- Email notification is stub — do NOT block route on email failure.
- `feature_enabled` defaults to false — workspace is created but gated.

## Acceptance Criteria
- `POST /api/workspace` creates workspace + admin member in one logical operation.
- `GET /api/workspace/[id]/members` returns all members to authorized users.
- `POST /api/workspace/[id]/invite` creates pending member with email notification stub.
- All routes auth-required.
- Max 25 members enforced with 422.

Status: COMPLETE
Completed: 2026-04-28T10:12:00Z
