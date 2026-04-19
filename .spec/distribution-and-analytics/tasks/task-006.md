---
task: "006"
feature: distribution-and-analytics
status: COMPLETE
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["001", "003"]
---

# Task 006: Instagram Publish API

## Skills
- .kit/skills/integrations/instagram-automation/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `lib/publish/instagram.ts` (2-step Instagram Graph API: create media container then publish) and `app/api/publish/instagram/route.ts`.

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/publish/instagram.ts` | Instagram Graph API: create container + publish |
| `app/api/publish/instagram/route.ts` | POST handler for Instagram publishing |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# No new packages.

# Env vars:
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
```

---

## API Contracts

### POST /api/publish/instagram
**Request:**
```json
{
  "sessionId": "uuid",
  "caption": "Caption text here #hashtag",
  "imageUrl": "https://example.com/image.jpg"
}
```
**Response 201:** `{ "data": { "externalId": "ig_media_id_123", "logId": "uuid" } }`
**Response 400:** `{ "error": { "code": "validation_error", "message": "Instagram requires an image — attach one before publishing." } }`
**Response 409:** `{ "error": { "code": "already_published", "message": "Already published to instagram for this session." } }`

---

## Code Templates

### `lib/publish/instagram.ts`

```typescript
import { getInstagramSecrets } from './secrets'

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

interface ContainerResponse {
  id: string
}

interface PublishResponse {
  id: string
}

export async function publishToInstagram(caption: string, imageUrl: string): Promise<string> {
  const { accessToken, businessAccountId } = getInstagramSecrets()

  // Step 1: Create media container
  const containerUrl = `${GRAPH_BASE}/${businessAccountId}/media`
  const containerParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  })

  const containerResponse = await fetch(`${containerUrl}?${containerParams.toString()}`, {
    method: 'POST',
  })

  if (!containerResponse.ok) {
    const errBody = await containerResponse.json() as { error?: { message: string } }
    throw new Error(`Instagram container error: ${errBody.error?.message ?? containerResponse.status}`)
  }

  const container = (await containerResponse.json()) as ContainerResponse
  const containerId = container.id

  // Step 2: Wait briefly for container to process (Instagram recommendation)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Step 3: Publish media container
  const publishUrl = `${GRAPH_BASE}/${businessAccountId}/media_publish`
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  })

  const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, {
    method: 'POST',
  })

  if (!publishResponse.ok) {
    const errBody = await publishResponse.json() as { error?: { message: string } }
    throw new Error(`Instagram publish error: ${errBody.error?.message ?? publishResponse.status}`)
  }

  const published = (await publishResponse.json()) as PublishResponse
  return published.id
}
```

### `app/api/publish/instagram/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '@/lib/publish/distribution-log'
import { publishToInstagram } from '@/lib/publish/instagram'
import { ConfigError } from '@/lib/publish/secrets'

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

  let body: { sessionId?: unknown; caption?: unknown; imageUrl?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Invalid JSON' } },
      { status: 400 }
    )
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const caption = typeof body.caption === 'string' ? body.caption.trim() : ''
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''

  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId is required' } },
      { status: 400 }
    )
  }

  if (!imageUrl) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'Instagram requires an image — attach one before publishing.' } },
      { status: 400 }
    )
  }

  try {
    await checkAlreadyPublished(supabase, sessionId, 'instagram')
  } catch (err) {
    if (err instanceof AlreadyPublishedError) {
      return NextResponse.json(
        { error: { code: 'already_published', message: err.message } },
        { status: 409 }
      )
    }
  }

  let externalId: string
  try {
    externalId = await publishToInstagram(caption, imageUrl)
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('publish/instagram error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }

  let logId: string
  try {
    logId = await writeDistributionLog({
      supabase,
      sessionId,
      userId: user.id,
      platform: 'instagram',
      status: 'published',
      externalId,
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Published but failed to log result' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { externalId, logId } }, { status: 201 })
}
```

---

## Codebase Context

### Key Patterns in Use
- Same auth/idempotency/log pattern as tasks 004 and 005
- Instagram Graph API uses query params (not JSON body) for media endpoints
- Two-step publish: create container → wait 2s → publish container
- `GRAPH_BASE = 'https://graph.facebook.com/v19.0'` — update version if Graph API version changes

---

## Implementation Steps
1. Create `lib/publish/instagram.ts` from Code Templates.
2. Create `app/api/publish/instagram/route.ts` from Code Templates.

---

## Test Cases

```typescript
// lib/publish/__tests__/instagram.test.ts
import { publishToInstagram } from '../instagram'

const mockFetch = jest.spyOn(global, 'fetch')
beforeEach(() => {
  process.env.INSTAGRAM_ACCESS_TOKEN = 'ig-token'
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = 'biz-123'
  mockFetch.mockReset()
  jest.useFakeTimers()
})
afterEach(() => jest.useRealTimers())

it('returns media id after 2-step publish', async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container-999' }) } as any)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'media-888' }) } as any)

  const publishPromise = publishToInstagram('Test caption', 'https://img.example.com/img.jpg')
  jest.advanceTimersByTime(2000)
  const id = await publishPromise
  expect(id).toBe('media-888')
})

it('throws on container creation failure', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: 'Invalid image URL' } }),
  } as any)

  jest.advanceTimersByTime(2000)
  await expect(publishToInstagram('caption', 'bad-url')).rejects.toThrow('Instagram container error')
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `imageUrl` is an empty string | Route returns 400 before calling API |
| Instagram container takes >2s to process | The 2s wait is a heuristic; production could poll container status instead |
| Graph API version changes | Update `GRAPH_BASE` constant |

---

## Acceptance Criteria
- [ ] WHEN POST with valid caption + imageUrl + JWT, THEN returns 201 with `externalId`
- [ ] WHEN `imageUrl` is missing, THEN returns 400 with "Instagram requires an image" message
- [ ] WHEN already published, THEN returns 409
- [ ] WHEN Instagram container creation fails, THEN returns 500

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-007 is Reddit — requires token refresh before each post
**Open questions:** _(fill via /task-handoff)_
