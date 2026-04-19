---
task: "005"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["001", "003"]
---

# Task 005: LinkedIn Publish API

## Skills
- .kit/skills/integrations/linkedin-automation/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `lib/publish/linkedin.ts` (LinkedIn Share API v2 client) and `app/api/publish/linkedin/route.ts` (Next.js route handler).

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/publish/linkedin.ts` | LinkedIn API client: get person URN, post to ugcPosts |
| `app/api/publish/linkedin/route.ts` | POST handler for LinkedIn publishing |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# No new packages needed (uses fetch).

# Env vars:
LINKEDIN_ACCESS_TOKEN=
```

---

## API Contracts

### POST /api/publish/linkedin
**Request:**
```json
{
  "sessionId": "uuid",
  "content": "Post body text here",
  "contentType": "storytelling"
}
```
**Response 201:** `{ "data": { "externalId": "urn:li:share:123456789", "logId": "uuid" } }`
**Response 401:** `{ "error": { "code": "token_expired", "message": "LinkedIn token expired — reconnect LinkedIn in settings." } }`
**Response 409:** `{ "error": { "code": "already_published", "message": "Already published to linkedin for this session." } }`

---

## Code Templates

### `lib/publish/linkedin.ts`

```typescript
import { getLinkedInSecrets } from './secrets'

export class LinkedInAuthError extends Error {
  constructor() {
    super('LinkedIn token expired — reconnect LinkedIn in settings.')
    this.name = 'LinkedInAuthError'
  }
}

async function getPersonUrn(accessToken: string): Promise<string> {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202312',
    },
  })

  if (response.status === 401 || response.status === 403) {
    throw new LinkedInAuthError()
  }

  if (!response.ok) {
    throw new Error(`LinkedIn userinfo error ${response.status}`)
  }

  const data = (await response.json()) as { sub: string }
  return `urn:li:person:${data.sub}`
}

export async function postToLinkedIn(content: string): Promise<string> {
  const { accessToken } = getLinkedInSecrets()
  const personUrn = await getPersonUrn(accessToken)

  const body = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202312',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  if (response.status === 401 || response.status === 403) {
    throw new LinkedInAuthError()
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`)
  }

  const locationHeader = response.headers.get('x-restli-id') ?? response.headers.get('location') ?? 'unknown'
  return locationHeader
}
```

### `app/api/publish/linkedin/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '@/lib/publish/distribution-log'
import { postToLinkedIn, LinkedInAuthError } from '@/lib/publish/linkedin'
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

  let body: { sessionId?: unknown; content?: unknown; contentType?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Invalid JSON' } },
      { status: 400 }
    )
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''

  if (!sessionId || !content) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId and content are required' } },
      { status: 400 }
    )
  }

  try {
    await checkAlreadyPublished(supabase, sessionId, 'linkedin')
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
    externalId = await postToLinkedIn(content)
  } catch (err) {
    if (err instanceof LinkedInAuthError) {
      return NextResponse.json(
        { error: { code: 'token_expired', message: err.message } },
        { status: 401 }
      )
    }
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('publish/linkedin error', { error: err instanceof Error ? err.message : String(err) })
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
      platform: 'linkedin',
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
- Auth: `requireAuth(request)` → `{ user, supabase }` — same as task-004
- Idempotency: `checkAlreadyPublished(supabase, sessionId, 'linkedin')` → throws `AlreadyPublishedError`
- Logging: `writeDistributionLog({ supabase, sessionId, userId: user.id, platform: 'linkedin', status: 'published', externalId })`
- All external errors caught, logged via `console.error`, generic 500 returned to client

---

## Implementation Steps
1. Create `lib/publish/linkedin.ts` — paste Code Templates.
2. Create `app/api/publish/linkedin/route.ts` — paste Code Templates.

---

## Test Cases

```typescript
// lib/publish/__tests__/linkedin.test.ts
import { postToLinkedIn, LinkedInAuthError } from '../linkedin'

const mockFetch = jest.spyOn(global, 'fetch')
beforeEach(() => {
  process.env.LINKEDIN_ACCESS_TOKEN = 'test-token'
  mockFetch.mockReset()
})

it('returns share URN on success', async () => {
  // First call: userinfo
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ sub: 'abc123' }),
      headers: { get: () => null },
    } as any)
    // Second call: ugcPosts
    .mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: (h: string) => h === 'x-restli-id' ? 'urn:li:share:999' : null },
      json: async () => ({}),
    } as any)

  const urn = await postToLinkedIn('Hello LinkedIn')
  expect(urn).toBe('urn:li:share:999')
})

it('throws LinkedInAuthError on 401 from userinfo', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 401,
    headers: { get: () => null },
    json: async () => ({}),
  } as any)

  await expect(postToLinkedIn('Hello')).rejects.toThrow(LinkedInAuthError)
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| LinkedIn `ugcPosts` returns no `x-restli-id` header | Use `location` header fallback; if both missing return `'unknown'` |
| `LINKEDIN_ACCESS_TOKEN` missing | `ConfigError` thrown by `getLinkedInSecrets()` → route returns 500 |

---

## Acceptance Criteria
- [ ] WHEN POST with valid content and JWT, THEN returns 201 with `externalId` and `logId`
- [ ] WHEN LinkedIn returns 401, THEN route returns 401 with reconnect message
- [ ] WHEN session already published to linkedin, THEN returns 409
- [ ] WHEN `LINKEDIN_ACCESS_TOKEN` not set, THEN returns 500 config_error

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-006 follows same pattern for Instagram (2-step publish: container + publish)
**Open questions:** _(fill via /task-handoff)_
