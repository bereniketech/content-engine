---
task: "014"
feature: distribution-and-analytics
status: COMPLETE
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["002", "013"]
---

# Task 014: Search Console Analytics API

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
Create `lib/analytics/search-console.ts` (Search Console API fetcher with 24h snapshot cache) and `app/api/analytics/search-console/route.ts`. Follows the identical cache pattern as task-013's GA4 implementation.

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/analytics/search-console.ts` | Search Console API client + 24h cache |
| `app/api/analytics/search-console/route.ts` | GET handler returning Search Console data |

### Modify
| File | What to change |
|---|---|
| — | None (`googleapis` already installed in task-013) |

---

## Dependencies
```bash
# Already installed in task-013: googleapis
# Env vars:
GOOGLE_SEARCH_CONSOLE_SITE_URL=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

---

## API Contracts

### GET /api/analytics/search-console
**Query params:** `?forceRefresh=true`
**Headers:** `Authorization: Bearer <jwt>`

**Response 200:**
```json
{
  "data": {
    "period": "last_28_days",
    "totalClicks": 320,
    "totalImpressions": 8400,
    "averageCtr": 0.038,
    "topQueries": [
      { "query": "ai content engine", "clicks": 80, "impressions": 1200, "position": 4.2 },
      { "query": "seo automation tool", "clicks": 60, "impressions": 900, "position": 5.1 }
    ],
    "cachedAt": "2026-04-19T10:00:00.000Z",
    "fromCache": false
  }
}
```

---

## Code Templates

### `lib/analytics/search-console.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { getGoogleSecrets } from '@/lib/publish/secrets'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface SearchConsoleData {
  period: 'last_28_days'
  totalClicks: number
  totalImpressions: number
  averageCtr: number
  topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>
  cachedAt: string
  fromCache: boolean
}

function getSearchConsoleClient() {
  const { serviceAccountJson } = getGoogleSecrets()
  const credentials = JSON.parse(serviceAccountJson) as {
    client_email: string
    private_key: string
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })

  return google.searchconsole({ version: 'v1', auth })
}

async function fetchFromSearchConsole(): Promise<Omit<SearchConsoleData, 'cachedAt' | 'fromCache'>> {
  const { searchConsoleSiteUrl } = getGoogleSecrets()
  const client = getSearchConsoleClient()

  // Calculate date range: last 28 days
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 28)

  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  const response = await client.searchanalytics.query({
    siteUrl: searchConsoleSiteUrl,
    requestBody: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ['query'],
      rowLimit: 10,
      type: 'web',
    },
  })

  const rows = response.data.rows ?? []

  let totalClicks = 0
  let totalImpressions = 0
  let ctrSum = 0

  const topQueries = rows.map((row) => {
    const clicks = row.clicks ?? 0
    const impressions = row.impressions ?? 0
    const ctr = row.ctr ?? 0
    const position = row.position ?? 0

    totalClicks += clicks
    totalImpressions += impressions
    ctrSum += ctr

    return {
      query: (row.keys?.[0] ?? ''),
      clicks,
      impressions,
      position: Math.round(position * 10) / 10,
    }
  })

  const averageCtr = rows.length > 0 ? Math.round((ctrSum / rows.length) * 1000) / 1000 : 0

  return {
    period: 'last_28_days',
    totalClicks,
    totalImpressions,
    averageCtr,
    topQueries,
  }
}

export async function fetchSearchConsoleData(
  userId: string,
  supabase: SupabaseClient,
  forceRefresh = false,
): Promise<SearchConsoleData> {
  if (!forceRefresh) {
    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('data, fetched_at')
      .eq('user_id', userId)
      .eq('source', 'search_console')
      .order('fetched_at', { ascending: false })
      .limit(1)

    const latest = snapshots?.[0]
    if (latest) {
      const age = Date.now() - new Date(latest.fetched_at).getTime()
      if (age < CACHE_TTL_MS) {
        const cachedData = latest.data as Omit<SearchConsoleData, 'fromCache'>
        return { ...cachedData, fromCache: true }
      }
    }
  }

  const freshData = await fetchFromSearchConsole()
  const cachedAt = new Date().toISOString()

  await supabase.from('analytics_snapshots').insert({
    user_id: userId,
    source: 'search_console',
    data: { ...freshData, cachedAt },
    fetched_at: cachedAt,
  })

  return { ...freshData, cachedAt, fromCache: false }
}
```

### `app/api/analytics/search-console/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { fetchSearchConsoleData } from '@/lib/analytics/search-console'
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
    const data = await fetchSearchConsoleData(user.id, supabase, forceRefresh)
    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('analytics/search-console error', { error: err instanceof Error ? err.message : String(err) })
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

Cache check pattern (identical to GA4, from task-013):
```typescript
const { data: snapshots } = await supabase
  .from('analytics_snapshots')
  .select('data, fetched_at')
  .eq('user_id', userId)
  .eq('source', 'search_console')  // ← only difference from GA4
  .order('fetched_at', { ascending: false })
  .limit(1)
```

`getGoogleSecrets()` from `lib/publish/secrets.ts`:
```typescript
export function getGoogleSecrets() {
  return {
    ga4PropertyId: requireEnv('GA4_PROPERTY_ID'),
    searchConsoleSiteUrl: requireEnv('GOOGLE_SEARCH_CONSOLE_SITE_URL'),
    serviceAccountJson: requireEnv('GOOGLE_SERVICE_ACCOUNT_JSON'),
  }
}
```

Search Console API uses `google.searchconsole({ version: 'v1', auth })` — different from `analyticsdata`.

### Key Patterns in Use
- Same cache-first, 24h TTL, snapshot insert pattern as GA4
- `source` field is `'search_console'` (not `'ga4'`)
- Position = average ranking position (lower = better)
- `averageCtr` = average across returned rows (not sum / total impressions)

---

## Implementation Steps
1. `lib/analytics/search-console.ts` — paste full code from Code Templates.
2. `app/api/analytics/search-console/route.ts` — paste full code from Code Templates.

---

## Test Cases

```typescript
// lib/analytics/__tests__/search-console.test.ts
import { fetchSearchConsoleData } from '../search-console'

jest.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: jest.fn().mockImplementation(() => ({})) },
    searchconsole: jest.fn().mockReturnValue({
      searchanalytics: {
        query: jest.fn().mockResolvedValue({
          data: {
            rows: [
              { keys: ['ai seo tool'], clicks: 80, impressions: 1200, ctr: 0.067, position: 4.2 },
              { keys: ['content engine'], clicks: 50, impressions: 900, ctr: 0.056, position: 6.1 },
            ],
          },
        }),
      },
    }),
  },
}))

const mockFreshSupabase = () => ({
  from: () => ({
    select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }) }),
    insert: () => Promise.resolve({ error: null }),
  }),
})

describe('fetchSearchConsoleData', () => {
  beforeEach(() => {
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL = 'https://contentengine.app'
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'test@test.iam', private_key: 'fake' })
  })

  it('fetches from API when no cache exists', async () => {
    const supabase = mockFreshSupabase() as any
    const result = await fetchSearchConsoleData('user-1', supabase, false)
    expect(result.fromCache).toBe(false)
    expect(result.topQueries).toHaveLength(2)
    expect(result.topQueries[0].query).toBe('ai seo tool')
  })

  it('calculates averageCtr correctly', async () => {
    const supabase = mockFreshSupabase() as any
    const result = await fetchSearchConsoleData('user-1', supabase, false)
    // (0.067 + 0.056) / 2 = 0.0615 → rounded to 0.062
    expect(result.averageCtr).toBeCloseTo(0.062, 2)
  })
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` missing | `ConfigError` → 500 config_error |
| Search Console returns 0 rows | Return zeroed data (`totalClicks: 0`, empty `topQueries`) |
| `averageCtr` with 0 rows | Return `0` not `NaN` |

---

## Acceptance Criteria
- [ ] WHEN GET with valid JWT and fresh cache, THEN returns cached data with `fromCache: true`
- [ ] WHEN cache stale or missing, THEN fetches from Search Console API, saves snapshot
- [ ] WHEN `GOOGLE_SEARCH_CONSOLE_SITE_URL` missing, THEN returns 500 config_error
- [ ] WHEN API returns 0 rows, THEN returns `{ totalClicks: 0, totalImpressions: 0, averageCtr: 0, topQueries: [] }`
- [ ] WHEN unauthenticated, THEN returns 401

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-015 builds the live Analytics Dashboard UI using recharts
**Open questions:** _(fill via /task-handoff)_
