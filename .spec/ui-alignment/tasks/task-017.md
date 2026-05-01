---
task: 17
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 16]
---

# Task 17: Redesign Library (Content Library) Screen

## Objective
Update content library component (or library page): implement filter pills, update list styling with row hover states, apply SEO score colours.

## Files
| File | What to change |
| `components/sections/ContentLibrary.tsx` or `app/dashboard/library/page.tsx` | Filter pills, list styling, SEO score colours |

## Design Spec
- Filter pills: all, published, scheduled, review, draft
- Active filter: `bg-primary-muted border-primary text-primary`
- List container: `bg-card rounded-lg shadow-md overflow-hidden`
- Row hover: `hover:bg-surface-low transition-colors`
- SEO score: ≥85 `text-primary`, 70–84 `text-warning`

## Implementation
1. Add filter pill buttons
2. Update list container styling
3. Apply row hover transition
4. Color SEO scores based on value

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
