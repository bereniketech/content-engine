---
task: 15
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
---

# Task 15: Redesign Analytics Screen

## Objective
Update `app/dashboard/analytics/page.tsx`: add page heading/subtitle, redesign KPI cards grid, style bar charts with gradient, update dial gauges.

## Files
| File | What to change |
| `app/dashboard/analytics/page.tsx` | Add heading, KPI grid, chart styling, gauges |

## Design Spec
- Heading: "Analytics & Insights", 32px bold
- KPI cards: grid-cols-1 md:grid-cols-3, value 36px bold
- Progress bar: h-1.5, rounded-full, coloured fill
- Bar chart: gradient `linear-gradient(to top, #00694c, #008560)`, rounded-t
- Dial gauges: SVG circles with primary/secondary stroke

## Implementation
1. Add heading section
2. Update KPI card grid layout
3. Apply gradient fills to charts
4. Update dial gauge styling

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
