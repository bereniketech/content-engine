---
task: "013"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["002"]
---

# Task 013: GA4 Analytics API

## Skills
- .kit/skills/integrations/google-analytics-automation/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `lib/analytics/ga4.ts` (GA4 Data API fetcher with 24h Supabase snapshot cache) and `app/api/analytics/ga4/route.ts` (authenticated GET endpoint).

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/analytics/ga4.ts` | GA4 Data API client + 24h cache via analytics_snapshots |
| `app/api/analytics/ga4/route.ts` | GET handler returning GA4 data |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# Install Google APIs Node.js client:
npm install googleapis

# Env vars:
GA4_PROPERTY_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

---

## API Contracts

### GET /api/analytics/ga4
**Query params:** `?forceRefresh=true` (bypass 24h cache)
**Headers:** `Authorization: Bearer <jwt>`

**Response 200:**
```json
{
  "data": {
    "period": "last_30_days",
    "sessions": 1240,
    "pageViews": 3820,
    "topPages": [
      { "path": "/blog/how-to-use-ai", "views": 540 },
      { "path": "/blog/seo-guide", "views": 320 }
    ],
    "cachedAt": "2026-04-19T10:00:00.000Z",
    "fromCache": true
  }
}
```
**Response 500 (missing config):**
```json
{ "error": { "code": "config_error", "message": "Missing configuration: GA4_PROPERTY_ID" } }
```

---

## Code Templates

### `lib/analytics/ga4.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { getGoogleSecrets } from '@/lib/publish/secrets'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface GA4Data {
  period: 'last_30_days'
  sessions: number
  pageViews: number
  topPages: Array<{ path: string; views: number }>
  cachedAt: string
  fromCache: boolean
}

function getAnalyticsClient() {
  const { serviceAccountJson } = getGoogleSecrets()
  const credentials = JSON.parse(serviceAccountJson) as {
    client_email: string
    private_key: string
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })

  return { auth, analyticsData: google.analyticsdata({ version: 'v1beta', auth }) }
}

async function fetchFromGA4(): Promise<Omit<GA4Data, 'cachedAt' | 'fromCache'>> {
  const { ga4PropertyId } = getGoogleSecrets()
  const { analyticsData } = getAnalyticsClient()

  const response = await analyticsData.properties.runReport({
    property: `properties/${ga4PropertyId}`,
    requestBody: {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      dimensions: [{ name: 'pagePath' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 5,
    },
  })

  const rows = response.data.rows ?? []
  let totalSessions = 0
  let totalPageViews = 0
  const topPages: Array<{ path: string; views: number }> = []

  // Totals row
  const totalsRow = response.data.totals?.[0]
  if (totalsRow?.metricValues) {
    totalSessions = parseInt(totalsRow.metricValues[0]?.value ?? '0', 10)
    totalPageViews = parseInt(totalsRow.metricValues[1]?.value ?? '0', 10)
  }

  for (const row of rows) {
    const path = row.dimensionValues?.[0]?.value ?? '/'
    const views = parseInt(row.metricValues?.[1]?.value ?? '0', 10)
    topPages.push({ path, views })
  }

  return {
    period: 'last_30_days',
    sessions: totalSessions,
    pageViews: totalPageViews,
    topPages,
  }
}

export async function fetchGA4Data(
  userId: string,
  supabase: SupabaseClient,
  forceRefresh = false,
): Promise<GA4Data> {
  if (!forceRefresh) {
    // Check for fresh cached snapshot
    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('data, fetched_at')
      .eq('user_id', userId)
      .eq('source', 'ga4')
      .order('fetched_at', { ascending: false })
      .limit(1)

    const latest = snapshots?.[0]
    if (latest) {
      const age = Date.now() - new Date(latest.fetched_at).getTime()
      if (age < CACHE_TTL_MS) {
        const cachedData = latest.data as Omit<GA4Data, 'fromCache'>
        return { ...cachedData, fromCache: true }
      }
    }
  }

  // Fetch fresh data
  const freshData = await fetchFromGA4()
  const cachedAt = new Date().toISOString()

  // Save to analytics_snapshots
  await supabase.from('analytics_snapshots').insert({
    user_id: userId,
    source: 'ga4',
    data: { ...freshData, cachedAt },
    fetched_at: cachedAt,
  })

  return { ...freshData, cachedAt, fromCache: false }
}
```

### `app/api/analytics/ga4/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { fetchGA4Data } from '@/lib/analytics/ga4'
import { ConfigError } from '@/lib/publish/secrets'

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
  const { user, supabase } = auth

  const forceRefresh = request.nextUrl.searchParams.get('forceRefresh') === 'true'

  try {
    const data = await fetchGA4Data(user.id, supabase, forceRefresh)
    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('analytics/ga4 error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
```

---

## Codebase Context

### Key Code Snippets

`getGoogleSecrets()` returns `{ ga4PropertyId, searchConsoleSiteUrl, serviceAccountJson }` — from `lib/publish/secrets.ts` (created in task-003).

`ConfigError` — from `lib/publish/secrets.ts`, thrown when env var is missing.

Supabase snapshot check pattern:
```typescript
const { data: snapshots } = await supabase
  .from('analytics_snapshots')
  .select('data, fetched_at')
  .eq('user_id', userId)
  .eq('source', 'ga4')
  .order('fetched_at', { ascending: false })
  .limit(1)
```

`analytics_snapshots` table columns: `id, user_id, source, data (jsonb), fetched_at`.

### Key Patterns in Use
- Service account JSON is passed as a single env var (stringified JSON) — parse with `JSON.parse()`
- `googleapis` library: `google.analyticsdata({ version: 'v1beta', auth })` — use `v1beta` not `v1`
- Cache-first pattern: check snapshot age < 24h before calling external API
- `forceRefresh=true` query param bypasses cache check

---

## Implementation Steps
1. Run `npm install googleapis`.
2. Create `lib/analytics/` directory.
3. Create `lib/analytics/ga4.ts` — paste full code from Code Templates.
4. Create `app/api/analytics/ga4/route.ts` — paste full code from Code Templates.

---

## Test Cases

```typescript
// lib/analytics/__tests__/ga4.test.ts
import { fetchGA4Data } from '../ga4'

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: jest.fn().mockImplementation(() => ({})) },
    analyticsdata: jest.fn().mockReturnValue({
      properties: {
        runReport: jest.fn().mockResolvedValue({
          data: {
            rows: [{ dimensionValues: [{ value: '/blog/test' }], metricValues: [{ value: '100' }, { value: '200' }] }],
            totals: [{ metricValues: [{ value: '500' }, { value: '1200' }] }],
          },
        }),
      },
    }),
  },
}))

const mockSupabaseWithCache = (rows: unknown[]) => ({
  from: () => ({
    select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: rows }) }) }) }) }),
    insert: () => Promise.resolve({ error: null }),
  }),
})

describe('fetchGA4Data', () => {
  beforeEach(() => {
    process.env.GA4_PROPERTY_ID = 'properties/123'
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'test@test.iam.gserviceaccount.com', private_key: 'fake-key' })
  })

  it('returns cached data when fresh snapshot exists', async () => {
    const cached = { period: 'last_30_days', sessions: 999, pageViews: 1999, topPages: [], cachedAt: new Date().toISOString() }
    const supabase = mockSupabaseWithCache([{ data: cached, fetched_at: new Date().toISOString() }]) as any
    const result = await fetchGA4Data('user-1', supabase, false)
    expect(result.sessions).toBe(999)
    expect(result.fromCache).toBe(true)
  })

  it('fetches from GA4 API when cache is stale', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25h ago
    const staleCache = { data: {}, fetched_at: oldDate }
    const supabase = mockSupabaseWithCache([staleCache]) as any
    const result = await fetchGA4Data('user-1', supabase, false)
    expect(result.fromCache).toBe(false)
    expect(result.sessions).toBe(500)
  })
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` is not valid JSON | `JSON.parse()` throws — caught by route handler → 500 internal_error |
| Cache snapshot older than 24h | Fetch from GA4 API and save new snapshot |
| `forceRefresh=true` | Skip cache check entirely |
| GA4 API quota exceeded | googleapis throws → caught → 500 internal_error |

---

## Acceptance Criteria
- [ ] WHEN GET with valid JWT and fresh cache exists, THEN returns cached data with `fromCache: true` without calling GA4 API
- [ ] WHEN no cache or stale cache, THEN calls GA4 API and returns `fromCache: false`
- [ ] WHEN `forceRefresh=true`, THEN always calls GA4 API
- [ ] WHEN `GA4_PROPERTY_ID` missing, THEN returns 500 config_error
- [ ] WHEN unauthenticated, THEN returns 401

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-014 follows identical cache pattern for Search Console API
**Open questions:** _(fill via /task-handoff)_
