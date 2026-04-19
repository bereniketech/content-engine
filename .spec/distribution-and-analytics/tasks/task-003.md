---
task: "003"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["001", "002"]
---

# Task 003: Shared Helpers — distribution-log + secrets accessors

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
Create `lib/publish/distribution-log.ts` (idempotency check + log writer) and `lib/publish/secrets.ts` (typed env accessors for all 7 platform credential sets). These are shared by every publish route handler.

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/publish/distribution-log.ts` | Check already-published and write log row |
| `lib/publish/secrets.ts` | Typed env accessors for all platform credentials |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# No new packages needed.

# Env vars (must exist in .env for publish features to work):
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
LINKEDIN_ACCESS_TOKEN=
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REFRESH_TOKEN=
MAILCHIMP_API_KEY=
MAILCHIMP_AUDIENCE_ID=
SENDGRID_API_KEY=
GA4_PROPERTY_ID=
GOOGLE_SEARCH_CONSOLE_SITE_URL=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

---

## Code Templates

### `lib/publish/distribution-log.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export class AlreadyPublishedError extends Error {
  constructor(public readonly platform: string) {
    super(`Already published to ${platform} for this session.`)
    this.name = 'AlreadyPublishedError'
  }
}

export interface WriteDistributionLogParams {
  supabase: SupabaseClient
  sessionId: string
  userId: string
  platform: string
  status: 'published' | 'failed'
  externalId?: string
  metadata?: Record<string, unknown>
  errorDetails?: string
}

/**
 * Throws AlreadyPublishedError if a 'published' log already exists
 * for this session_id + platform combination.
 */
export async function checkAlreadyPublished(
  supabase: SupabaseClient,
  sessionId: string,
  platform: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('distribution_logs')
    .select('id')
    .eq('session_id', sessionId)
    .eq('platform', platform)
    .eq('status', 'published')
    .limit(1)

  if (error) {
    // Don't block publish on DB read error — log and continue
    console.error('distribution-log check error', { sessionId, platform, error: error.message })
    return
  }

  if (data && data.length > 0) {
    throw new AlreadyPublishedError(platform)
  }
}

/**
 * Inserts a row into distribution_logs and returns the log id.
 */
export async function writeDistributionLog(params: WriteDistributionLogParams): Promise<string> {
  const {
    supabase,
    sessionId,
    userId,
    platform,
    status,
    externalId,
    metadata = {},
    errorDetails,
  } = params

  const { data, error } = await supabase
    .from('distribution_logs')
    .insert({
      session_id: sessionId,
      user_id: userId,
      platform,
      status,
      external_id: externalId ?? null,
      metadata,
      error_details: errorDetails ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to write distribution log: ${error?.message ?? 'unknown error'}`)
  }

  return data.id as string
}
```

### `lib/publish/secrets.ts`

```typescript
export class ConfigError extends Error {
  constructor(public readonly varName: string) {
    super(`Missing required environment variable: ${varName}`)
    this.name = 'ConfigError'
  }
}

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new ConfigError(name)
  return val
}

export function getTwitterSecrets() {
  return {
    apiKey: requireEnv('TWITTER_API_KEY'),
    apiSecret: requireEnv('TWITTER_API_SECRET'),
    accessToken: requireEnv('TWITTER_ACCESS_TOKEN'),
    accessSecret: requireEnv('TWITTER_ACCESS_SECRET'),
  }
}

export function getLinkedInSecrets() {
  return {
    accessToken: requireEnv('LINKEDIN_ACCESS_TOKEN'),
  }
}

export function getInstagramSecrets() {
  return {
    accessToken: requireEnv('INSTAGRAM_ACCESS_TOKEN'),
    businessAccountId: requireEnv('INSTAGRAM_BUSINESS_ACCOUNT_ID'),
  }
}

export function getRedditSecrets() {
  return {
    clientId: requireEnv('REDDIT_CLIENT_ID'),
    clientSecret: requireEnv('REDDIT_CLIENT_SECRET'),
    refreshToken: requireEnv('REDDIT_REFRESH_TOKEN'),
  }
}

export function getMailchimpSecrets() {
  return {
    apiKey: requireEnv('MAILCHIMP_API_KEY'),
    audienceId: requireEnv('MAILCHIMP_AUDIENCE_ID'),
  }
}

export function getSendGridSecrets() {
  return {
    apiKey: requireEnv('SENDGRID_API_KEY'),
  }
}

export function getGoogleSecrets() {
  return {
    ga4PropertyId: requireEnv('GA4_PROPERTY_ID'),
    searchConsoleSiteUrl: requireEnv('GOOGLE_SEARCH_CONSOLE_SITE_URL'),
    serviceAccountJson: requireEnv('GOOGLE_SERVICE_ACCOUNT_JSON'),
  }
}
```

---

## Codebase Context

### Key Code Snippets

Auth pattern used in every API route (from `lib/auth.ts`):
```typescript
export async function requireAuth(
  request: NextRequest,
): Promise<{ user: User; token: string; supabase: SupabaseClient }> {
  // ... returns { user, token, supabase }
}
```

Supabase insert pattern (from `app/api/distribute/route.ts`):
```typescript
const { data: savedAsset, error: saveError } = await supabase.from('content_assets').insert({
  session_id: sessionId,
  asset_type: 'distribution',
  content: distribution,
}).select('*').single()
```

### Key Patterns in Use
- All Supabase operations use the user's scoped client (from `requireAuth`) — never the service role
- Error pattern: `throw new Error(message)` in lib functions; route handlers catch and return JSON
- No `console.log` of secret values — only log variable names

---

## Implementation Steps
1. Create `lib/publish/` directory if it doesn't exist.
2. `lib/publish/distribution-log.ts` — paste full code from Code Templates.
3. `lib/publish/secrets.ts` — paste full code from Code Templates.

---

## Test Cases

```typescript
// lib/publish/__tests__/distribution-log.test.ts
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '../distribution-log'

function makeSupabase(rows: unknown[]) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: rows, error: null }),
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'log-id-123' }, error: null }),
        }),
      }),
    }),
  } as any
}

describe('checkAlreadyPublished', () => {
  it('throws AlreadyPublishedError when published log exists', async () => {
    const supabase = makeSupabase([{ id: 'existing-log' }])
    await expect(checkAlreadyPublished(supabase, 'session-1', 'x'))
      .rejects.toThrow(AlreadyPublishedError)
  })

  it('does not throw when no published log exists', async () => {
    const supabase = makeSupabase([])
    await expect(checkAlreadyPublished(supabase, 'session-1', 'x')).resolves.toBeUndefined()
  })
})

describe('writeDistributionLog', () => {
  it('returns log id on success', async () => {
    const supabase = makeSupabase([])
    const id = await writeDistributionLog({
      supabase,
      sessionId: 'session-1',
      userId: 'user-1',
      platform: 'x',
      status: 'published',
      externalId: 'tweet-123',
    })
    expect(id).toBe('log-id-123')
  })
})
```

```typescript
// lib/publish/__tests__/secrets.test.ts
import { getTwitterSecrets, ConfigError } from '../secrets'

describe('getTwitterSecrets', () => {
  it('throws ConfigError when TWITTER_API_KEY is missing', () => {
    const orig = process.env.TWITTER_API_KEY
    delete process.env.TWITTER_API_KEY
    expect(() => getTwitterSecrets()).toThrow(ConfigError)
    process.env.TWITTER_API_KEY = orig
  })

  it('returns all keys when env vars are set', () => {
    process.env.TWITTER_API_KEY = 'k'
    process.env.TWITTER_API_SECRET = 's'
    process.env.TWITTER_ACCESS_TOKEN = 'at'
    process.env.TWITTER_ACCESS_SECRET = 'as'
    const secrets = getTwitterSecrets()
    expect(secrets.apiKey).toBe('k')
  })
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `checkAlreadyPublished` DB read fails | Log error but do NOT block the publish (fail open) |
| `writeDistributionLog` DB write fails | Throw error — route handler returns 500 |
| Env var is empty string `""` | `requireEnv` treats empty string as missing (falsy check) |

---

## Acceptance Criteria
- [ ] WHEN `checkAlreadyPublished` finds a published row, THEN throws `AlreadyPublishedError` with platform name in message
- [ ] WHEN `checkAlreadyPublished` finds no rows, THEN resolves without throwing
- [ ] WHEN `writeDistributionLog` called with valid params, THEN inserts row and returns string id
- [ ] WHEN `getTwitterSecrets` called with missing `TWITTER_API_KEY`, THEN throws `ConfigError` with var name
- [ ] WHEN all Twitter env vars set, THEN `getTwitterSecrets` returns object with all 4 keys

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-004 uses `getTwitterSecrets`, `checkAlreadyPublished`, and `writeDistributionLog` directly
**Open questions:** _(fill via /task-handoff)_
