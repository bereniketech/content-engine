---
task: 16
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
---

# Task 16: Redesign Calendar Screen

## Objective
Update `app/dashboard/calendar/page.tsx`: redesign calendar grid layout, style day cells, update today state, style event chips.

## Files
| File | What to change |
| `app/dashboard/calendar/page.tsx` | Update grid layout, cell styling, today state, event chips |

## Design Spec
- Grid: `grid grid-cols-7`, container `bg-card rounded-lg shadow-md`
- Day headers: `text-[11px] font-semibold uppercase text-foreground-3 p-2.5 border-b`
- Cell: `min-h-[80px] p-1.5 border-b border-r border-foreground-4/20`
- Today cell: `bg-primary-muted`, day number bold primary
- Out-of-month cells: `opacity-30`
- Event chip: `text-[10px] font-medium border-l-2 bg-[color]/10 px-1.5 py-0.5 rounded-[3px]`

## Implementation
1. Update grid to grid-cols-7
2. Style headers with new colours
3. Apply today state styling
4. Update event chip styling

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
