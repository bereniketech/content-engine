---
task: 18
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
---

# Task 18: Redesign Brand Voice Screen

## Objective
Update brand voice component (or page): redesign profile cards with active/inactive states, update trait badges, style add-profile button.

## Files
| File | What to change |
| `components/sections/BrandVoiceSettings.tsx` or `app/dashboard/brand-voice/page.tsx` | Profile cards, trait badges, add button |

## Design Spec
- Profile cards: `bg-card rounded-lg shadow-md p-6 cursor-pointer transition-all`
- Active card: `border border-primary bg-primary-muted`
- Inactive card: `border border-foreground-4/25`
- Trait badges: `bg-surface-mid text-foreground-2 rounded-full px-2.5 py-1 text-[12px] font-medium`
- "+ New Profile" button: primary button style, rounded-sm

## Implementation
1. Update profile card styling
2. Apply active/inactive border states
3. Style trait badges with surface-mid background
4. Style add button as primary

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
