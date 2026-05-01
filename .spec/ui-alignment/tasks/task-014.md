---
task: 14
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 13]
---

# Task 14: Redesign Social Distribution Screens

## Objective
Update all social distribution pages (`app/dashboard/social/*/page.tsx` — 5 files: x, linkedin, instagram, newsletter, medium) with consistent layout: PipelineStepper, channel filter pills, post cards with status badges, action buttons.

## Files
| File | What to change |
| `app/dashboard/social/x/page.tsx` | Add PipelineStepper, channel filters, post cards |
| `app/dashboard/social/linkedin/page.tsx` | Same as above |
| `app/dashboard/social/instagram/page.tsx` | Same as above |
| `app/dashboard/social/newsletter/page.tsx` | Same as above |
| `app/dashboard/social/medium/page.tsx` | Same as above |

## Design Spec
- PipelineStepper current="social-x" (or respective channel)
- Channel filter pills: `flex flex-wrap gap-1.5 mb-6`, rounded-full, active = primary-muted
- Post card: `bg-card rounded-lg shadow-md p-[22px]`
- Status badge top-left, time top-right
- Action buttons: Edit, Rewrite (with Sparkles icon), Copy — all outline style, h-8
- Header buttons: Regenerate (outline) + Schedule All (primary)

## Implementation
1. For each social page:
   - Add PipelineStepper with current="social-x"
   - Render channel filter pills
   - Render post cards with existing data
   - Apply new styling to buttons
   - Add Sparkles icon to Rewrite button

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
