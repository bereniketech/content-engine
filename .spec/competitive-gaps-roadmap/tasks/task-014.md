---
task: "014"
feature: competitive-gaps-roadmap
rec: R7
title: "Create /dashboard/library page with pagination"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["012", "013"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Create the `/dashboard/library` page that fetches ROI data from `/api/roi` and renders `ContentLibrary` with working pagination and row navigation.

## Files

### Create
- `D:/content-engine/app/dashboard/library/page.tsx`

## Dependencies
- TASK-012: `/api/roi` route exists
- TASK-013: `ContentLibrary` and `ROISparkline` components exist
- `lib/supabase.ts` for client-side auth token
- Next.js 14 App Router

## Codebase Context

Existing `app/dashboard/` has: `analytics/`, `blog/`, `calendar/`, `data-driven/`, `distribute/`, `flywheel/`, `images/`, `layout.tsx`, `page.tsx`, `research/`, `seo/`, `social/`, `traffic/`.

Existing `app/dashboard/layout.tsx` provides the nav shell. The new page just needs to export a default component.

Pattern from `app/dashboard/analytics/page.tsx` (infer from structure): likely uses `'use client'` + `useEffect` for data fetching, or Server Component + Suspense.

Next.js App Router URL searchParams for page:
```typescript
// Server component
export default async function Page({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams.page) || 1
  // fetch data server-side
}
```

For client-side navigation with URL updates:
```typescript
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
```

## Implementation Steps

1. Create `app/dashboard/library/page.tsx` as a hybrid:
   - Outer: Server Component that reads `searchParams.page`
   - Inner: `LibraryClient` (separate `'use client'` component or same file with `Suspense`)

2. Server component:
   - Get Supabase server client (use `lib/supabase-server.ts` pattern)
   - Fetch `GET /api/roi?page={page}` using the server supabase session token
   - Pass data to `ContentLibrary`

3. If using client-side fetching pattern (simpler, consistent with other dashboard pages):
   - `'use client'`
   - `useSearchParams` for page number
   - `useEffect` to fetch `/api/roi?page={page}` with bearer token
   - Loading state: show skeleton table (5 rows of animate-pulse divs)
   - Error state: show error message with retry button

4. Route `onRowClick` to `router.push(`/dashboard?sessionId=${sessionId}`)` (navigate to main dashboard with that session selected, matching existing navigation pattern).

5. `onPageChange`: call `router.push(`/dashboard/library?page=${newPage}`)` to update URL.

6. Check GA4 connection by inspecting if the fetched items have null organicClicks AND response includes a `ga4Connected: boolean` flag (add this to ROI API if needed — coordinate with TASK-012).

## Test Cases

- Page renders with loading skeleton on initial mount
- After fetch resolves: ContentLibrary rendered with data
- Page 2 link updates URL searchParam
- Row click navigates to correct session URL
- Empty state (no sessions): shows "No articles yet" message

## Decision Rules
- Use client-side fetch to stay consistent with other dashboard pages.
- Loading state must show skeleton, not spinner (matches existing dashboard UX).
- Handle `total = 0` gracefully with empty state UI.
- Page title: add `<title>Content Library</title>` via Next.js metadata or `<head>` tag.

## Acceptance Criteria
- `/dashboard/library` page renders ContentLibrary with real data from `/api/roi`.
- Pagination updates URL searchParams.
- Row click navigates to the session.
- Loading skeleton shown during fetch.
- Page accessible from dashboard navigation.

Status: COMPLETE
Completed: 2026-04-28T07:21:52Z
