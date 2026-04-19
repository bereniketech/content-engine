---
task: "004"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["001", "003"]
---

# Task 004: Twitter/X Publish API

## Skills
- .kit/skills/integrations/x-api/SKILL.md
- .kit/skills/integrations/twitter-automation/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `lib/publish/twitter.ts` (OAuth 1.0a signed requests to Twitter v2 API) and `app/api/publish/x/route.ts` (Next.js route handler with auth, idempotency, and logging).

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/publish/twitter.ts` | Twitter v2 client: OAuth 1.0a signing, postTweet, postThread |
| `app/api/publish/x/route.ts` | POST handler for publishing to X |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# Install OAuth 1.0a signing library:
npm install oauth-1.0a

# Env vars:
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
```

---

## API Contracts

### POST /api/publish/x
**Request body:**
```json
{
  "sessionId": "uuid-string",
  "content": "Tweet text here",
  "contentType": "tweet"
}
```
Or for a thread:
```json
{
  "sessionId": "uuid-string",
  "content": ["Tweet 1", "Tweet 2", "Tweet 3"],
  "contentType": "thread"
}
```

**Response 201:**
```json
{ "data": { "externalId": "1234567890", "logId": "uuid" } }
```
**Response 400:** `{ "error": { "code": "validation_error", "message": "content is required" } }`
**Response 401:** `{ "error": { "code": "unauthorized", "message": "Authentication required" } }`
**Response 409:** `{ "error": { "code": "already_published", "message": "Already published to x for this session." } }`
**Response 429:** `{ "error": { "code": "rate_limited", "message": "Rate limit reached — try again in 900s" } }`
**Response 500:** `{ "error": { "code": "internal_error", "message": "Internal server error" } }`

---

## Code Templates

### `lib/publish/twitter.ts`

```typescript
import crypto from 'crypto'
import { getTwitterSecrets } from './secrets'

interface TweetResponse {
  data: { id: string; text: string }
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

function buildOAuthHeader(
  method: string,
  url: string,
  bodyParams: Record<string, string>,
  secrets: ReturnType<typeof getTwitterSecrets>,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: secrets.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: secrets.accessToken,
    oauth_version: '1.0',
  }

  const allParams = { ...oauthParams, ...bodyParams }
  const sortedParams = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&')

  const sigBaseString = [method.toUpperCase(), percentEncode(url), percentEncode(sortedParams)].join('&')
  const signingKey = `${percentEncode(secrets.apiSecret)}&${percentEncode(secrets.accessSecret)}`
  const signature = crypto.createHmac('sha1', signingKey).update(sigBaseString).digest('base64')

  oauthParams['oauth_signature'] = signature

  const headerValue = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ')

  return `OAuth ${headerValue}`
}

export class TwitterRateLimitError extends Error {
  constructor(public readonly retryAfter: number) {
    super(`Rate limit reached — try again in ${retryAfter}s`)
    this.name = 'TwitterRateLimitError'
  }
}

export async function postTweet(text: string): Promise<string> {
  const secrets = getTwitterSecrets()
  const url = 'https://api.twitter.com/2/tweets'
  const body = JSON.stringify({ text })

  const oauthHeader = buildOAuthHeader('POST', url, {}, secrets)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader,
      'Content-Type': 'application/json',
    },
    body,
  })

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('x-rate-limit-reset') ?? '900', 10)
    const remaining = retryAfter - Math.floor(Date.now() / 1000)
    throw new TwitterRateLimitError(Math.max(remaining, 60))
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Twitter API error ${response.status}: ${errorBody}`)
  }

  const json = (await response.json()) as TweetResponse
  return json.data.id
}

export async function postThread(tweets: string[]): Promise<string> {
  if (tweets.length === 0) throw new Error('Thread must have at least one tweet')

  let replyToId: string | undefined
  let firstId: string | undefined

  for (const text of tweets) {
    const secrets = getTwitterSecrets()
    const url = 'https://api.twitter.com/2/tweets'
    const bodyObj = replyToId
      ? { text, reply: { in_reply_to_tweet_id: replyToId } }
      : { text }
    const body = JSON.stringify(bodyObj)

    const oauthHeader = buildOAuthHeader('POST', url, {}, secrets)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: oauthHeader,
        'Content-Type': 'application/json',
      },
      body,
    })

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('x-rate-limit-reset') ?? '900', 10)
      const remaining = retryAfter - Math.floor(Date.now() / 1000)
      throw new TwitterRateLimitError(Math.max(remaining, 60))
    }

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Twitter API error ${response.status}: ${errorBody}`)
    }

    const json = (await response.json()) as TweetResponse
    if (!firstId) firstId = json.data.id
    replyToId = json.data.id
  }

  return firstId!
}
```

### `app/api/publish/x/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '@/lib/publish/distribution-log'
import { postTweet, postThread, TwitterRateLimitError } from '@/lib/publish/twitter'
import { ConfigError } from '@/lib/publish/secrets'

type PublishXBody = {
  sessionId?: unknown
  content?: unknown
  contentType?: unknown
}

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

  let body: PublishXBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
      { status: 400 }
    )
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const contentType = typeof body.contentType === 'string' ? body.contentType : 'tweet'

  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId is required' } },
      { status: 400 }
    )
  }

  if (!body.content) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'content is required' } },
      { status: 400 }
    )
  }

  try {
    await checkAlreadyPublished(supabase, sessionId, 'x')
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
    if (contentType === 'thread' && Array.isArray(body.content)) {
      externalId = await postThread(body.content as string[])
    } else {
      const text = typeof body.content === 'string' ? body.content : String(body.content)
      externalId = await postTweet(text)
    }
  } catch (err) {
    if (err instanceof TwitterRateLimitError) {
      return NextResponse.json(
        { error: { code: 'rate_limited', message: err.message } },
        { status: 429 }
      )
    }
    if (err instanceof ConfigError) {
      console.error('publish/x config error', { varName: err.varName })
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('publish/x error', { error: err instanceof Error ? err.message : String(err) })
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
      platform: 'x',
      status: 'published',
      externalId,
    })
  } catch (err) {
    console.error('publish/x log write error', { error: err instanceof Error ? err.message : String(err) })
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

### Key Code Snippets

`requireAuth` usage pattern (from `app/api/distribute/route.ts`):
```typescript
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
```

`lib/publish/secrets.ts` — `getTwitterSecrets()` returns `{ apiKey, apiSecret, accessToken, accessSecret }`.
`lib/publish/distribution-log.ts` — `checkAlreadyPublished`, `writeDistributionLog`, `AlreadyPublishedError`.

### Key Patterns in Use
- All route handlers parse JSON with try/catch and return 400 on parse failure
- Generic 500 message in responses; detailed error only in `console.error`
- `NextResponse.json(payload, { status: N })` pattern throughout

---

## Implementation Steps
1. `lib/publish/twitter.ts` — create with full OAuth 1.0a implementation from Code Templates.
2. `app/api/publish/x/route.ts` — create with full route handler from Code Templates.
3. Run `npm install oauth-1.0a` to add the type-safe dependency (note: the implementation above uses `crypto` directly instead to avoid the extra dependency — skip npm install if using the crypto-based implementation shown).

---

## Test Cases

```typescript
// lib/publish/__tests__/twitter.test.ts
import { postTweet, TwitterRateLimitError } from '../twitter'

const mockFetch = jest.spyOn(global, 'fetch')

beforeEach(() => {
  process.env.TWITTER_API_KEY = 'key'
  process.env.TWITTER_API_SECRET = 'secret'
  process.env.TWITTER_ACCESS_TOKEN = 'atoken'
  process.env.TWITTER_ACCESS_SECRET = 'asecret'
  mockFetch.mockReset()
})

it('returns tweet id on success', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ data: { id: '123456', text: 'hello' } }),
    headers: { get: () => null },
  } as any)

  const id = await postTweet('Hello Twitter')
  expect(id).toBe('123456')
  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.twitter.com/2/tweets',
    expect.objectContaining({ method: 'POST' })
  )
})

it('throws TwitterRateLimitError on 429', async () => {
  const futureEpoch = Math.floor(Date.now() / 1000) + 900
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 429,
    headers: { get: (h: string) => h === 'x-rate-limit-reset' ? String(futureEpoch) : null },
    text: async () => 'Rate limit exceeded',
  } as any)

  await expect(postTweet('Hello')).rejects.toThrow(TwitterRateLimitError)
})

it('throws generic Error on non-429 failure', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 403,
    headers: { get: () => null },
    text: async () => 'Forbidden',
  } as any)

  await expect(postTweet('Hello')).rejects.toThrow('Twitter API error 403')
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `contentType` is `'thread'` but `content` is a string | Treat as single tweet — call `postTweet` |
| Thread has 0 items | Throw validation error before calling Twitter API |
| `oauth-1.0a` package not available | Use the Node `crypto`-based implementation in the template (no external dependency) |

---

## Acceptance Criteria
- [ ] WHEN POST `/api/publish/x` with valid tweet text and valid JWT, THEN returns 201 with `externalId` and `logId`
- [ ] WHEN POST `/api/publish/x` with `contentType: 'thread'` and array content, THEN posts each tweet in sequence
- [ ] WHEN same sessionId + platform already has published log, THEN returns 409
- [ ] WHEN Twitter API returns 429, THEN route returns 429 with `retry_after` in message
- [ ] WHEN request has no Authorization header, THEN returns 401
- [ ] WHEN `TWITTER_API_KEY` env var missing, THEN returns 500 with `config_error`

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-005 follows identical pattern for LinkedIn — same auth, idempotency, log pattern
**Open questions:** _(fill via /task-handoff)_
