---
task: "018"
feature: competitive-gaps-roadmap
rec: R4
title: "Create ScheduleCalendar component with weekly grid"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["015", "016"]
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
Build `ScheduleCalendar` component with a 7-column weekly grid showing scheduled posts as draggable cards with status badges. Build `CalendarSlot` as a sub-component handling individual time slots.

## Files

### Create
- `D:/content-engine/components/sections/ScheduleCalendar.tsx`
- `D:/content-engine/components/ui/CalendarSlot.tsx`

## Dependencies
- TASK-016: PATCH /api/schedule/[id] route exists
- Existing `components/ui/badge.tsx`, `components/ui/button.tsx`
- Tailwind CSS v4
- Existing `ScheduleModal.tsx` for reference (same domain)

## Codebase Context

Existing `components/sections/ScheduleModal.tsx` handles scheduling a post from the output panel. The new `ScheduleCalendar` is the full-page calendar view.

Scheduled post type:
```typescript
interface ScheduledPost {
  id: string
  sessionId: string
  platform: string
  assetType: string
  title: string | null
  status: 'queued' | 'publishing' | 'published' | 'failed' | 'cancelled'
  publishAt: string    // ISO timestamp
  errorDetails?: string | null
}
```

Platform icons: use emoji placeholders for now (🐦 Twitter/X, 💼 LinkedIn, 📸 Instagram, etc.) — no icon library needed.

## Implementation Steps

1. Create `components/ui/CalendarSlot.tsx`:
```typescript
'use client'
interface CalendarSlotProps {
  datetime: Date
  posts: ScheduledPost[]
  onDrop: (postId: string, newDateTime: Date) => void
  onRetry: (postId: string) => void
}
```
   - Renders a slot div with `onDragOver` + `onDrop` handlers
   - Lists article cards inside the slot
   - Each article card: `draggable={true}`, `onDragStart` sets `dataTransfer.setData('postId', post.id)`
   - Card shows: title (truncated 30 chars), platform emoji, status badge
   - Status badge colors: queued=gray, publishing=blue, published=green, failed=red
   - Failed posts show Retry button (calls `onRetry`)

2. Create `components/sections/ScheduleCalendar.tsx`:
```typescript
'use client'
interface ScheduleCalendarProps {
  posts: ScheduledPost[]
  weekStart: Date           // Monday of displayed week
  onReschedule: (postId: string, newPublishAt: string) => Promise<void>
  onRetry: (postId: string) => Promise<void>
  onWeekChange: (direction: 'prev' | 'next') => void
}
```
   - Compute 7 days from `weekStart`
   - For each day: compute slots from 6:00 to 22:00 (hourly, 17 slots per day)
   - Grid: CSS grid with 7 columns, time labels on left
   - Place posts into correct day+hour slots based on `publishAt`
   - Week header: "Week of Apr 28" with prev/next buttons
   - `onDrop` handler: extract dropped postId, compute new datetime from slot, call `onReschedule`

3. Time slot computation:
```typescript
function buildSlots(weekStart: Date): Array<{ datetime: Date; label: string }> {
  const slots = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 6; hour <= 22; hour++) {
      const dt = new Date(weekStart)
      dt.setDate(weekStart.getDate() + day)
      dt.setHours(hour, 0, 0, 0)
      slots.push({ datetime: dt, label: `${hour}:00` })
    }
  }
  return slots
}
```

## Test Cases

- Renders 7 columns (Mon–Sun)
- Post with publishAt on Wednesday 14:00 → appears in correct slot
- Drag post from one slot → drop on another → onReschedule called with correct ISO datetime
- Failed post → Retry button visible in card
- Prev/next week buttons → onWeekChange called

## Decision Rules
- No drag-drop libraries — HTML5 native drag events only.
- Optimistic UI: move card immediately on drop, rollback if API fails (handled by parent page).
- Keep CalendarSlot purely presentational — no direct API calls inside it.
- Slots outside 6am–10pm not rendered to keep the grid manageable.

## Acceptance Criteria
- ScheduleCalendar renders 7-column grid with hourly slots.
- Posts appear in correct day/hour slot.
- Drag-drop fires `onReschedule` with correct new datetime.
- Status badges render with correct colors.
- Failed posts show Retry button.
- Prev/next week navigation works.

Status: COMPLETE
Completed: 2026-04-28T07:24:02Z
