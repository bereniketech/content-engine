---
task: 12
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]
---

# Task 12: Redesign Blog Editor Screen

## Objective
Update `app/dashboard/blog/page.tsx`: add PipelineStepper, implement toolbar with hover states, update textarea styling for serif font, add toggleable AI Assist panel.

## Files
| File | What to change |
| `app/dashboard/blog/page.tsx` | Add PipelineStepper, toolbar, textarea, AI panel |

## Design Spec
- Toolbar: `flex flex-wrap items-center gap-0.5 px-4 py-2 border-b border-foreground-4/30`
- Toolbar buttons: `hover:bg-surface-low rounded px-2 py-1 text-[12px] text-foreground-3`
- Textarea: `font-serif text-[15px] leading-[1.75] p-7 min-h-[440px]`
- Grid: `grid-cols-[1fr_280px]` when panel shown, `grid-cols-1` when hidden
- AI Assist panel: `w-[280px] bg-card rounded-lg shadow-md p-5`

## Implementation
1. Add PipelineStepper with current="blog"
2. Create toolbar with formatting buttons
3. Update textarea: add `font-serif` class, adjust sizing/padding
4. Implement AI panel toggle state
5. Apply grid layout based on panel visibility

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
