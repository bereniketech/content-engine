---
task: 2
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1]
---

# Task 2: Update Typography — Inter Font Import and Tailwind Mapping

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
Replace Geist font imports with Inter and JetBrains Mono from `next/font/google`, update `<html>` className to reference the new font variables, and verify Tailwind `@theme inline` maps them correctly.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `app/layout.tsx` | Replace Geist imports with Inter + JetBrains_Mono; update className variables |

---

## Dependencies
- Task 1 (tokens including `--font-sans` mapping) must be complete
- Node.js 18+

---

## Codebase Context

### Current Font Setup (app/layout.tsx, lines 2–13)
```tsx
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

Current `<html>` className (line 28):
```tsx
className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
```

### New Tailwind Mapping (Task 1 — app/globals.css)
```css
@theme inline {
  --font-sans: 'Inter', -apple-system, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
  /* ... */
}
```

### Key Patterns
- Next.js font imports return objects with a `variable` property (CSS custom property name)
- The variable is injected into the `<html>` className
- Tailwind resolves `font-sans` and `font-mono` via the token mapping
- Font subsetting: use `["latin"]` for production (default)

---

## Implementation Steps

1. `app/layout.tsx` — Replace lines 2–13 (Geist imports + const declarations) with Inter + JetBrains_Mono imports
2. `app/layout.tsx` — Update line 28 `<html>` className to reference new variables
3. Run `npm run dev` and load the page in a browser
4. Open DevTools → Inspector → `<body>` element → Computed styles → `font-family` field
5. Verify: should start with `"Inter"`, not `"Geist"`

---

## Code Templates

### `app/layout.tsx` — Complete File (Replacement)

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Content Studio",
  description: "AI-powered content generation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

---

## Test Cases

**Verification steps (manual, in browser):**

1. Start dev server: `npm run dev`
2. Navigate to any page (e.g., `/dashboard`)
3. Open DevTools → Inspector
4. Select the `<body>` element
5. In Styles panel, find rule: `body { font-family: ... }`
6. Computed value should display font as starting with `"Inter"`
7. In Console, verify no font-loading errors: `console.log(window.getComputedStyle(document.body).fontFamily)`

**Expected output:**
```
'"Inter", -apple-system, system-ui, sans-serif'
```

**Network verification:**
- Go to DevTools → Network
- Filter by `font`
- Should see requests to `_next/static/` (self-hosted fonts downloaded at build time)
- No external CDN requests (e.g., `fonts.googleapis.com`)

---

## Acceptance Criteria

### Visual/Design Alignment
- [ ] WHEN page loads THEN `font-family` computed style on `<body>` starts with `"Inter"`
- [ ] WHEN a user inspects fonts THEN Inter fonts are served from `_next/static/` (self-hosted, not CDN)
- [ ] All design tokens (fonts specified in design.md) are correctly applied

### Logic/Feature Completeness
- [ ] WHEN `app/layout.tsx` is compiled THEN no TypeScript errors or warnings appear
- [ ] WHEN page renders THEN all existing layout structure remains unchanged
- [ ] WHEN fonts load THEN no functionality is affected or broken
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
| Existing layout structure in RootLayout | Keep exact same component structure and children; only replace font imports and className |
| HTML/body element attributes | Keep all existing attributes (lang, className structure); only update font variable names |
| Metadata export | Keep existing metadata unchanged |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

---

## Handoff to Next Task
**Files changed by this task:** `app/layout.tsx`
**Context for next task:** Typography is now live. Task 3 will update dashboard layout and can assume Inter is available globally.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
