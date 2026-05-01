---
task: 4
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3]
---

# Task 4: Redesign Sidebar — Light Theme, Groups, Collapse Toggle

## Skills
- .kit/skills/languages/typescript-patterns/SKILL.md
- .kit/skills/frameworks-frontend/react-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

## Commands
- .kit/commands/core/code-review.md

> Load the skills, agents, and commands listed above before reading anything else. Do not load CLAUDE.md. Follow paths exactly.

---

## Objective
Rewrite `components/dashboard/Sidebar.tsx` to use light theme (`bg-sidebar`), add brand card with logo and "Pro Plan" subtitle, implement grouped nav sections, add collapse toggle (60px state), persist collapse state to localStorage, and add footer section.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `components/dashboard/Sidebar.tsx` | Complete rewrite with new light theme, groups, collapse, brand card |

### Create
| File | Purpose |
|------|---------|
| `public/logo.png` | Logo asset (36×36 and 72×72 versions used in tasks) — copy from design_idea folder or placeholder |

---

## Dependencies
- Task 1, 2, 3 (tokens, fonts, layout) must be complete
- `lucide-react` icons (already imported in current sidebar)
- `localStorage` API available in browser
- All existing route hrefs from `NAV_ITEMS`, `FEATURE_NAV_ITEMS`, `DATA_PIPELINE_ITEMS` remain unchanged

---

## Codebase Context

### Current Sidebar Structure (excerpt)
```tsx
// Current NAV_ITEMS (kept unchanged)
const NAV_ITEMS = [
  { label: "Research",   href: "/dashboard/research",        icon: FlaskConical },
  // ... more items
];

const FEATURE_NAV_ITEMS = [
  { label: "Content Library", href: "/dashboard/library",  icon: Library },
  // ... more items
];

const DATA_PIPELINE_ITEMS = [
  { label: "Data Pipeline", href: "/dashboard/data-driven", icon: Zap },
  // ... sub-routes
];
```

### Design Spec Sidebar Structure
```
Brand Card
  Logo (36×36) + "Content Studio" (14px bold) + "Pro Plan" (11px)

New Project Button (full-width, primary)

MAIN NAV (no section title)
  Hub, Research, SEO, Blog, Images

DISTRIBUTE (section header, 11px uppercase)
  X, LinkedIn, Instagram, Newsletter, Medium, Reddit, Pinterest

MANAGE (section header, 11px uppercase)
  Calendar, Analytics, Library, Brand Voice, Schedule, Clusters, Workspace, Data Pipeline

FOOTER (border-top)
  Help, Logout
```

### Collapse State
- Collapsed: 60px width, icons-only, section titles hidden (replaced by dividers)
- Expanded: 248px width, full text
- Persist to: `localStorage.getItem("sidebar-collapsed")`

---

## Implementation Steps

1. Rewrite `components/dashboard/Sidebar.tsx` from scratch:
   - Replace dark navy theme with light `bg-sidebar` (`#f8faf8`)
   - Add brand card component at top with logo, name, subtitle
   - Group nav items into three sections: MAIN, DISTRIBUTE, MANAGE
   - Implement `collapsed` state from localStorage
   - Add collapse toggle button
   - Implement active state styling: `bg-primary-muted text-primary font-semibold border-l-[3px] border-primary`
   - Implement hover state: `bg-hover transition-[120ms]`
   - Add footer section with Help + Logout (mock — no functionality change)
2. Create/place `public/logo.png` (36×36 minimum, will be scaled)
3. Run `npm run dev`, navigate to dashboard
4. Verify:
   - Sidebar is 248px wide (expanded) or 60px (collapsed)
   - Brand card shows at top
   - Nav sections are grouped
   - Toggle button collapses/expands sidebar
   - Collapse state persists across page refresh
5. Test active state: click different nav items, verify left border + background

---

## Code Templates

### `components/dashboard/Sidebar.tsx` — Complete File (Replacement)

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FlaskConical,
  Search,
  FileText,
  Image as ImageIcon,
  Twitter,
  Linkedin,
  Instagram,
  BookOpen,
  MessageSquare,
  Mail,
  PinIcon,
  Calendar,
  BarChart2,
  History,
  Repeat,
  Zap,
  Menu,
  X,
  Library,
  CalendarDays,
  Mic,
  Network,
  Users,
  HelpCircle,
  LogOut,
  Plus,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Hub", href: "/dashboard", icon: History },
  { label: "Research", href: "/dashboard/research", icon: FlaskConical },
  { label: "SEO", href: "/dashboard/seo", icon: Search },
  { label: "Blog", href: "/dashboard/blog", icon: FileText },
  { label: "Images", href: "/dashboard/images", icon: ImageIcon },
];

const DISTRIBUTE_NAV_ITEMS: NavItem[] = [
  { label: "X / Twitter", href: "/dashboard/social/x", icon: Twitter },
  { label: "LinkedIn", href: "/dashboard/social/linkedin", icon: Linkedin },
  { label: "Instagram", href: "/dashboard/social/instagram", icon: Instagram },
  { label: "Newsletter", href: "/dashboard/social/newsletter", icon: Mail },
  { label: "Medium", href: "/dashboard/social/medium", icon: BookOpen },
  { label: "Reddit", href: "/dashboard/social/reddit", icon: MessageSquare },
  { label: "Pinterest", href: "/dashboard/social/pinterest", icon: PinIcon },
];

const MANAGE_NAV_ITEMS: NavItem[] = [
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
  { label: "Library", href: "/dashboard/library", icon: Library },
  { label: "Brand Voice", href: "/dashboard/brand-voice", icon: Mic },
  { label: "Schedule", href: "/dashboard/schedule", icon: CalendarDays },
  { label: "Clusters", href: "/dashboard/clusters", icon: Network },
  { label: "Workspace", href: "/dashboard/workspace", icon: Users },
  { label: "Data Pipeline", href: "/dashboard/data-driven", icon: Zap },
];

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const { label, href, icon: Icon } = item;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-[background-color_color] duration-120",
        isActive
          ? "border-l-[3px] border-primary bg-primary-muted text-primary font-semibold"
          : "text-foreground-2 hover:bg-hover"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SectionDivider() {
  return <hr className="my-2 border-sidebar-border" />;
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <SectionDivider />;
  }
  return (
    <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground-3">
      {label}
    </p>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
    setCollapsed(storedCollapsed);
  }, []);

  // Persist collapse state to localStorage
  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", newState ? "true" : "false");
  };

  const desktopNavContent = (
    <nav className="flex flex-col gap-1 px-2 py-4">
      {/* Main nav */}
      {MAIN_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          collapsed={collapsed}
        />
      ))}

      {/* Distribute section */}
      <SectionLabel label="Distribute" collapsed={collapsed} />
      {DISTRIBUTE_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          collapsed={collapsed}
        />
      ))}

      {/* Manage section */}
      <SectionLabel label="Manage" collapsed={collapsed} />
      {MANAGE_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:shrink-0 bg-sidebar min-h-screen border-r border-sidebar-border transition-all duration-200",
          collapsed ? "md:w-[60px]" : "md:w-[248px]"
        )}
      >
        {/* Brand card */}
        <div className="flex flex-col items-center gap-2 px-3 py-4 border-b border-sidebar-border">
          {collapsed ? (
            <Image
              src="/logo.png"
              alt="Content Studio"
              width={36}
              height={36}
              className="rounded-sm object-cover"
            />
          ) : (
            <>
              <div className="flex items-center gap-3 w-full">
                <Image
                  src="/logo.png"
                  alt="Content Studio"
                  width={36}
                  height={36}
                  className="rounded-sm object-cover"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">Content Studio</span>
                  <span className="text-[11px] text-foreground-3">Pro Plan</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* New Project button */}
        <div className="px-2 py-2">
          <Link
            href="/dashboard/new-session"
            className={cn(
              "flex items-center justify-center gap-2 rounded-sm bg-primary text-primary-foreground font-semibold h-10 transition-opacity hover:opacity-90",
              collapsed ? "w-10 px-0" : "w-full"
            )}
            title={collapsed ? "New Project" : undefined}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>New Project</span>}
          </Link>
        </div>

        {/* Nav content */}
        {desktopNavContent}

        {/* Footer */}
        <div className="mt-auto border-t border-sidebar-border px-2 py-4 flex flex-col gap-1">
          <NavLink
            item={{ label: "Help", href: "#", icon: HelpCircle }}
            isActive={false}
            collapsed={collapsed}
          />
          <button
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground-2 hover:bg-hover transition-[background-color] duration-120"
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle button */}
        <div className="px-2 py-2 border-t border-sidebar-border">
          <button
            onClick={handleToggleCollapse}
            className="flex items-center justify-center w-full h-9 rounded-sm hover:bg-hover transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-foreground-2 rotate-90" />
            ) : (
              <ChevronDown className="h-4 w-4 text-foreground-2" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 rounded-md bg-primary p-2 text-primary-foreground shadow-lg"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay + slide-over */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-[248px] bg-sidebar flex flex-col overflow-y-auto">
            {/* Brand card */}
            <div className="flex items-center gap-3 px-3 py-4 border-b border-sidebar-border">
              <Image
                src="/logo.png"
                alt="Content Studio"
                width={36}
                height={36}
                className="rounded-sm object-cover"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">Content Studio</span>
                <span className="text-[11px] text-foreground-3">Pro Plan</span>
              </div>
            </div>

            {/* Nav content */}
            {desktopNavContent}

            {/* Footer */}
            <div className="mt-auto border-t border-sidebar-border px-2 py-4 flex flex-col gap-1">
              <NavLink
                item={{ label: "Help", href: "#", icon: HelpCircle }}
                isActive={false}
                collapsed={false}
              />
              <button
                className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground-2 hover:bg-hover transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
```

---

## Test Cases

**Manual verification (browser):**

1. Start dev: `npm run dev`
2. Navigate to `/dashboard`
3. **Visual checks:**
   - Sidebar width is 248px (expanded)
   - Background is `#f8faf8` (light, not dark)
   - Brand card at top shows logo (36×36), "Content Studio" (14px bold), "Pro Plan" (11px gray)
   - "New Project" button is full-width, teal background
   - Nav items grouped: main (Hub, Research, SEO, Blog, Images), Distribute, Manage
4. **Collapse toggle:**
   - Click the collapse button (bottom of sidebar)
   - Sidebar shrinks to 60px
   - Text hides, only icons visible
   - Check localStorage: `console.log(localStorage.getItem("sidebar-collapsed"))` → "true"
   - Refresh page → sidebar stays collapsed (localStorage persisted)
5. **Active state:**
   - Click "Research" nav item
   - Current item shows: left border `3px solid #00694c`, background `rgba(0,105,76,0.08)`, bold text
6. **Hover state:**
   - Hover over inactive nav item (e.g., "Blog")
   - Background changes to `#e4eae4` (hover token), 120ms transition
7. **Mobile:**
   - Resize to <768px
   - Sidebar hidden
   - Hamburger button (teal, top-left) visible
   - Click hamburger → slide-over appears with full nav
   - Click backdrop or nav item → slide-over closes

---

## Acceptance Criteria

### Visual/Design Alignment
- [ ] WHEN sidebar renders THEN width is `248px` (expanded) and `bg-sidebar` is `#f8faf8`
- [ ] WHEN sidebar is collapsed THEN width is `60px` and text labels are hidden
- [ ] WHEN nav item is active THEN left border is `3px solid #00694c` and background is `rgba(0,105,76,0.08)`
- [ ] WHEN nav item is hovered THEN background transitions to `#e4eae4` (hover token) within 120ms
- [ ] WHEN brand card renders THEN logo is 36×36 with rounded-sm, name is 14px bold, subtitle is 11px gray
- [ ] WHEN section is collapsed THEN section titles are replaced with divider lines
- [ ] WHEN viewport < 768px THEN desktop sidebar is hidden and hamburger button is visible
- [ ] All design tokens (colors, spacing, radius) match design.md spec

### Logic/Feature Completeness
- [ ] WHEN sidebar renders THEN all existing nav routes (NAV_ITEMS, FEATURE_NAV_ITEMS, DATA_PIPELINE_ITEMS) remain unchanged
- [ ] WHEN nav items are clicked THEN routing to each href works identically to before
- [ ] WHEN collapse toggle is clicked THEN collapse state persists to localStorage key "sidebar-collapsed"
- [ ] WHEN page is refreshed THEN collapse state is restored from localStorage
- [ ] WHEN mobile hamburger is clicked THEN slide-over navigation opens/closes (existing pattern preserved)
- [ ] WHEN Help or Logout links are clicked THEN handlers/navigation work as before (or as spec'd for mocked buttons)
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)
- [ ] No existing nav routes, href patterns, or navigation logic are removed or changed
- [ ] All existing tests pass (jest + playwright)
- [ ] `npm run type-check` — zero errors
- [ ] `/verify` passes

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Existing nav item routes and hrefs | Keep all NAV_ITEMS, FEATURE_NAV_ITEMS, DATA_PIPELINE_ITEMS routes unchanged; only reorganize grouping/display |
| Nav item active state detection | Keep existing pathname matching logic (exact match + startsWith for nested routes); only update styling |
| Collapse state persistence | Implement localStorage key exactly as "sidebar-collapsed"; restore on mount with useEffect |
| Mobile hamburger pattern | Keep existing mobile overlay pattern (fixed inset-0, slide-over on left); only update colors/styling |
| Help and Logout buttons | These are mocked in the template; if real handlers exist, preserve them; otherwise leave as placeholder buttons |
| Logo asset | If `/public/logo.png` doesn't exist, use a placeholder or copy from design_idea folder |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

---

## Handoff to Next Task
**Files changed by this task:** `components/dashboard/Sidebar.tsx`, `public/logo.png` created
**Context for next task:** Sidebar is now light-themed with grouping and collapse. Task 5 redesigns the Hub page layout with stat cards.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
