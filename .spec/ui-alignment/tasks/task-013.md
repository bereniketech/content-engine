---
task: 13
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]
---

# Task 13: Redesign Images Screen

## Objective
Update `app/dashboard/images/page.tsx`: add PipelineStepper, implement style filter pills, create image grid with 2-col layout (1-col mobile).

## Files
| File | What to change |
| `app/dashboard/images/page.tsx` | Add PipelineStepper, filter pills, image grid |

## Design Spec
- Style filter pills: `rounded-full border text-[13px] font-medium px-4 py-2`
- Active: `border-primary bg-primary-muted text-primary`
- Inactive: `border-border bg-card text-foreground-2`
- Image grid: `grid grid-cols-2 gap-4` (1-col mobile via `md:grid-cols-2`)
- Card: `bg-card rounded-lg shadow-md overflow-hidden`

## Implementation
1. Add PipelineStepper with current="images"
2. Render filter pills for style selection
3. Create image grid layout
4. Apply hover/active states

## Decision Rules

| Scenario | Action |
|----------|--------|
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

## Acceptance Criteria
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
