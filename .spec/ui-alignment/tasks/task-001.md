---
task: 1
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: []
---

# Task 1: Configure Design Tokens in CSS

## Skills
- .kit/skills/languages/css/SKILL.md
- .kit/skills/frameworks-frontend/tailwind/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

## Commands
- .kit/commands/core/code-review.md

> Load the skills, agents, and commands listed above before reading anything else. Do not load CLAUDE.md. Follow paths exactly.

---

## Objective
Replace the current CSS custom properties and Tailwind theme in `app/globals.css` with the Lumina AI token set (teal backgrounds, new foreground tones, radius tiers, teal-tinted shadows).

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `app/globals.css` | Replace entire `:root` block and `@theme inline` block with new token definitions |

---

## Dependencies
None — this is Task 1 (no dependencies).

---

## Codebase Context

### Current Token Structure (app/globals.css)
**Current `@theme inline` block:**
```css
@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
}
```

Current `:root` uses dark navy sidebar (`--sidebar-bg: 222 47% 11%`), blue primary (`--primary: 220 90% 56%`).

### Key Patterns
- All colours defined as HSL triplets in `:root` custom properties
- Tailwind `@theme inline` maps CSS vars to Tailwind scale
- No arbitrary hex values in components — only class names (enforced via linter if available)
- `--font-geist-sans` and `--font-geist-mono` are referenced; will be replaced in Task 2

---

## Implementation Steps

1. `app/globals.css` — Replace `:root` block completely with new token definitions (lines 3–27)
2. `app/globals.css` — Replace `@theme inline` block completely (lines 29–51)
3. Run `npm run build` to verify Tailwind compiles without errors
4. Verify no TypeScript errors: `npx tsc --noEmit`

---

## Code Templates

### `app/globals.css` — Full File (Replacement)

```css
@import "tailwindcss";

:root {
  /* Backgrounds */
  --background:        160 33% 96%;   /* #f5fbf5 — page bg (teal-tinted off-white) */
  --sidebar:           120 10% 97%;   /* #f8faf8 — sidebar surface */
  --card:              0 0% 100%;     /* #ffffff — card / surface */
  --surface-low:       120 15% 95%;   /* #eff5ef — surface-container-low */
  --surface-mid:       120 10% 93%;   /* #eaefea — surface-container */
  --hover:             120 8% 90%;    /* #e4eae4 — hover bg */

  /* Foreground */
  --foreground:        150 10% 11%;   /* #171d1a — on-surface (warm dark) */
  --foreground-2:      145 11% 25%;   /* #3d4943 — on-surface-variant */
  --foreground-3:      148 6% 45%;    /* #6d7a73 — outline / muted */
  --foreground-4:      150 14% 74%;   /* #bccac1 — outline-variant / borders */

  /* Primary — Deep Teal */
  --primary:           160 100% 21%;  /* #00694c */
  --primary-container: 160 100% 26%;  /* #008560 */
  --primary-hover:     160 100% 16%;  /* #00513a */
  --primary-muted:     160 100% 21% / 0.08;  /* rgba(0,105,76,0.08) */
  --primary-foreground: 0 0% 100%;   /* #ffffff */

  /* Secondary — Confidence Blue */
  --secondary:         210 100% 33%;  /* #0060a8 */
  --secondary-muted:   210 100% 33% / 0.08; /* rgba(0,96,168,0.08) */
  --secondary-foreground: 0 0% 100%; /* #ffffff */

  /* Semantic */
  --success:           160 100% 21%;  /* same as primary */
  --success-muted:     160 100% 21% / 0.10;
  --warning:           38 100% 30%;   /* #996300 */
  --warning-muted:     38 100% 30% / 0.10;
  --destructive:       0 74% 42%;     /* #ba1a1a */
  --destructive-muted: 0 74% 42% / 0.08;

  /* Border / Input */
  --border:            150 14% 74%;   /* #bccac1 */
  --input:             150 14% 74%;
  --ring:              210 100% 33%;  /* blue focus ring */

  /* Sidebar specific */
  --sidebar-border:    160 12% 88%;   /* #e2e8e4 */
}

@theme inline {
  /* Colours */
  --color-background:          hsl(var(--background));
  --color-sidebar:             hsl(var(--sidebar));
  --color-card:                hsl(var(--card));
  --color-surface-low:         hsl(var(--surface-low));
  --color-surface-mid:         hsl(var(--surface-mid));
  --color-hover:               hsl(var(--hover));
  --color-foreground:          hsl(var(--foreground));
  --color-foreground-2:        hsl(var(--foreground-2));
  --color-foreground-3:        hsl(var(--foreground-3));
  --color-foreground-4:        hsl(var(--foreground-4));
  --color-primary:             hsl(var(--primary));
  --color-primary-foreground:  hsl(var(--primary-foreground));
  --color-primary-muted:       hsl(var(--primary-muted));
  --color-secondary:           hsl(var(--secondary));
  --color-secondary-foreground:hsl(var(--secondary-foreground));
  --color-success:             hsl(var(--success));
  --color-success-muted:       hsl(var(--success-muted));
  --color-warning:             hsl(var(--warning));
  --color-warning-muted:       hsl(var(--warning-muted));
  --color-destructive:         hsl(var(--destructive));
  --color-border:              hsl(var(--border));
  --color-input:               hsl(var(--input));
  --color-ring:                hsl(var(--ring));
  --color-sidebar-border:      hsl(var(--sidebar-border));

  /* Typography */
  --font-sans: 'Inter', -apple-system, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;

  /* Radius — tiered system */
  --radius-sm:  8px;   /* buttons, inputs */
  --radius-md:  12px;  /* small cards, tabs */
  --radius-lg:  16px;  /* content cards */
  --radius-xl:  24px;  /* modals, AI prompt bar */
  --radius-full: 9999px;

  /* Shadows — teal-tinted */
  --shadow-sm: 0 1px 3px rgba(0,60,40,0.06);
  --shadow-md: 0 4px 12px rgba(0,60,40,0.08);
  --shadow-lg: 0 8px 24px rgba(0,60,40,0.12);

  /* Transitions */
  --transition-fast: 120ms ease;
  --transition-med:  200ms ease;
}

body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: Arial, Helvetica, sans-serif;
}
```

---

## Test Cases

**Manual smoke test (in browser dev tools):**
1. Open app in dev mode: `npm run dev`
2. Navigate to any page
3. Open DevTools → Inspector → select any element
4. Check Computed styles:
   - Background should resolve to `rgb(245, 251, 245)` (#f5fbf5)
   - Any primary button should show `rgb(0, 105, 76)` (#00694c)
5. Check that fonts are `Inter` (will be live fonts until Task 2)

**Tailwind class verification:**
- `bg-background` → `#f5fbf5` ✓
- `text-primary` → `#00694c` ✓
- `rounded-sm` → `8px` ✓
- `shadow-md` → teal-tinted shadow ✓

---

## Acceptance Criteria

### Visual/Design Alignment
- [ ] WHEN app compiles THEN `bg-background` resolves to `rgb(245, 251, 245)` (#f5fbf5)
- [ ] WHEN dev uses `text-primary` THEN it resolves to `rgb(0, 105, 76)` (#00694c)
- [ ] WHEN dev uses `text-secondary` THEN it resolves to `rgb(0, 96, 168)` (#0060a8)
- [ ] WHEN dev uses `bg-card` THEN it resolves to `rgb(255, 255, 255)` (#ffffff)
- [ ] WHEN dev uses `rounded-sm` THEN it resolves to `8px`
- [ ] WHEN dev uses `rounded-xl` THEN it resolves to `24px`
- [ ] WHEN dev uses `shadow-md` THEN it resolves to teal-tinted shadow
- [ ] All colour, spacing, radius, and shadow tokens match design.md spec exactly

### Logic/Feature Completeness
- [ ] WHEN TypeScript compile runs THEN zero errors are reported
- [ ] WHEN Tailwind builds THEN all new colour classes are available (e.g., `text-foreground-2`, `bg-surface-low`)
- [ ] WHEN app loads THEN no CSS parsing errors appear in console
- [ ] WHEN arbitrary hex/rgb values exist in components THEN they are NOT used (only Tailwind classes from tokens)
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
| HSL vs RGB/Hex values | Use HSL triplets in `:root` custom properties for all colours; Tailwind's `hsl()` function converts to RGB at build time |
| Font variable names | Update from `--font-geist-sans` and `--font-geist-mono` to `--font-sans` and `--font-mono` (Task 2 will set the font imports) |
| Radius and shadow tokens | Add to `@theme inline` block so they're available as Tailwind utilities (e.g., `rounded-sm`, `shadow-md`) |
| Transition tokens | Include `--transition-fast` and `--transition-med` for use in component classes |
| Fallback fonts | Keep fallback chains in `@theme inline` (e.g., `-apple-system, system-ui, sans-serif` for sans-serif) |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

---

## Handoff to Next Task
**Files changed by this task:** `app/globals.css`
**Context for next task:** Design tokens are now active. Task 2 will import Inter font and reference the `--font-sans` custom property that was defined here.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
