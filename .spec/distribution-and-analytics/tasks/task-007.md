---
task: "007"
feature: distribution-and-analytics
status: COMPLETE
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["001", "003"]
---

# Task 007: Reddit Publish API

## Skills
- .kit/skills/integrations/reddit-automation/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `lib/publish/reddit.ts` (Reddit OAuth token refresh + post submission) and `app/api/publish/reddit/route.ts`.

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/publish/reddit.ts` | Reddit OAuth token refresh + submit post |
| `app/api/publish/reddit/route.ts` | POST handler for Reddit publishing |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# No new packages.

# Env vars:
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REFRESH_TOKEN=
```

---

## API Contracts

### POST /api/publish/reddit
**Request:**
```json
{
  "sessionId": "uuid",
  "title": "Post title here",
  "body": "Post body text",
  "subreddit": "programming"
}
```
**Response 201:** `{ "data": { "externalId": "t3_abc123", "logId": "uuid" } }`
**Response 400:** `{ "error": { "code": "validation_error", "message": "subreddit is required" } }`
**Response 403:** `{ "error": { "code": "forbidden", "message": "Posting to r/{subreddit} is not allowed." } }`
**Response 409:** `{ "error": { "code": "already_published", "message": "Already published to reddit for this session." } }`

---

## Code Templates

### `lib/publish/reddit.ts`

```typescript
import { getRedditSecrets } from './secrets'

const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token'
const REDDIT_SUBMIT_URL = 'https://oauth.reddit.com/api/submit'
const USER_AGENT = 'content-engine/1.0'

interface TokenResponse {
  access_token: string
  token_type: string
}

interface SubmitResponse {
  json: {
    errors: Array<[string, string, string]>
    data?: { url: string; id: string; name: string }
  }
}

export class RedditForbiddenError extends Error {
  constructor(public readonly subreddit: string) {
    super(`Posting to r/${subreddit} is not allowed.`)
    this.name = 'RedditForbiddenError'
  }
}

export async function getRedditAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getRedditSecrets()

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`Reddit token refresh failed: ${response.status}`)
  }

  const data = (await response.json()) as TokenResponse
  return data.access_token
}

export async function submitRedditPost(
  subreddit: string,
  title: string,
  body: string,
  accessToken: string,
): Promise<string> {
  const response = await fetch(REDDIT_SUBMIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: 'self',
      title,
      text: body,
      resubmit: 'true',
    }),
  })

  if (response.status === 403) {
    throw new RedditForbiddenError(subreddit)
  }

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Reddit submit error ${response.status}: ${errText}`)
  }

  const data = (await response.json()) as SubmitResponse

  if (data.json.errors && data.json.errors.length > 0) {
    const [errorCode, errorMsg] = data.json.errors[0]
    throw new Error(`Reddit error [${errorCode}]: ${errorMsg}`)
  }

  return data.json.data?.name ?? 'unknown'
}
```

### `app/api/publish/reddit/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '@/lib/publish/distribution-log'
import { getRedditAccessToken, submitRedditPost, RedditForbiddenError } from '@/lib/publish/reddit'
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

  let body: { sessionId?: unknown; title?: unknown; body?: unknown; subreddit?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json', message: 'Invalid JSON' } }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const postBody = typeof body.body === 'string' ? body.body.trim() : ''
  const subreddit = typeof body.subreddit === 'string' ? body.subreddit.trim().replace(/^r\//, '') : ''

  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId is required' } },
      { status: 400 }
    )
  }
  if (!subreddit) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'subreddit is required' } },
      { status: 400 }
    )
  }
  if (!title) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'title is required' } },
      { status: 400 }
    )
  }

  try {
    await checkAlreadyPublished(supabase, sessionId, 'reddit')
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
    const accessToken = await getRedditAccessToken()
    externalId = await submitRedditPost(subreddit, title, postBody, accessToken)
  } catch (err) {
    if (err instanceof RedditForbiddenError) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: err.message } },
        { status: 403 }
      )
    }
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('publish/reddit error', { error: err instanceof Error ? err.message : String(err) })
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
      platform: 'reddit',
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
- Same auth/idempotency/log pattern as previous publish tasks
- Reddit requires `User-Agent` header — use `'content-engine/1.0'`
- Reddit submit uses `application/x-www-form-urlencoded` (not JSON)
- Token is short-lived; refresh on every request using the stored `REDDIT_REFRESH_TOKEN`
- Strip leading `r/` from subreddit input in route handler

---

## Implementation Steps
1. Create `lib/publish/reddit.ts` from Code Templates.
2. Create `app/api/publish/reddit/route.ts` from Code Templates.

---

## Test Cases

```typescript
// lib/publish/__tests__/reddit.test.ts
import { getRedditAccessToken, submitRedditPost, RedditForbiddenError } from '../reddit'

const mockFetch = jest.spyOn(global, 'fetch')
beforeEach(() => {
  process.env.REDDIT_CLIENT_ID = 'cid'
  process.env.REDDIT_CLIENT_SECRET = 'csecret'
  process.env.REDDIT_REFRESH_TOKEN = 'rtoken'
  mockFetch.mockReset()
})

describe('getRedditAccessToken', () => {
  it('returns access token on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'short-lived-token', token_type: 'bearer' }),
    } as any)
    const token = await getRedditAccessToken()
    expect(token).toBe('short-lived-token')
  })
})

describe('submitRedditPost', () => {
  it('returns post name on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ json: { errors: [], data: { name: 't3_abc123', url: '...', id: 'abc123' } } }),
    } as any)
    const name = await submitRedditPost('programming', 'Title', 'Body', 'access-token')
    expect(name).toBe('t3_abc123')
  })

  it('throws RedditForbiddenError on 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as any)
    await expect(submitRedditPost('privatesubreddit', 'Title', '', 'token'))
      .rejects.toThrow(RedditForbiddenError)
  })
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| Subreddit input has `r/` prefix | Strip it: `subreddit.replace(/^r\//, '')` |
| Reddit returns errors array in JSON body | Throw with first error's message |
| `body` (post text) is empty | Allow — some subreddits accept title-only posts |

---

## Acceptance Criteria
- [ ] WHEN POST with valid subreddit + title + JWT, THEN returns 201 with `externalId` = Reddit post name (e.g. `t3_abc123`)
- [ ] WHEN `subreddit` is empty, THEN returns 400
- [ ] WHEN Reddit returns 403, THEN route returns 403 with subreddit name in message
- [ ] WHEN already published, THEN returns 409

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-008 builds the newsletter dispatch API (Mailchimp + SendGrid)
**Open questions:** _(fill via /task-handoff)_
