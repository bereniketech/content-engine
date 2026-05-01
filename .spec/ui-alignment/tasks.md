# Implementation Plan: UI Alignment

## Overview
This task plan breaks down the UI alignment feature into 20 bite-sized implementation tasks (2–5 min each). Each task is atomic, fully specified, and includes acceptance criteria. Tasks follow the dependency chain: tokens first, then layout, then individual screens.

---

## Tasks

- [ ] Task 1. Configure design tokens in app/globals.css
  - Update `:root` CSS custom properties with Lumina AI colour palette (backgrounds, foregrounds, primary teal, secondary blue, semantic colours, borders)
  - Add Tailwind `@theme inline` block mapping tokens to colour scale
  - Add radius tokens (sm/md/lg/xl) and shadow tokens (teal-tinted)
  - Add transition tokens (`--transition-fast`, `--transition-med`)
  - Verify existing Tailwind config references no hardcoded hex values in utilities
  - _Requirements: Requirement 1 (Design Token System)_
  - _Skills: .kit/skills/frontend/code-writing, .kit/skills/frontend/build-website-web-app_
  - **AC:**
    - WHEN the app compiles THEN `bg-background` resolves to `#f5fbf5`
    - WHEN a dev uses `text-primary` THEN it resolves to `#00694c`

- [ ] Task 2. Update typography: Inter font import and Tailwind @theme
  - Replace `Geist` and `Geist_Mono` imports in `app/layout.tsx` with `Inter` and `JetBrains_Mono` from `next/font/google`
  - Update `<html>` className to include font variable declarations
  - Ensure Tailwind `@theme inline` includes `--font-sans` and `--font-mono` mappings
  - Verify page renders with Inter (not Geist) in browser dev tools
  - _Requirements: Requirement 1 AC 10; Requirement 3 AC 4_
  - _Skills: .kit/skills/frontend/build-website-web-app_
  - **AC:**
    - WHEN the page loads THEN `font-family` computed style starts with `Inter`
    - WHEN a user inspects the page THEN Inter fonts are served from `_next/static/`

- [ ] Task 3. Update dashboard layout: background, header, and padding
  - Modify `app/dashboard/layout.tsx`: set page root `bg-background` (token update auto-applies #f5fbf5)
  - Update top header bar: `height: 56px` (h-14, unchanged), `bg-card`, `border-sidebar-border`
  - Update main content padding: `px-10 py-8` (desktop), `p-6` (mobile)
  - Add dynamic page title display (e.g. via usePathname hook to resolve current page label)
  - _Requirements: Requirement 3 (Dashboard Layout)_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN dashboard loads THEN page background is `#f5fbf5`
    - WHEN on desktop THEN main content has `40px` horizontal padding

- [ ] Task 4. Redesign sidebar: light theme, grouped sections, and collapse toggle
  - Rewrite `components/dashboard/Sidebar.tsx` with light `bg-sidebar` (#f8faf8)
  - Add brand card at top: logo (36×36, rounded-sm), "Content Studio" (14px bold), "Pro Plan" subtitle (11px)
  - Add "New Project" button below brand card: `bg-primary`, full-width, `h-10`, rounded-sm
  - Group nav items into three sections: main, distribute, manage (as per design spec mapping)
  - Implement active state: `bg-primary-muted`, `text-primary`, `font-semibold`, `border-l-3px border-primary`
  - Implement hover state: `bg-hover`, 120ms transition
  - Add collapse toggle: reduces sidebar to 60px, hides text, shows only icons, replaces section titles with dividers
  - Persist collapse state to `localStorage` key `sidebar-collapsed`
  - Add footer section (Help, Logout) separated by border-top
  - _Requirements: Requirement 2 (Sidebar Redesign)_
  - _Skills: .kit/skills/frontend/code-writing, .kit/skills/frontend/build-website-web-app_
  - **AC:**
    - WHEN sidebar renders THEN `width: 248px`, `bg-sidebar` is `#f8faf8`
    - WHEN nav item is active THEN left border is `3px solid #00694c` and background is `rgba(0,105,76,0.08)`

- [ ] Task 5. Create Hub page layout with stat cards and recent sessions
  - Redesign `app/dashboard/page.tsx` hub screen layout (preserve all session logic)
  - Add page heading: "Content Studio Hub", 32px bold, -0.02em letter-spacing
  - Add subtitle: "Real-time status of your pipeline", 16px, text-foreground-2
  - Create 4-column stat bento grid (desktop), 2-col (tablet), 1-col (mobile)
  - Create `components/ui/StatCard.tsx`: value, label, icon, change indicator
  - Add 4 quick action pills: "New from Topic", "Upload Article", "Repurpose URL", "Data Pipeline"
  - Add recent sessions list in white card with row hover states (bg-surface-low)
  - _Requirements: Requirement 4 (Hub Screen), Requirement 13 (Responsive Behaviour)_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN hub renders THEN stat cards display in 4 columns on desktop
    - WHEN session row is hovered THEN background transitions to `#eff5ef`

- [ ] Task 6. Create StatusBadge component with status colour variants
  - Create `components/ui/StatusBadge.tsx` with four variants: published (teal), review (orange), draft (grey), scheduled (blue)
  - Render as pill-shaped badge: `rounded-full px-2.5 py-0.5 text-[11px] font-semibold`
  - Map variant to background and text colour per design spec
  - Update session rows in Hub page to use StatusBadge instead of generic Badge
  - _Requirements: Requirement 4 AC 5–8_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN status is "published" THEN badge background is `rgba(0,105,76,0.1)` and text is `#00694c`
    - WHEN status is "scheduled" THEN badge background is `rgba(0,96,168,0.08)` and text is `#0060a8`

- [ ] Task 7. Create AIInsightBar component
  - Create `components/ui/AIInsightBar.tsx`: teal-to-blue gradient background, teal icon circle, two CTA buttons
  - Background gradient: `linear-gradient(to right, rgba(29,158,117,0.05), rgba(55,138,221,0.05))`
  - Border: `rgba(29,158,117,0.2)`
  - Styling: `rounded-xl p-6 flex items-center justify-between`
  - Left side: icon circle + text
  - Right side: secondary ("Dismiss") + primary ("Apply Strategy") buttons
  - Add to bottom of Hub page
  - _Requirements: Requirement 4 AC 9_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN AI Insight Bar renders THEN gradient background is applied
    - WHEN "Apply Strategy" button is clicked THEN it uses primary button style

- [ ] Task 8. Create New Session screen with tabbed input modes
  - Create `app/dashboard/new-session/page.tsx` wrapping existing form components
  - Implement tab switcher: pill-style tabs in `bg-surface-mid` container (rounded-md)
  - Active tab: `bg-card rounded-sm shadow-sm font-semibold`
  - Four tabs: "Start from Topic", "Upload Article", "Repurpose URL", "Data Pipeline"
  - Tab 1 renders `TopicForm` component (unchanged logic)
  - Tab 2 renders `ArticleUpload` component (unchanged logic)
  - Tab 3 renders simple URL input field (new, minimal)
  - Tab 4 renders `DataDrivenForm` component (unchanged logic)
  - Add "Create Session" button at bottom: `bg-primary`, `width: 100%`, `h-[52px]`, `rounded-sm`
  - _Requirements: Requirement 5 (New Session Screen)_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN new session page loads THEN tab switcher renders with 4 tabs
    - WHEN "Upload Article" tab is active THEN upload zone displays with dashed border

- [ ] Task 9. Create PipelineStepper shared component
  - Create `components/ui/PipelineStepper.tsx`: visual stepper showing Research → SEO → Write → Images → Distribute
  - Props: `current` step indicator, optional `onNavigate` callback
  - Active step: `bg-primary-muted text-primary font-semibold`
  - Completed step: show Check icon, `text-primary`, connector line `bg-primary`
  - Pending step: `text-foreground-3`, connector line `bg-foreground-4/60`
  - Container styling: `bg-card rounded-md shadow-sm border border-foreground-4/20`
  - Render as horizontal flex row with steps and connector lines
  - _Requirements: Requirement 6 AC 1–3_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN stepper renders with current="seo" THEN SEO step has `bg-primary-muted` and `text-primary`
    - WHEN step is completed THEN connector line to next step is `#00694c`

- [ ] Task 10. Redesign Research screen with PipelineStepper and sub-tabs
  - Update `app/dashboard/research/page.tsx`: add PipelineStepper at top
  - Page heading: 24px bold, tracking-tight
  - Implement underline-style sub-tabs (Keywords, Competitors, Content Brief)
  - Active tab: `border-primary text-primary font-semibold`
  - Inactive tab: `border-transparent text-foreground-3`
  - Update existing keyword table, competitor cards, outline card: use `bg-card rounded-lg shadow-md`
  - Row hover: `bg-surface-low transition-colors`
  - KD colour coding: >60 (destructive red), 40–60 (warning orange), <40 (primary teal)
  - _Requirements: Requirement 6 AC 4_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN Research page renders THEN PipelineStepper shows "Research" as current
    - WHEN tab is active THEN underline is `#00694c` with font-semibold

- [ ] Task 11. Redesign SEO screen with score dial and checklist
  - Update `app/dashboard/seo/page.tsx`: add PipelineStepper at top
  - Grid layout: `grid-cols-1 md:grid-cols-[280px_1fr]` (collapses to 1-col on mobile)
  - Left column: SVG score dial (140×140px)
    - Track circle: stroke `foreground-4` at 25%, strokeWidth 8
    - Progress circle: stroke `#00694c` (score ≥80) or `#996300` (score <80)
    - Centre: score value (38px bold) and label (11px uppercase)
  - Right column: check list with colour-coded rows
    - Pass: `bg-success-muted` circle with Check icon `text-primary`
    - Warn: `bg-warning-muted` circle with `!` text `text-warning`
    - Fail: `bg-destructive-muted` circle with × icon `text-destructive`
  - _Requirements: Requirement 6 AC 5–6_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN score ≥80 THEN dial progress stroke is `#00694c`
    - WHEN check item status is "pass" THEN icon is Check and colour is `#00694c`

- [ ] Task 12. Redesign Blog Editor screen with toolbar and AI Assist panel
  - Update `app/dashboard/blog/page.tsx`: add PipelineStepper at top
  - Toolbar: `flex flex-wrap items-center gap-0.5 px-4 py-2 border-b border-foreground-4/30`
  - Toolbar buttons: `hover:bg-surface-low rounded px-2 py-1 text-[12px] text-foreground-3`
  - Textarea: `font-serif text-[15px] leading-[1.75] p-7 min-h-[440px] w-full bg-transparent outline-none`
  - AI Assist panel: `w-[280px] bg-card rounded-lg shadow-md p-5` (toggleable)
  - Grid layout: `grid-cols-[1fr_280px]` when panel shown, `grid-cols-1` when hidden
  - _Requirements: Requirement 6 AC 7–8_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN textarea is focused THEN font is Georgia serif at 15px
    - WHEN AI Assist panel is visible THEN it has fixed width 280px on the right

- [ ] Task 13. Redesign Images screen with style filter pills and grid
  - Update `app/dashboard/images/page.tsx`: add PipelineStepper at top
  - Style filter row: `flex flex-wrap gap-1.5 mb-6` with pill buttons
  - Active pill: `border-primary bg-primary-muted text-primary`
  - Inactive pill: `border-border bg-card text-foreground-2`
  - Image grid: `grid grid-cols-2 gap-4` (1-col on mobile via `md:grid-cols-2`)
  - Card: `bg-card rounded-lg shadow-md overflow-hidden`
  - _Requirements: Requirement 6 (Content Pipeline Screens)_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN active style pill renders THEN background is `rgba(0,105,76,0.08)`
    - WHEN image grid is on mobile THEN it collapses to 1 column

- [ ] Task 14. Redesign Social distribution screens (X, LinkedIn, Instagram, Newsletter, Medium)
  - Update each file in `app/dashboard/social/*/page.tsx` (5 files) with consistent layout
  - Add PipelineStepper at top showing "Distribute" as current
  - Channel filter row: `flex flex-wrap gap-1.5 mb-6` with pill buttons
  - Active channel: `bg-primary-muted border-primary text-primary`
  - Post card: `bg-card rounded-lg shadow-md p-[22px]`, status badge top-left, time top-right
  - Action buttons at bottom: Edit, Rewrite (with Sparkles icon), Copy — all `variant="outline"` `h-8 px-3 text-[12px]`
  - Header buttons: Regenerate (outline) + Schedule All (primary)
  - _Requirements: Requirement 7 (Distribution Screens)_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN active channel is selected THEN pill background is `rgba(0,105,76,0.08)`
    - WHEN Rewrite button renders THEN Sparkles icon is `text-primary`

- [ ] Task 15. Redesign Analytics screen with KPI cards and charts
  - Update `app/dashboard/analytics/page.tsx`: wraps existing `AnalyticsDashboard`
  - Page heading: "Analytics & Insights", 32px bold, tracking-tight
  - Subtitle: 16px text-foreground-2
  - KPI cards grid: `grid-cols-1 md:grid-cols-3 gap-4 mb-6`
  - Value font: 36px bold, colour per KPI
  - Progress bar: `h-1.5 bg-foreground-4/30 rounded-full` with coloured inner bar
  - Bar chart bars: `linear-gradient(to top, #00694c, #008560)`, `rounded-t`
  - Dial gauges: SVG circles with `stroke=#00694c` (teal) or `stroke=#0060a8` (blue)
  - _Requirements: Requirement 8 (Analytics Screen)_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN KPI cards render THEN grid is 3 columns on desktop, 1 on mobile
    - WHEN bar chart renders THEN bars use teal gradient fill

- [ ] Task 16. Redesign Calendar screen with month view
  - Update `app/dashboard/calendar/page.tsx`: wraps existing `CalendarPanel`
  - Calendar grid: `grid grid-cols-7` inside `bg-card rounded-lg shadow-md`
  - Day header row: `text-[11px] font-semibold uppercase text-foreground-3 p-2.5 border-b`
  - Cell: `min-h-[80px] p-1.5 border-b border-r border-foreground-4/20`
  - Today cell: `bg-primary-muted`, day number `font-bold text-primary`
  - Out-of-month cells: `opacity-30`
  - Event chip: `text-[10px] font-medium border-l-2 bg-[color]/10 px-1.5 py-0.5 rounded-[3px] truncate`
  - _Requirements: Requirement 9 (Calendar Screen)_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN calendar renders THEN grid has 7 columns
    - WHEN cell is today THEN background is `rgba(0,105,76,0.08)` and day is bold teal

- [ ] Task 17. Redesign Library (Content Library) screen with filters
  - Update `components/sections/ContentLibrary.tsx` (or `app/dashboard/library/page.tsx`)
  - Filter row: pills (all, published, scheduled, review, draft)
  - Active filter: `bg-primary-muted border-primary text-primary`
  - List container: `bg-card rounded-lg shadow-md overflow-hidden`
  - Row hover: `hover:bg-surface-low transition-colors`
  - Show: article title, type+date subtitle, status badge, SEO score
  - SEO score colour: ≥85 `text-primary`, 70–84 `text-warning`
  - _Requirements: Requirement 10 (Library Screen)_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN filter is active THEN pill styling is `bg-primary-muted`
    - WHEN row is hovered THEN background transitions to `#eff5ef`

- [ ] Task 18. Redesign Brand Voice screen with profile cards
  - Update `components/sections/BrandVoiceSettings.tsx` (or `app/dashboard/brand-voice/page.tsx`)
  - Profile cards: `bg-card rounded-lg shadow-md p-6 cursor-pointer transition-all`
  - Active card: `border border-primary bg-primary-muted`
  - Inactive card: `border border-foreground-4/25`
  - Trait badges: `bg-surface-mid text-foreground-2 rounded-full px-2.5 py-1 text-[12px] font-medium`
  - "+ New Profile" button: primary button style, rounded-sm
  - _Requirements: Requirement 11 (Brand Voice Screen)_
  - _Skills: .kit/skills/frontend/code-writing_
  - **AC:**
    - WHEN profile card is active THEN border is `#00694c` and background is `rgba(0,105,76,0.08)`
    - WHEN trait badge renders THEN background is `#eaefea`

- [ ] Task 19. Redesign Auth screen (login/signup) with centered card
  - Create/update `app/(auth)/login/page.tsx` with centered card layout (or use existing auth route)
  - Create `app/(auth)/layout.tsx` if it doesn't exist: full-screen radial teal+blue gradient background
  - Card container: `max-width: 420px`, `border-radius: 24px`, `shadow-lg`, `padding: 32px 36px`
  - Logo: 72×72px, `rounded-lg` (16px), `object-cover`, loaded from `public/logo.png`
  - Heading: "Content Studio", 26px bold, `text-foreground`, -0.02em letter-spacing
  - Subtitle: "Sign in to your workspace", 14px, `text-foreground-3`
  - Google SSO button: h-12, `bg-card`, `border border-border`, `rounded-sm` (8px), with Google logo
  - Email and Password inputs: `border-foreground-4`, on focus: `border-secondary` + `ring-secondary/10`
  - Sign In button: `bg-primary` `text-primary-foreground`, `w-full`, `h-[52px]`, `rounded-md` (12px), 15px bold
  - Signup link at bottom: "Don't have an account? Create"
  - _Requirements: Requirement 12 (Authentication Screen)_
  - _Skills: .kit/skills/frontend/code-writing, .kit/skills/frontend/build-website-web-app_
  - **AC:**
    - WHEN auth card renders THEN max-width is 420px and border-radius is 24px
    - WHEN email input is focused THEN border is `#0060a8` with ring

- [ ] Task 20. Responsive mobile viewport fixes and visual regression test setup
  - Test all screens on mobile (375×812), tablet (768×1024), desktop (1440×900)
  - Ensure stat grid stacks: 4-col (desktop) → 2-col (tablet) → 1-col (mobile)
  - Ensure sidebar collapses to hamburger on mobile (<768px)
  - Reduce main content padding to 24px on mobile
  - Ensure pipeline screen grids collapse to 1-col on mobile
  - Create Playwright test suite in `e2e/ui-alignment.spec.ts`:
    - Test each route (login, hub, research, seo, blog, images, social/x, analytics, calendar, library, brand-voice)
    - Full-page screenshot + baseline comparison
    - Responsive viewport checks (verify grid columns match design)
  - Run TypeScript type-check: `npx tsc --noEmit`
  - Verify existing Jest/Vitest tests pass without modification
  - Smoke-test checklist: sign in, load session, restore session, form submits, API calls work
  - _Requirements: Requirement 13 (Responsive Behaviour), Requirement 14 (No Regression)_
  - _Skills: .kit/skills/frontend/build-website-web-app, .kit/skills/frontend/tdd_
  - **AC:**
    - WHEN viewport is 375px wide THEN stat grid is 1 column
    - WHEN TypeScript compile runs THEN zero errors are reported

---

## Summary

- **20 atomic tasks** broken down by functional domain (tokens → layout → screens → responsive/testing)
- **Each task is 2–5 min** to execute once prior dependencies are complete
- **Task order:** Tokens → Layout → Shared Components → Hub → New Session → Pipeline Screens → Distribution → Analytics/Calendar/Library/Brand Voice → Auth → Mobile/Testing
- **All existing logic preserved:** API routes, Supabase auth, session logic, form components remain unchanged
- **Design spec locked:** Tasks reference specific file paths, CSS values, and Tailwind classes from the approved design document

---

*Task plan created at `.spec/ui-alignment/tasks.md`. Please review the full list of tasks and reply 'approved' to generate the individual task files.*
