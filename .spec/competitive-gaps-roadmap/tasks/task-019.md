---
task: "019"
feature: competitive-gaps-roadmap
rec: R4
title: "Create /dashboard/schedule page"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["016", "017", "018"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Create the `/dashboard/schedule` page that fetches scheduled posts for the current week and renders `ScheduleCalendar` with full PATCH/retry wiring.

## Files

### Create
- `D:/content-engine/app/dashboard/schedule/page.tsx`

## Dependencies
- TASK-016: PATCH/DELETE routes
- TASK-017: Inngest function registered
- TASK-018: ScheduleCalendar component

## API Contracts (consumed)

```
GET /api/schedule?weekStart=2026-04-28&weekEnd=2026-05-04
PATCH /api/schedule/[id]  { publishAt?, status? }
```

Note: The existing `GET /api/schedule` route may need `weekStart`/`weekEnd` filter params added. Read the existing route and add the filter if missing.

## Codebase Context

Existing `app/api/schedule/route.ts` returns scheduled posts for user. Needs `weekStart` / `weekEnd` query params to filter to visible week (reduces payload).

Existing `app/dashboard/calendar/page.tsx` may have an existing calendar implementation — check before creating. If it already exists and handles scheduling, extend it rather than creating a duplicate.

Pattern for week computation:
```typescript
function getWeekBounds(referenceDate: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(referenceDate)
  const day = d.getDay() // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return { weekStart, weekEnd }
}
```

## Implementation Steps

1. Check `app/dashboard/calendar/page.tsx` — if it exists and is a scheduling calendar, modify it. If it's something else, create `app/dashboard/schedule/page.tsx`.

2. Page implementation (`'use client'`):
   - State: `weekStart` (Date, defaults to current week Monday), `posts` (ScheduledPost[]), `loading` (bool)
   - `useEffect` on `weekStart`: fetch `/api/schedule?weekStart=...&weekEnd=...` with auth token
   - Pass posts to `ScheduleCalendar`

3. `handleReschedule(postId: string, newPublishAt: string)`:
   - Optimistic: update `posts` state immediately (move card)
   - Call `PATCH /api/schedule/{postId}` with `{ publishAt: newPublishAt }`
   - On error: rollback state, show toast error
   - On success: refetch posts for current week

4. `handleRetry(postId: string)`:
   - Call `PATCH /api/schedule/{postId}` with `{ status: 'queued' }`
   - On success: refetch or update local state to status='queued'

5. `handleWeekChange(direction)`:
   - Compute new weekStart (±7 days)
   - Update state → triggers useEffect fetch

## Test Cases

- Page mounts → fetches current week posts → ScheduleCalendar rendered
- `handleReschedule` called → optimistic update → PATCH API called → on success confirm
- `handleReschedule` API error → rollback, error toast shown
- `handleRetry` → PATCH with status='queued' → post status updated in UI
- Previous/next week → new fetch with correct date range

## Decision Rules
- Optimistic update is mandatory for drag-drop to feel responsive.
- Rollback on API failure — user must see their card return to original position.
- Toast errors: use browser `alert()` as MVP if no toast system exists.
- Never hard-delete scheduled posts from the UI — always soft cancel.

## Acceptance Criteria
- `/dashboard/schedule` page renders ScheduleCalendar with real data.
- Week navigation fetches correct date range.
- Drag-drop reschedule works end-to-end with optimistic update and rollback.
- Retry button successfully resets failed posts to 'queued'.

Status: COMPLETE
Completed: 2026-04-28T07:24:02Z
