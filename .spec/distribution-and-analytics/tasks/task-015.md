---
task: "015"
feature: distribution-and-analytics
status: COMPLETE
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["013", "014"]
---

# Task 015: Analytics Dashboard UI

## Skills
- .kit/skills/development/build-website-web-app/SKILL.md
- .kit/skills/ui-design/ui-ux-pro-max/SKILL.md

## Agents
- @web-frontend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Replace the stubbed `app/dashboard/analytics/page.tsx` with a live `AnalyticsDashboard` component. Install `recharts`. Show traffic sparkline, top pages table, CTR bar chart, keyword rankings table with skeleton loaders and per-card error states.

---

## Files
### Create
| File | Purpose |
|---|---|
| `components/sections/AnalyticsDashboard.tsx` | Full analytics dashboard with live charts |

### Modify
| File | What to change |
|---|---|
| `app/dashboard/analytics/page.tsx` | Replace all content with `<AnalyticsDashboard />` |

---

## Dependencies
```bash
npm install recharts
# Env vars: none (all server-side in tasks 013+014)
```

---

## API Contracts
This task consumes:
- `GET /api/analytics/ga4` → `{ data: { sessions, pageViews, topPages, cachedAt, fromCache } }`
- `GET /api/analytics/search-console` → `{ data: { totalClicks, totalImpressions, averageCtr, topQueries, cachedAt, fromCache } }`

Both require `Authorization: Bearer <token>` header.

---

## Code Templates

### `components/sections/AnalyticsDashboard.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface GA4Data {
  period: string
  sessions: number
  pageViews: number
  topPages: Array<{ path: string; views: number }>
  cachedAt: string
  fromCache: boolean
}

interface SCData {
  period: string
  totalClicks: number
  totalImpressions: number
  averageCtr: number
  topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>
  cachedAt: string
  fromCache: boolean
}

type LoadState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T }

async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-32 w-full animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard() {
  const [ga4State, setGa4State] = useState<LoadState<GA4Data>>({ status: 'loading' })
  const [scState, setScState] = useState<LoadState<SCData>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const token = await getAuthToken()
      if (!token) {
        if (!cancelled) {
          setGa4State({ status: 'error', message: 'Not authenticated' })
          setScState({ status: 'error', message: 'Not authenticated' })
        }
        return
      }

      const headers = { Authorization: `Bearer ${token}` }

      const [ga4Result, scResult] = await Promise.allSettled([
        fetch('/api/analytics/ga4', { headers }).then(r => r.json()),
        fetch('/api/analytics/search-console', { headers }).then(r => r.json()),
      ])

      if (cancelled) return

      if (ga4Result.status === 'fulfilled' && ga4Result.value?.data) {
        setGa4State({ status: 'success', data: ga4Result.value.data })
      } else {
        const msg = ga4Result.status === 'fulfilled'
          ? (ga4Result.value?.error?.message ?? 'Failed to load GA4 data')
          : 'Network error loading GA4 data'
        setGa4State({ status: 'error', message: msg })
      }

      if (scResult.status === 'fulfilled' && scResult.value?.data) {
        setScState({ status: 'success', data: scResult.value.data })
      } else {
        const msg = scResult.status === 'fulfilled'
          ? (scResult.value?.error?.message ?? 'Failed to load Search Console data')
          : 'Network error loading Search Console data'
        setScState({ status: 'error', message: msg })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Prepare sparkline data from topPages (use pages as x-axis labels for demo)
  const sparklineData = ga4State.status === 'success'
    ? ga4State.data.topPages.map((p, i) => ({ name: `P${i + 1}`, views: p.views }))
    : []

  // Prepare CTR bar data from top queries
  const ctrData = scState.status === 'success'
    ? scState.data.topQueries.slice(0, 6).map(q => ({
        name: q.query.length > 20 ? q.query.slice(0, 20) + '…' : q.query,
        ctr: Math.round(q.clicks / (q.impressions || 1) * 1000) / 10, // percentage
      }))
    : []

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Card 1: Traffic Overview */}
      {ga4State.status === 'loading' ? (
        <SkeletonCard />
      ) : ga4State.status === 'error' ? (
        <ErrorCard title="Traffic Overview" message={ga4State.message} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic Overview</CardTitle>
            <p className="text-xs text-muted-foreground">
              {ga4State.data.sessions.toLocaleString()} sessions · {ga4State.data.pageViews.toLocaleString()} page views · last 30 days
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={sparklineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Card 2: Top Performing Pages */}
      {ga4State.status === 'loading' ? (
        <SkeletonCard />
      ) : ga4State.status === 'error' ? (
        <ErrorCard title="Top Performing Content" message={ga4State.message} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ga4State.data.topPages.map((page, i) => (
                <div key={page.path} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    <span className="truncate text-foreground">{page.path}</span>
                  </span>
                  <span className="ml-2 flex-shrink-0 font-medium text-foreground">{page.views.toLocaleString()}</span>
                </div>
              ))}
              {ga4State.data.topPages.length === 0 && (
                <p className="text-sm text-muted-foreground">No page data available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 3: CTR by Platform (queries) */}
      {scState.status === 'loading' ? (
        <SkeletonCard />
      ) : scState.status === 'error' ? (
        <ErrorCard title="CTR by Query" message={scState.message} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CTR by Query</CardTitle>
            <p className="text-xs text-muted-foreground">
              {scState.data.totalClicks.toLocaleString()} clicks · {scState.data.totalImpressions.toLocaleString()} impressions · avg CTR {(scState.data.averageCtr * 100).toFixed(1)}%
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={ctrData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'CTR']} />
                <Bar dataKey="ctr" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Card 4: Search Visibility / Keyword Rankings */}
      {scState.status === 'loading' ? (
        <SkeletonCard />
      ) : scState.status === 'error' ? (
        <ErrorCard title="Search Visibility" message={scState.message} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Visibility</CardTitle>
            <p className="text-xs text-muted-foreground">Top queries · last 28 days</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex text-xs font-medium text-muted-foreground mb-2">
                <span className="flex-1">Query</span>
                <span className="w-14 text-right">Clicks</span>
                <span className="w-14 text-right">Pos.</span>
              </div>
              {scState.data.topQueries.map((q) => (
                <div key={q.query} className="flex items-center text-sm">
                  <span className="flex-1 truncate text-foreground">{q.query}</span>
                  <span className="w-14 text-right text-foreground">{q.clicks}</span>
                  <span className={`w-14 text-right font-medium ${q.position <= 3 ? 'text-green-600' : q.position <= 10 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    #{q.position}
                  </span>
                </div>
              ))}
              {scState.data.topQueries.length === 0 && (
                <p className="text-sm text-muted-foreground">No search data available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### `app/dashboard/analytics/page.tsx` (full replacement)

```typescript
import { AnalyticsDashboard } from '@/components/sections/AnalyticsDashboard'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live data from Google Analytics 4 and Search Console.
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  )
}
```

---

## Codebase Context

### Key Code Snippets

Current `app/dashboard/analytics/page.tsx` content (full replacement — do NOT keep any of it):
```typescript
// CURRENT (stubbed — replace entirely):
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// ... stubbed cards with "coming soon" text
```

`Card`, `CardContent`, `CardHeader`, `CardTitle` — from `@/components/ui/card` (already in codebase).

`getSupabaseBrowserClient()` — from `@/lib/supabase` (already used in other components).

Tailwind CSS variables for theming:
- `hsl(var(--primary))` — primary brand color
- `hsl(var(--border))` — grid lines
- `hsl(var(--muted))` — skeleton background

### Key Patterns in Use
- `'use client'` for all interactive/data-fetching components
- `Promise.allSettled` for parallel fetch — one failing doesn't block the other
- `cancelled` flag in `useEffect` to prevent state updates after unmount
- Skeleton loaders: `animate-pulse rounded bg-muted h-N w-N`
- Error cards: `border-destructive` + `text-destructive` title

---

## Implementation Steps
1. Run `npm install recharts`.
2. Create `components/sections/AnalyticsDashboard.tsx` — paste full component from Code Templates.
3. Replace ALL content of `app/dashboard/analytics/page.tsx` with the new page content from Code Templates.

---

## Test Cases

Manual browser test:
```
1. Navigate to /dashboard/analytics
2. Should see 4 skeleton loaders while data fetches
3. On success: 4 cards render — traffic sparkline, top pages table, CTR bar chart, keyword table
4. If GA4 env vars not configured: traffic cards show ErrorCard with config_error message
5. If Search Console not configured: search cards show ErrorCard
6. Cards with valid data should not show ErrorCard
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| GA4 fails but Search Console succeeds | Cards 1+2 show ErrorCard; cards 3+4 show real data |
| `topPages` is empty | Show "No page data available yet." in card 2 |
| `topQueries` is empty | Show "No search data available yet." in card 4 |
| Position ≤ 3 | Green color for position number |
| Position 4–10 | Amber color |
| Position > 10 | Muted color |

---

## Acceptance Criteria
- [ ] WHEN page loads, THEN all 4 skeleton loaders visible during fetch
- [ ] WHEN GA4 data loads, THEN Card 1 shows sessions + pageViews count + sparkline; Card 2 shows top pages table
- [ ] WHEN Search Console data loads, THEN Card 3 shows CTR bar chart; Card 4 shows keyword rankings with position coloring
- [ ] WHEN GA4 API returns error, THEN Cards 1 and 2 show ErrorCard with red border; Cards 3 and 4 unaffected
- [ ] WHEN Search Console returns error, THEN Cards 3 and 4 show ErrorCard; Cards 1 and 2 unaffected
- [ ] WHEN recharts is not installed, THEN `npm install recharts` fixes build error

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-016 builds the ranking drop detection cron worker
**Open questions:** _(fill via /task-handoff)_
