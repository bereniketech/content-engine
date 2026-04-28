---
task: "012"
feature: competitive-gaps-roadmap
rec: R7
title: "Create GET /api/roi route aggregating content_performance per session"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: []
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create `GET /api/roi` that aggregates `content_performance` joined to `sessions` for the authenticated user, computes 28-day totals, 14-day trend arrays, and `needsRefresh` flag. Return paginated results (25 per page).

## Files

### Create
- `D:/content-engine/app/api/roi/route.ts`
- `D:/content-engine/lib/roi.ts`

## Dependencies
- Existing `sessions` table with RLS
- Existing `content_performance` table (created in `20260501_content_performance.sql`)
- `lib/auth.ts` — `requireAuth`

## API Contracts

**Request:**
```
GET /api/roi?page=1
```

**Response 200:**
```typescript
{
  data: Array<{
    sessionId: string
    title: string | null
    publishedAt: string | null
    organicClicks: number | null
    impressions: number | null
    avgPosition: number | null
    trafficValue: number | null
    trend: number[]            // 14-day daily click array
    needsRefresh: boolean
  }>
  meta: { total: number; page: number; pageSize: number }
}
```

## Codebase Context

`content_performance` schema (from `20260501_content_performance.sql`):
```sql
CREATE TABLE content_performance (
  id           UUID PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES sessions(id),
  asset_type   TEXT NOT NULL,
  platform     TEXT,
  clicks       INTEGER NOT NULL DEFAULT 0,
  impressions  INTEGER NOT NULL DEFAULT 0,
  avg_position NUMERIC(6, 2),
  measured_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`sessions` schema has: `id`, `user_id`, `input_data` (jsonb — may contain `title`), `created_at`.

`content_assets` has `asset_type = 'blog'` rows that contain the article title in `content.title`.

Analytics routes in `app/api/analytics/` use `fetchGA4Data(userId, supabase, forceRefresh)` from `lib/analytics/ga4.ts`.

## Implementation Steps

1. Create `lib/roi.ts`:

```typescript
export function computeTrend(
  rows: Array<{ clicks: number; measured_at: string }>,
  days = 14
): number[] {
  // Build 14-element array of daily click sums
  // Fill missing days with 0
  const result = new Array(days).fill(0)
  const now = new Date()
  for (const row of rows) {
    const daysAgo = Math.floor((now.getTime() - new Date(row.measured_at).getTime()) / 86_400_000)
    if (daysAgo >= 0 && daysAgo < days) {
      result[days - 1 - daysAgo] += row.clicks
    }
  }
  return result
}

export function estimateTrafficValue(clicks: number | null, avgPosition: number | null): number | null {
  if (!clicks || !avgPosition) return null
  // CPC estimate: position 1-3 = $2, 4-10 = $1, 11+ = $0.50
  const cpc = avgPosition <= 3 ? 2 : avgPosition <= 10 ? 1 : 0.5
  return Math.round(clicks * cpc * 100) / 100
}
```

2. Create `app/api/roi/route.ts`:
   - Auth check
   - Parse `page` query param (default 1, min 1)
   - Query sessions with pagination (25 per page) for `user_id = auth.uid()`
   - For each session batch: query `content_performance` WHERE `session_id IN (...)` AND `measured_at >= now() - interval '28 days'`
   - Query `content_assets` for `asset_type = 'blog'` to get article title per session
   - Group performance rows by session_id
   - For each session: compute `organicClicks` (sum), `impressions` (sum), `avgPosition` (avg), `trend` (computeTrend), `trafficValue`, `needsRefresh` (avgPosition > 20 or null = false)
   - Where no performance data: return null for metric fields, `[] ` for trend
   - Return paginated response

3. Index requirement: `content_performance` already has `idx_content_performance_session_id` — confirm and use.

## Test Cases

- Authenticated request with existing performance data → 200 with correctly computed metrics
- Session with no performance data → metrics are null, trend is `[]`
- `avgPosition = 25` → `needsRefresh = true`
- `avgPosition = 5` → `needsRefresh = false`
- Page 2 request → correct offset applied
- Unauthenticated → 401

## Decision Rules
- Never call GA4 or Search Console live on this endpoint — use pre-aggregated `content_performance` rows only.
- Pagination must use `.range(offset, offset + pageSize - 1)` Supabase pattern.
- `needsRefresh` is false when no data exists (not true).
- `estimateTrafficValue` returns null if either input is null.

## Acceptance Criteria
- `GET /api/roi` returns 200 with paginated data array.
- Each item contains `trend` (14-element number array) and `needsRefresh` (boolean).
- Sessions with no performance data show null metrics, not zeros.
- Response time < 2 seconds (indexed queries, no live external API calls).
- Auth required — 401 on missing token.

Status: COMPLETE
Completed: 2026-04-28T07:21:52Z
