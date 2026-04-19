---
task: "010"
feature: distribution-and-analytics
status: COMPLETE
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["001"]
---

# Task 010: Schedule API — Queue and Cancel

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `app/api/schedule/route.ts` (POST to queue a post) and `app/api/schedule/[id]/route.ts` (DELETE to cancel a queued post).

---

## Files
### Create
| File | Purpose |
|---|---|
| `app/api/schedule/route.ts` | POST: insert scheduled_posts row |
| `app/api/schedule/[id]/route.ts` | DELETE: cancel scheduled post; GET: list for session |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# No new packages.
# No new env vars.
```

---

## API Contracts

### POST /api/schedule
**Request:**
```json
{
  "sessionId": "uuid",
  "platform": "x",
  "publishAt": "2026-04-25T09:00:00.000Z",
  "assetType": "social_x",
  "contentSnapshot": { "tweet": "Hello world", "thread": [] }
}
```
**Response 201:**
```json
{ "data": { "id": "uuid", "status": "queued", "publishAt": "2026-04-25T09:00:00.000Z" } }
```
**Response 400:** `{ "error": { "code": "validation_error", "message": "publishAt must be a future timestamp" } }`
**Response 401:** `{ "error": { "code": "unauthorized", "message": "Authentication required" } }`

### GET /api/schedule?sessionId=uuid
**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "platform": "x", "status": "queued", "publishAt": "...", "assetType": "social_x" }
  ]
}
```

### DELETE /api/schedule/:id
**Response 200:** `{ "data": { "id": "uuid", "status": "cancelled" } }`
**Response 404:** `{ "error": { "code": "not_found", "message": "Scheduled post not found" } }`

---

## Code Templates

### `app/api/schedule/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const VALID_PLATFORMS = ['x', 'linkedin', 'instagram', 'reddit', 'newsletter_mailchimp', 'newsletter_sendgrid'] as const

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  const { user, supabase } = auth

  let body: {
    sessionId?: unknown
    platform?: unknown
    publishAt?: unknown
    assetType?: unknown
    contentSnapshot?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json', message: 'Invalid JSON' } }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const platform = typeof body.platform === 'string' ? body.platform.trim() : ''
  const publishAtRaw = typeof body.publishAt === 'string' ? body.publishAt.trim() : ''
  const assetType = typeof body.assetType === 'string' ? body.assetType.trim() : ''
  const contentSnapshot = typeof body.contentSnapshot === 'object' && body.contentSnapshot !== null
    ? body.contentSnapshot
    : {}

  const errors: string[] = []
  if (!sessionId) errors.push('sessionId is required')
  if (!platform || !VALID_PLATFORMS.includes(platform as typeof VALID_PLATFORMS[number])) {
    errors.push(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`)
  }
  if (!assetType) errors.push('assetType is required')
  if (!publishAtRaw) errors.push('publishAt is required')

  if (errors.length > 0) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: errors.join('; ') } },
      { status: 400 }
    )
  }

  const publishAt = new Date(publishAtRaw)
  if (isNaN(publishAt.getTime())) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'publishAt must be a valid ISO 8601 date string' } },
      { status: 400 }
    )
  }

  if (publishAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'publishAt must be a future timestamp' } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      platform,
      asset_type: assetType,
      content_snapshot: contentSnapshot,
      status: 'queued',
      publish_at: publishAt.toISOString(),
    })
    .select('id, status, publish_at')
    .single()

  if (error || !data) {
    console.error('schedule/post insert error', { error: error?.message })
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to schedule post' } },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: { id: data.id, status: data.status, publishAt: data.publish_at } },
    { status: 201 }
  )
}

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  const { supabase } = auth

  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId query param is required' } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('id, platform, status, publish_at, asset_type, published_at, external_id')
    .eq('session_id', sessionId)
    .order('publish_at', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to fetch scheduled posts' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: data ?? [] }, { status: 200 })
}
```

### `app/api/schedule/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  const { user, supabase } = auth

  const { id } = params

  // Verify ownership + queued status
  const { data: existing, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('id, status, user_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Scheduled post not found' } },
      { status: 404 }
    )
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Not authorized' } },
      { status: 403 }
    )
  }

  if (existing.status !== 'queued') {
    return NextResponse.json(
      { error: { code: 'invalid_state', message: `Cannot cancel a post with status '${existing.status}'` } },
      { status: 409 }
    )
  }

  const { error: updateError } = await supabase
    .from('scheduled_posts')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to cancel post' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { id, status: 'cancelled' } }, { status: 200 })
}
```

---

## Codebase Context

### Key Code Snippets

Supabase insert pattern used throughout codebase:
```typescript
const { data, error } = await supabase.from('content_assets').insert({...}).select('*').single()
if (error || !data) { return NextResponse.json({ error: ... }, { status: 500 }) }
```

Route params pattern in Next.js 16 App Router:
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) { ... }
```

File for this pattern: check `app/api/social/regenerate/route.ts` if unsure about dynamic route syntax.

### Key Patterns in Use
- `requireAuth(request)` → `{ user, supabase }` where `supabase` is scoped to user
- RLS on `scheduled_posts` ensures users can only see their own rows via `supabase`
- `user_id` comparison in DELETE is a defense-in-depth check beyond RLS

---

## Implementation Steps
1. Create `app/api/schedule/route.ts` from Code Templates.
2. Create directory `app/api/schedule/[id]/` and file `route.ts` from Code Templates.

---

## Test Cases

```typescript
// Manual API tests (can be done with curl or Postman):

// 1. POST with future publishAt → 201
// POST /api/schedule
// { sessionId: "valid-uuid", platform: "x", publishAt: "2027-01-01T09:00:00Z", assetType: "social_x", contentSnapshot: {} }

// 2. POST with past publishAt → 400 "publishAt must be a future timestamp"
// { ..., publishAt: "2020-01-01T09:00:00Z" }

// 3. DELETE with valid queued id → 200 { status: 'cancelled' }
// DELETE /api/schedule/{id}

// 4. DELETE with non-existent id → 404
// DELETE /api/schedule/00000000-0000-0000-0000-000000000000

// Jest unit test:
// lib/__tests__/schedule.test.ts — mock requireAuth + supabase, test validation logic
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `publishAt` exactly equals `Date.now()` | Fail with "must be future" (strict `<=` comparison) |
| DELETE on already-published post | Return 409 "Cannot cancel a post with status 'published'" |
| DELETE on cancelled post | Return 409 "Cannot cancel a post with status 'cancelled'" |
| GET with no sessionId | Return 400 |

---

## Acceptance Criteria
- [ ] WHEN POST with future `publishAt`, THEN row inserted with status='queued' and 201 returned
- [ ] WHEN POST with `publishAt` in the past, THEN returns 400 with "publishAt must be a future timestamp"
- [ ] WHEN DELETE with valid queued post id, THEN status='cancelled' and 200 returned
- [ ] WHEN DELETE with non-existent id, THEN returns 404
- [ ] WHEN DELETE on published post, THEN returns 409
- [ ] WHEN unauthenticated, THEN returns 401

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-011 builds the schedule worker cron route that processes queued posts
**Open questions:** _(fill via /task-handoff)_
