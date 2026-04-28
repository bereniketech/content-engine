---
task: "013"
feature: competitive-gaps-roadmap
rec: R7
title: "Create ContentLibrary component with ROI table"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["012"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`
- `.kit/skills/development/build-website-web-app/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Build `ContentLibrary` component that displays a sortable table of all user articles with ROI metrics. Each row links to the session. Missing GA4 connection shows a prompt instead of metric columns.

## Files

### Create
- `D:/content-engine/components/sections/ContentLibrary.tsx`
- `D:/content-engine/components/ui/ROISparkline.tsx`

## Dependencies
- TASK-012 complete (`GET /api/roi` exists)
- `recharts` — already installed (`"recharts": "^3.8.1"`)
- Existing `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`
- Tailwind CSS v4

## API Contracts (consumed)

From `GET /api/roi`:
```typescript
interface ROIItem {
  sessionId: string
  title: string | null
  publishedAt: string | null
  organicClicks: number | null
  impressions: number | null
  avgPosition: number | null
  trafficValue: number | null
  trend: number[]
  needsRefresh: boolean
}
```

## Implementation Steps

1. Create `components/ui/ROISparkline.tsx`:
```typescript
'use client'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
interface ROISparklineProps { data: number[] }
export function ROISparkline({ data }: ROISparklineProps) {
  const chartData = data.map((v, i) => ({ day: i, v }))
  return (
    <ResponsiveContainer width={80} height={28}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

2. Create `components/sections/ContentLibrary.tsx`:
```typescript
'use client'
interface ContentLibraryProps {
  items: ROIItem[]
  isGA4Connected: boolean
  onRowClick: (sessionId: string) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}
```
   - Render `<table>` with columns: Title | Published | Clicks | Impressions | Avg Position | Traffic Value | Trend | Status
   - If `!isGA4Connected`: show single full-width row with "Connect GA4 to see performance metrics" + button
   - Each data row: clickable → `onRowClick(sessionId)`
   - `needsRefresh = true` → amber `<Badge>Needs Refresh</Badge>` in Status column
   - Null metric values → display "—"
   - Trend column → `<ROISparkline data={item.trend} />` (or "—" if trend is empty array)
   - Pagination controls: Prev / Page X of Y / Next buttons below table

3. Format helpers:
   - `formatNumber(n: number | null)`: null → "—", else `n.toLocaleString()`
   - `formatDate(d: string | null)`: null → "—", else `new Date(d).toLocaleDateString()`
   - `formatCurrency(v: number | null)`: null → "—", else `$${v.toFixed(2)}`

## Test Cases

- Renders table with correct column headers
- Row with all metrics filled shows formatted values
- Row with null metrics shows "—" in all metric cells
- `needsRefresh = true` → Badge visible in row
- `isGA4Connected = false` → shows connect prompt, not table
- Row click → `onRowClick` called with correct sessionId
- Pagination: prev/next buttons call `onPageChange`

## Decision Rules
- `ROISparkline` must be a separate component to keep ContentLibrary testable.
- `recharts` imported only in ROISparkline (lazy load at component boundary).
- Table must be responsive — horizontal scroll on mobile (`overflow-x-auto` wrapper).
- Never fetch data inside ContentLibrary — it's a pure display component.

## Acceptance Criteria
- ContentLibrary renders table with all 8 columns.
- ROISparkline renders 80×28px Recharts line chart.
- Null metrics display "—".
- `needsRefresh` rows show amber Badge.
- GA4 not connected → connect prompt shown instead of metrics.
- Row click fires `onRowClick` callback.

Status: COMPLETE
Completed: 2026-04-28T07:21:52Z
