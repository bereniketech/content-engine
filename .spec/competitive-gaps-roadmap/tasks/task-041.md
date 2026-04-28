---
task: "041"
feature: competitive-gaps-roadmap
rec: R4
title: "Add Schedule and nav links to dashboard layout"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["018", "019"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Add navigation links to the Schedule view and verify the `ScheduleCalendar` renders correctly end-to-end with real data.

## Files

### Modify
- `D:/content-engine/app/dashboard/layout.tsx`

## Implementation Steps

1. Add to dashboard navigation:
   - Label: "Schedule"
   - Href: `/dashboard/schedule`
   - Icon: Lucide `Calendar` icon

2. Check if `/dashboard/schedule` conflicts with existing `/dashboard/calendar` — if `calendar` already has scheduling, evaluate whether to rename or create separate routes. Document decision.

3. Verify that the Inngest function `scheduledPublish` is listed in `app/api/inngest/route.ts` serve() call. If not, add it.

4. Manual smoke test checklist:
   - Navigate to `/dashboard/schedule`
   - Verify week grid renders (7 columns × 17 hour rows)
   - If no scheduled posts: verify empty state shown
   - Check browser console for errors

## Acceptance Criteria
- "Schedule" navigation link in dashboard.
- `/dashboard/schedule` page loads without console errors.
- Inngest `scheduledPublish` function registered in serve().

Status: COMPLETE
Completed: 2026-04-28T10:30:00Z
