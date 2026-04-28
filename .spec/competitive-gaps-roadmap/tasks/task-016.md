---
task: "016"
feature: competitive-gaps-roadmap
rec: R4
title: "Create PATCH /api/schedule/[id] and DELETE /api/schedule/[id] routes"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["015"]
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
Create the dynamic route at `app/api/schedule/[id]/route.ts` that handles PATCH (update publish_at, status, title) and DELETE (cancel) for scheduled posts. Both must verify ownership.

## Files

### Create
- `D:/content-engine/app/api/schedule/[id]/route.ts`

## Dependencies
- TASK-015: `title` column exists on `scheduled_posts`
- `lib/auth.ts` — `requireAuth`
- Existing `scheduled_posts` table with RLS

## Codebase Context

Existing `app/api/schedule/[id]/` directory already exists (from `ls` output). Check if `route.ts` already exists and whether it has partial implementation. If a file exists, extend it rather than replace.

The existing `POST /api/schedule/route.ts` validates `publish_at >= now()`. The PATCH should enforce `publish_at >= now() + 5 minutes`.

RLS on `scheduled_posts`: `user_id = auth.uid()` for select/insert/update. This means Supabase client queries automatically filter by user — a row not belonging to the user will silently return empty, which the route should treat as 404.

## API Contracts

**PATCH /api/schedule/[id]:**
```typescript
// Request body (all optional)
{ publishAt?: string; status?: 'queued' | 'cancelled'; title?: string }

// Response 200
{ data: { id: string; status: string; publishAt: string; title: string | null } }

// Response 400 — publish_at in past or too soon
{ error: { code: 'validation_error'; message: 'publish_at must be at least 5 minutes in the future' } }

// Response 404 — not found or not owned
{ error: { code: 'not_found'; message: 'Scheduled post not found' } }
```

**DELETE /api/schedule/[id]:**
```typescript
// Response 200
{ data: { id: string; status: 'cancelled' } }

// Response 404
{ error: { code: 'not_found'; message: 'Scheduled post not found' } }
```

## Implementation Steps

1. Create `app/api/schedule/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Auth check
  // 2. Parse body: publishAt, status, title
  // 3. If publishAt provided: validate it's at least 5 min in future
  // 4. Build update object with only provided fields
  // 5. Supabase update WHERE id = params.id (RLS enforces user_id)
  // 6. If data is null/empty: return 404
  // 7. Return 200 with updated row
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Auth check
  // 2. Supabase update SET status = 'cancelled' WHERE id = params.id
  // 3. If data is null: return 404
  // 4. Return 200 with { id, status: 'cancelled' }
}
```

2. Publish time validation:
```typescript
const FIVE_MINUTES_MS = 5 * 60 * 1000
const publishAtDate = new Date(publishAt)
if (publishAtDate.getTime() < Date.now() + FIVE_MINUTES_MS) {
  return NextResponse.json(
    { error: { code: 'validation_error', message: 'publish_at must be at least 5 minutes in the future' } },
    { status: 400 }
  )
}
```

3. DELETE uses update (not hard delete) to maintain audit trail: `SET status = 'cancelled'`.

## Test Cases

- PATCH with valid publishAt → 200 with updated row
- PATCH with publishAt < now+5min → 400 validation error
- PATCH for non-existent id → 404
- PATCH for another user's row → 404 (RLS blocks it)
- DELETE for own row → 200 with status='cancelled'
- DELETE for non-existent id → 404
- Both routes unauthenticated → 401

## Decision Rules
- DELETE is a soft delete (status='cancelled') not a hard row deletion.
- Only update provided fields (partial update) — do not overwrite unprovided fields with null.
- RLS provides ownership enforcement — no manual `user_id` check needed in query, but 404 on empty result.

## Acceptance Criteria
- `PATCH /api/schedule/[id]` updates provided fields only and returns 200.
- `publishAt` validation enforces ≥5 minutes future.
- `DELETE /api/schedule/[id]` soft-deletes by setting status='cancelled'.
- Both return 404 when row not found or not owned.
- Auth required on both routes.

Status: COMPLETE
Completed: 2026-04-28T07:24:02Z
