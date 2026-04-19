---
task: "018"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: test-expert
depends_on: ["003", "004", "013", "016"]
---

# Task 018: Tests — Publish APIs + Analytics Caching

## Skills
- .kit/skills/testing-quality/tdd-workflow/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md

## Agents
- @test-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Write Jest unit tests for all publish lib functions and analytics caching logic. Four test files: `twitter.test.ts`, `distribution-log.test.ts`, `ga4.test.ts`, `delta.test.ts`. All tests must pass with `npm test`.

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/publish/__tests__/twitter.test.ts` | Tests: postTweet success/429/error, postThread sequence |
| `lib/publish/__tests__/distribution-log.test.ts` | Tests: idempotency check, log write, error handling |
| `lib/analytics/__tests__/ga4.test.ts` | Tests: cache hit (no API call), cache miss (calls API), forceRefresh |
| `lib/analytics/__tests__/delta.test.ts` | Tests: drop detection thresholds, duplicate guard |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# Jest already configured in jest.config.js with ts-jest
# No new packages needed
```

---

## Code Templates

### `lib/publish/__tests__/twitter.test.ts`

```typescript
import { postTweet, postThread, TwitterRateLimitError } from '../twitter'

const mockFetch = jest.spyOn(global, 'fetch')

beforeEach(() => {
  process.env.TWITTER_API_KEY = 'test-api-key'
  process.env.TWITTER_API_SECRET = 'test-api-secret'
  process.env.TWITTER_ACCESS_TOKEN = 'test-access-token'
  process.env.TWITTER_ACCESS_SECRET = 'test-access-secret'
  mockFetch.mockReset()
})

afterAll(() => {
  mockFetch.mockRestore()
})

describe('postTweet', () => {
  it('returns tweet id on 200 success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: '1234567890', text: 'Hello Twitter' } }),
      headers: { get: () => null },
    } as unknown as Response)

    const id = await postTweet('Hello Twitter')
    expect(id).toBe('1234567890')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.twitter.com/2/tweets')
    expect(opts.method).toBe('POST')
    expect(opts.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('throws TwitterRateLimitError on 429', async () => {
    const futureEpoch = Math.floor(Date.now() / 1000) + 900
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: {
        get: (header: string) => header === 'x-rate-limit-reset' ? String(futureEpoch) : null,
      },
      text: async () => 'Rate limit exceeded',
    } as unknown as Response)

    const error = await postTweet('Hello').catch(e => e)
    expect(error).toBeInstanceOf(TwitterRateLimitError)
    expect(error.message).toMatch(/try again in/i)
    expect(typeof error.retryAfter).toBe('number')
  })

  it('throws generic Error on non-429 failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => null },
      text: async () => 'Forbidden',
    } as unknown as Response)

    await expect(postTweet('Hello')).rejects.toThrow('Twitter API error 403')
  })

  it('sends tweet text in JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: 'abc', text: 'test' } }),
      headers: { get: () => null },
    } as unknown as Response)

    await postTweet('My tweet text')
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.text).toBe('My tweet text')
  })
})

describe('postThread', () => {
  it('throws when tweets array is empty', async () => {
    await expect(postThread([])).rejects.toThrow('at least one tweet')
  })

  it('posts each tweet and returns first tweet id', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { id: 'first-id', text: 'Tweet 1' } }),
        headers: { get: () => null },
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { id: 'second-id', text: 'Tweet 2' } }),
        headers: { get: () => null },
      } as unknown as Response)

    const id = await postThread(['Tweet 1', 'Tweet 2'])
    expect(id).toBe('first-id')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('includes reply_to in second tweet', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { id: 'first-id', text: 'T1' } }),
        headers: { get: () => null },
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: { id: 'second-id', text: 'T2' } }),
        headers: { get: () => null },
      } as unknown as Response)

    await postThread(['T1', 'T2'])
    const [, opts2] = mockFetch.mock.calls[1] as [string, RequestInit]
    const body2 = JSON.parse(opts2.body as string)
    expect(body2.reply?.in_reply_to_tweet_id).toBe('first-id')
  })
})
```

### `lib/publish/__tests__/distribution-log.test.ts`

```typescript
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '../distribution-log'

function makeSupabaseSelect(rows: unknown[]) {
  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          eq: (_col2: string, _val2: string) => ({
            eq: (_col3: string, _val3: string) => ({
              limit: (_n: number) => Promise.resolve({ data: rows, error: null }),
            }),
          }),
        }),
      }),
      insert: (_data: unknown) => ({
        select: (_cols: string) => ({
          single: () => Promise.resolve({ data: { id: 'log-uuid-001' }, error: null }),
        }),
      }),
    }),
  }
}

describe('checkAlreadyPublished', () => {
  it('throws AlreadyPublishedError when published log exists', async () => {
    const supabase = makeSupabaseSelect([{ id: 'existing-id' }]) as any
    await expect(checkAlreadyPublished(supabase, 'session-1', 'x'))
      .rejects.toThrow(AlreadyPublishedError)
    await expect(checkAlreadyPublished(supabase, 'session-1', 'x'))
      .rejects.toThrow('Already published to x for this session.')
  })

  it('resolves without throwing when no published log exists', async () => {
    const supabase = makeSupabaseSelect([]) as any
    await expect(checkAlreadyPublished(supabase, 'session-1', 'x'))
      .resolves.toBeUndefined()
  })

  it('does not throw when DB read returns error (fail open)', async () => {
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: null, error: { message: 'DB error' } }) }) }) }) }),
      }),
    } as any
    await expect(checkAlreadyPublished(supabase, 'session-1', 'x')).resolves.toBeUndefined()
  })
})

describe('writeDistributionLog', () => {
  it('returns log id on successful insert', async () => {
    const supabase = makeSupabaseSelect([]) as any
    const id = await writeDistributionLog({
      supabase,
      sessionId: 'session-1',
      userId: 'user-1',
      platform: 'x',
      status: 'published',
      externalId: 'tweet-123',
    })
    expect(id).toBe('log-uuid-001')
  })

  it('throws when insert fails', async () => {
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Insert failed' } }),
          }),
        }),
      }),
    } as any
    await expect(writeDistributionLog({
      supabase,
      sessionId: 's1',
      userId: 'u1',
      platform: 'x',
      status: 'published',
    })).rejects.toThrow('Failed to write distribution log: Insert failed')
  })
})
```

### `lib/analytics/__tests__/ga4.test.ts`

```typescript
import { fetchGA4Data } from '../ga4'

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({ getClient: jest.fn() })),
    },
    analyticsdata: jest.fn().mockReturnValue({
      properties: {
        runReport: jest.fn().mockResolvedValue({
          data: {
            rows: [
              {
                dimensionValues: [{ value: '/blog/test-post' }],
                metricValues: [{ value: '100' }, { value: '250' }],
              },
            ],
            totals: [{ metricValues: [{ value: '1200' }, { value: '3400' }] }],
          },
        }),
      },
    }),
  },
}))

beforeEach(() => {
  process.env.GA4_PROPERTY_ID = '123456789'
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    client_email: 'sa@project.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----\n',
  })
})

function makeFreshSupabase() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  } as any
}

function makeCachedSupabase(cachedData: unknown, fetchedAt: string) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({
                data: [{ data: cachedData, fetched_at: fetchedAt }],
                error: null,
              }),
            }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  } as any
}

describe('fetchGA4Data', () => {
  it('returns data from GA4 API when no cache exists', async () => {
    const supabase = makeFreshSupabase()
    const result = await fetchGA4Data('user-1', supabase, false)

    expect(result.fromCache).toBe(false)
    expect(result.sessions).toBe(1200)
    expect(result.pageViews).toBe(3400)
    expect(result.topPages).toHaveLength(1)
    expect(result.topPages[0].path).toBe('/blog/test-post')
  })

  it('returns cached data when snapshot is fresh (< 24h)', async () => {
    const { google } = require('googleapis')
    const cachedData = {
      period: 'last_30_days',
      sessions: 999,
      pageViews: 1999,
      topPages: [{ path: '/cached', views: 100 }],
      cachedAt: new Date().toISOString(),
    }
    const supabase = makeCachedSupabase(cachedData, new Date().toISOString())
    const result = await fetchGA4Data('user-1', supabase, false)

    expect(result.fromCache).toBe(true)
    expect(result.sessions).toBe(999)
    // Verify GA4 API was NOT called
    expect(google.analyticsdata().properties.runReport).not.toHaveBeenCalled()
  })

  it('bypasses cache when forceRefresh=true', async () => {
    const { google } = require('googleapis')
    google.analyticsdata().properties.runReport.mockClear()

    const cachedData = { sessions: 999, pageViews: 1999, topPages: [], cachedAt: new Date().toISOString() }
    const supabase = makeCachedSupabase(cachedData, new Date().toISOString())
    const result = await fetchGA4Data('user-1', supabase, true)

    expect(result.fromCache).toBe(false)
    expect(google.analyticsdata().properties.runReport).toHaveBeenCalledTimes(1)
  })

  it('fetches fresh data when cache is stale (> 24h)', async () => {
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const staleData = { sessions: 50, pageViews: 100, topPages: [], cachedAt: staleDate }
    const supabase = makeCachedSupabase(staleData, staleDate)
    const result = await fetchGA4Data('user-1', supabase, false)

    expect(result.fromCache).toBe(false)
    expect(result.sessions).toBe(1200) // From mocked GA4 API
  })
})
```

### `lib/analytics/__tests__/delta.test.ts`

```typescript
import { detectRankingDrops, insertRefreshTrigger, runDeltaForUser } from '../delta'

function makeSnapshot(queries: Array<{ query: string; position: number }>) {
  return {
    data: {
      topQueries: queries.map(q => ({ ...q, clicks: 10, impressions: 100 })),
      cachedAt: new Date().toISOString(),
    },
    fetched_at: new Date().toISOString(),
  }
}

describe('detectRankingDrops', () => {
  it('detects drop strictly > 5 positions', () => {
    const old = makeSnapshot([{ query: 'ai content', position: 3 }])
    const newer = makeSnapshot([{ query: 'ai content', position: 10 }])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(1)
    expect(drops[0]).toEqual({ query: 'ai content', oldRank: 3, newRank: 10 })
  })

  it('does NOT detect drop of exactly 5 positions (threshold is strict >5)', () => {
    const old = makeSnapshot([{ query: 'seo tool', position: 2 }])
    const newer = makeSnapshot([{ query: 'seo tool', position: 7 }])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(0)
  })

  it('does NOT detect improvement (position decreasing)', () => {
    const old = makeSnapshot([{ query: 'test', position: 15 }])
    const newer = makeSnapshot([{ query: 'test', position: 1 }])
    expect(detectRankingDrops(old, newer)).toHaveLength(0)
  })

  it('ignores queries only in new snapshot (no old baseline)', () => {
    const old = makeSnapshot([])
    const newer = makeSnapshot([{ query: 'new query', position: 20 }])
    expect(detectRankingDrops(old, newer)).toHaveLength(0)
  })

  it('handles multiple queries with mixed outcomes', () => {
    const old = makeSnapshot([
      { query: 'query-a', position: 1 },
      { query: 'query-b', position: 5 },
      { query: 'query-c', position: 3 },
    ])
    const newer = makeSnapshot([
      { query: 'query-a', position: 8 },  // drop of 7 → triggers
      { query: 'query-b', position: 6 },  // drop of 1 → no trigger
      { query: 'query-c', position: 1 },  // improvement → no trigger
    ])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(1)
    expect(drops[0].query).toBe('query-a')
  })
})

describe('insertRefreshTrigger', () => {
  it('returns true on successful insert', async () => {
    const supabase = {
      from: () => ({ insert: () => Promise.resolve({ error: null }) }),
    } as any
    const result = await insertRefreshTrigger(supabase, {
      userId: 'u1', sessionId: null, query: 'test query', oldRank: 3, newRank: 12,
    })
    expect(result).toBe(true)
  })

  it('returns false on unique constraint violation (error code 23505)', async () => {
    const supabase = {
      from: () => ({ insert: () => Promise.resolve({ error: { code: '23505', message: 'unique constraint' } }) }),
    } as any
    const result = await insertRefreshTrigger(supabase, {
      userId: 'u1', sessionId: null, query: 'duplicate', oldRank: 3, newRank: 12,
    })
    expect(result).toBe(false)
  })

  it('throws on non-unique DB errors', async () => {
    const supabase = {
      from: () => ({ insert: () => Promise.resolve({ error: { code: '42501', message: 'permission denied' } }) }),
    } as any
    await expect(insertRefreshTrigger(supabase, {
      userId: 'u1', sessionId: null, query: 'q', oldRank: 1, newRank: 10,
    })).rejects.toThrow('Failed to insert refresh trigger')
  })
})

describe('runDeltaForUser', () => {
  it('returns 0 when fewer than 2 snapshots exist', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [{ data: {}, fetched_at: new Date().toISOString() }], error: null }),
              }),
            }),
          }),
        }),
      }),
    } as any
    const count = await runDeltaForUser(supabase, 'user-1')
    expect(count).toBe(0)
  })

  it('returns 0 when no drops detected', async () => {
    const now = new Date().toISOString()
    const snapshot1 = { data: { topQueries: [{ query: 'q', position: 3, clicks: 10, impressions: 100 }] }, fetched_at: now }
    const snapshot2 = { data: { topQueries: [{ query: 'q', position: 4, clicks: 9, impressions: 90 }] }, fetched_at: now }

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [snapshot1, snapshot2], error: null }),
              }),
            }),
          }),
        }),
        insert: () => Promise.resolve({ error: null }),
      }),
    } as any
    const count = await runDeltaForUser(supabase, 'user-1')
    expect(count).toBe(0)
  })
})
```

---

## Codebase Context

### Key Code Snippets

Jest config (`jest.config.js`):
```javascript
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
})
```

Run tests: `npm test` or `npm run test:coverage`.

Test files follow existing pattern: co-located in `__tests__/` subdirectories or as `*.test.ts` alongside source.

`lib/publish/__tests__/` directory needs to be created — place all 2 publish test files there.
`lib/analytics/__tests__/` directory needs to be created — place all 2 analytics test files there.

### Key Patterns in Use
- `jest.spyOn(global, 'fetch')` + `.mockResolvedValueOnce()` for fetch mocking
- Supabase client is injected as parameter — mock by returning plain objects matching query chain
- `jest.mock('googleapis', ...)` at module level for googleapis
- `beforeEach(() => mockFetch.mockReset())` to clear mocks between tests
- Chained `.eq()` mocks require nesting that matches the actual Supabase query chain depth

---

## Implementation Steps
1. Create `lib/publish/__tests__/` directory.
2. Create `lib/publish/__tests__/twitter.test.ts` — paste full test from Code Templates.
3. Create `lib/publish/__tests__/distribution-log.test.ts` — paste full test from Code Templates.
4. Create `lib/analytics/__tests__/` directory.
5. Create `lib/analytics/__tests__/ga4.test.ts` — paste full test from Code Templates.
6. Create `lib/analytics/__tests__/delta.test.ts` — paste full test from Code Templates.
7. Run `npm test` and fix any import errors or type mismatches.

---

## Test Cases
All test cases are defined in the Code Templates above. Run with:
```bash
npm test -- --testPathPattern="lib/(publish|analytics)/__tests__"
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `mockFetch.mockResolvedValueOnce` type errors | Cast to `unknown as Response` |
| `googleapis` mock needs updating after task-013 changes | Update mock return value shape to match actual `analyticsdata.properties.runReport` response |
| Test for cache hit fails because `runReport` mock wasn't cleared | Add `jest.clearAllMocks()` or `mockClear()` in `beforeEach` |

---

## Acceptance Criteria
- [ ] WHEN `npm test` runs, THEN all 4 test files pass with 0 failures and 0 errors
- [ ] WHEN Twitter API returns 429, THEN `postTweet` throws `TwitterRateLimitError` with numeric `retryAfter`
- [ ] WHEN fresh cache exists, THEN GA4 API `runReport` is NOT called (verify with mock assertion)
- [ ] WHEN `insertRefreshTrigger` receives error code `23505`, THEN returns `false` without throwing
- [ ] WHEN `checkAlreadyPublished` finds published row, THEN `AlreadyPublishedError` thrown with platform name in message
- [ ] WHEN `detectRankingDrops` sees drop of exactly 5 positions, THEN no drop returned

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** This is the last task. Feature complete.
**Open questions:** _(fill via /task-handoff)_
