---
task: 3
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2]
---

# Task 3: Update Dashboard Layout — Background, Header, Padding

## Skills
- .kit/skills/languages/typescript-patterns/SKILL.md
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

## Commands
- .kit/commands/core/code-review.md

> Load the skills, agents, and commands listed above before reading anything else. Do not load CLAUDE.md. Follow paths exactly.

---

## Objective
Update `app/dashboard/layout.tsx` to use new design tokens, adjust padding for desktop/mobile, update header styling, and add dynamic page title resolution.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/layout.tsx` | Update className tokens, add page title resolution, adjust padding |

---

## Dependencies
- Task 1 (tokens) and Task 2 (fonts) must be complete
- `usePathname` hook available from `next/navigation`

---

## Codebase Context

### Current Layout (app/dashboard/layout.tsx, lines 1–28)
```tsx
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SessionProvider } from "@/lib/context/SessionContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-6 md:px-8">
            <h1 className="text-sm font-semibold text-foreground md:text-base">
              AI Content Engine
            </h1>
          </header>
          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
```

### Design Spec Requirements
- Page root: `bg-background` (token update auto-applies `#f5fbf5`)
- Header bar: 56px height (h-14, unchanged), `bg-card` (white), `border-sidebar-border` (new token)
- Main content padding: `px-10 py-8` (desktop = 40px horizontal, 32px vertical), `p-6` (mobile = 24px all sides)
- Header title: `text-[14px] font-semibold text-foreground` (dynamic, resolved from pathname)

### Page Title Mapping
Route → Header Title:
- `/dashboard` → "Content Studio Hub"
- `/dashboard/new-session` → "New Session"
- `/dashboard/research` → "Research"
- `/dashboard/seo` → "SEO"
- `/dashboard/blog` → "Blog Editor"
- `/dashboard/images` → "Images"
- `/dashboard/social/x` → "X (Twitter)"
- `/dashboard/social/linkedin` → "LinkedIn"
- `/dashboard/analytics` → "Analytics & Insights"
- `/dashboard/calendar` → "Calendar"
- `/dashboard/library` → "Content Library"
- `/dashboard/brand-voice` → "Brand Voice"

---

## Implementation Steps

1. `app/dashboard/layout.tsx` — Add `"use client"` directive (for `usePathname`)
2. `app/dashboard/layout.tsx` — Import `usePathname` from `next/navigation`
3. `app/dashboard/layout.tsx` — Create helper function `getPageTitle(pathname: string): string` that maps routes to titles
4. `app/dashboard/layout.tsx` — Call `usePathname()` inside the component to get current path
5. `app/dashboard/layout.tsx` — Update header border: `border-sidebar-border` instead of `border-border`
6. `app/dashboard/layout.tsx` — Update header title text styling to `text-[14px]` (remove md breakpoint)
7. `app/dashboard/layout.tsx` — Update main padding: `px-10 py-8` (desktop), with `md:` responsive for tablet, `p-6` for mobile
8. Run `npm run dev` and navigate to each dashboard route; verify header title changes
9. Verify padding on desktop (40px horizontal) using DevTools

---

## Code Templates

### `app/dashboard/layout.tsx` — Complete File (Replacement)

```tsx
"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SessionProvider } from "@/lib/context/SessionContext";

function getPageTitle(pathname: string): string {
  const routeTitleMap: Record<string, string> = {
    "/dashboard": "Content Studio Hub",
    "/dashboard/new-session": "New Session",
    "/dashboard/research": "Research",
    "/dashboard/seo": "SEO",
    "/dashboard/blog": "Blog Editor",
    "/dashboard/images": "Images",
    "/dashboard/social/x": "X (Twitter)",
    "/dashboard/social/linkedin": "LinkedIn",
    "/dashboard/social/instagram": "Instagram",
    "/dashboard/social/newsletter": "Newsletter",
    "/dashboard/social/medium": "Medium",
    "/dashboard/social/reddit": "Reddit",
    "/dashboard/social/pinterest": "Pinterest",
    "/dashboard/analytics": "Analytics & Insights",
    "/dashboard/calendar": "Calendar",
    "/dashboard/library": "Content Library",
    "/dashboard/brand-voice": "Brand Voice",
    "/dashboard/schedule": "Schedule",
    "/dashboard/clusters": "Clusters",
    "/dashboard/workspace": "Workspace",
    "/dashboard/data-driven": "Data Pipeline",
    "/dashboard/distribute": "Distribute",
    "/dashboard/traffic": "Traffic",
    "/dashboard/flywheel": "Flywheel",
  };

  return routeTitleMap[pathname] || "Dashboard";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <header className="flex h-14 shrink-0 items-center border-b border-sidebar-border bg-card px-6 md:px-8">
            <h1 className="text-[14px] font-semibold text-foreground">
              {pageTitle}
            </h1>
          </header>
          {/* Content area */}
          <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
```

---

## Test Cases

**Visual verification (in browser):**

1. Start dev: `npm run dev`
2. Navigate to `/dashboard` (home/hub)
   - Verify: header shows "Content Studio Hub"
   - Verify: page background is `#f5fbf5` (light teal)
   - Verify: header background is white (`#ffffff`)
3. Click sidebar link to `/dashboard/research`
   - Verify: header updates to "Research" (no page reload)
   - Verify: header border is subtle teal-tinted gray
4. Open DevTools → Inspector → select `<main>` element
   - On desktop (1440px+): computed padding-left should be `40px` (10 * 4px Tailwind unit)
   - On tablet (768px): computed padding-left should be `40px` (md breakpoint applies)
   - On mobile (<640px): computed padding should be `24px` all sides
5. Verify by resizing browser window and observing padding change

**Responsive test:**
```bash
# Terminal — test at various widths
# Desktop (1440px)
npm run dev
# Open http://localhost:3000/dashboard
# Resize to 1440px wide → verify 40px padding
# Resize to 768px wide → verify 40px padding (md breakpoint)
# Resize to 375px wide → verify 24px padding (mobile)
```

---

## Acceptance Criteria

### Visual/Design Alignment
- [ ] WHEN dashboard loads THEN page background is `#f5fbf5` (bg-background token)
- [ ] WHEN on desktop (1440px+) THEN main content has `40px` horizontal padding (px-10)
- [ ] WHEN on mobile (<768px) THEN main content has `24px` padding all sides (p-6)
- [ ] WHEN header renders THEN background is white (`bg-card` token)
- [ ] WHEN header renders THEN border is `border-sidebar-border` (subtle teal-tinted gray)
- [ ] All design tokens (colors, spacing) match design.md spec

### Logic/Feature Completeness
- [ ] WHEN dashboard loads THEN page title updates dynamically based on pathname using `getPageTitle()` helper
- [ ] WHEN navigating between routes THEN title changes without page reload (client-side hook)
- [ ] WHEN `usePathname` is called THEN no errors occur; hook is properly imported and used
- [ ] WHEN SessionProvider wraps children THEN all existing session logic remains unchanged
- [ ] WHEN page renders THEN all existing layout structure and children mounting work identically
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)
- [ ] `npm run type-check` — zero errors
- [ ] `/verify` passes
- [ ] All existing tests pass (jest + playwright)

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| SessionProvider and children | Keep exact same wrapping structure; only update className tokens on root div and main element |
| usePathname hook | Must be client-side; add "use client" directive at top of file |
| Existing route title for unlisted routes | `getPageTitle()` should return "Dashboard" as fallback; do NOT remove routes from map |
| Page title element structure | Keep `<h1>` tag structure; only update className tokens and content source |
| Sidebar and header relationship | Keep exact same flex layout; only update styling and token usage |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

---

## Handoff to Next Task
**Files changed by this task:** `app/dashboard/layout.tsx`
**Context for next task:** Dashboard layout now uses new tokens and responsive padding. Task 4 redesigns the Sidebar component with new grouping and collapse functionality.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
