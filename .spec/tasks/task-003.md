# TASK-003 — Dashboard Shell & Sidebar

## Session Bootstrap
Skills needed: build-website-web-app, code-writing-software-development

## Objective
Build the authenticated dashboard layout: sidebar with 13 sections, top bar, and content area shell with placeholder panels and non-functional Copy/Edit/Regenerate action buttons.

## Implementation Steps
1. Create `/app/dashboard/layout.tsx` — wraps all dashboard pages with sidebar + top bar
2. Create `/components/dashboard/Sidebar.tsx` — renders 13 nav items with icons, highlights active route
3. Create `/components/dashboard/ActionBar.tsx` — Copy / Edit / Regenerate buttons (onClick stubs)
4. Create `/components/dashboard/ContentCard.tsx` — card wrapper with title, content area, and ActionBar
5. Create `/app/dashboard/page.tsx` — home/overview with placeholder ContentCards
6. Create placeholder `page.tsx` files for each section: `research/`, `seo/`, `blog/`, `images/`, `social/x/`, `social/linkedin/`, `social/instagram/`, `social/medium/`, `social/reddit/`, `social/newsletter/`, `social/pinterest/`, `calendar/`, `analytics/`
7. Add Tailwind responsive classes: sidebar collapses to hamburger on `md` breakpoint
8. Install shadcn/ui: `npx shadcn@latest init` and add `button`, `card`, `badge` components

## Acceptance Criteria
- Sidebar renders all 13 sections: Research, SEO, Blog, Images, X, LinkedIn, Instagram, Medium, Reddit, Newsletter, Pinterest, Calendar, Analytics
- Active section highlights in sidebar on click
- Layout is responsive (sidebar collapses on mobile)
- Each section renders a placeholder ContentCard with Copy / Edit / Regenerate buttons (non-functional)

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [ ]
- Next task: task-004.md
- Notes: ___
