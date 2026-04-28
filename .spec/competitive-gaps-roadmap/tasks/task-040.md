---
task: "040"
feature: competitive-gaps-roadmap
rec: R7
title: "Add ROI link to dashboard nav and verify /api/roi performance"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["012", "013", "014"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Add navigation link to the Content Library in the dashboard layout, and run a performance verification of the `/api/roi` route to confirm it responds under 2 seconds.

## Files

### Modify
- `D:/content-engine/app/dashboard/layout.tsx`

### Review
- `D:/content-engine/app/api/roi/route.ts`

## Implementation Steps

1. Read `app/dashboard/layout.tsx` to find the navigation pattern (sidebar or top nav).

2. Add navigation entry for Content Library:
   - Label: "Content Library"
   - Href: `/dashboard/library`
   - Icon: use Lucide `Library` or `BarChart2` icon from `lucide-react`
   - Position: after existing analytics-related links

3. Performance check on `/api/roi`:
   - Verify the Supabase query uses `session_id` index from `content_performance`
   - Verify pagination uses `.range()` not `.limit()` without offset
   - If a full-table scan is detected (no WHERE clause on user_id), flag as issue

4. Verify `content_performance` table has index `idx_content_performance_session_id` (from migration). If not, add index to migration or create a new patch migration.

## Test Cases

- Dashboard layout renders "Content Library" link
- Link navigates to `/dashboard/library`
- `/api/roi` query plan shows index scan (not seq scan) on content_performance

## Decision Rules
- Follow existing nav item pattern exactly (same CSS classes, same Lucide icon pattern).
- Do not add more than one nav item per feature — single entry point.

## Acceptance Criteria
- "Content Library" appears in dashboard navigation.
- Clicking it navigates to `/dashboard/library`.
- `/api/roi` verified to use indexed queries.

Status: COMPLETE
Completed: 2026-04-28T10:30:00Z
