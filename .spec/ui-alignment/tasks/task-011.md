---
task: 11
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
---

# Task 11: Redesign SEO Screen with Score Dial and Checklist

## Objective
Update `app/dashboard/seo/page.tsx`: add PipelineStepper, implement grid layout with left score dial (SVG), right checklist with colour-coded rows.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/seo/page.tsx` | Add PipelineStepper, add score dial SVG, update checklist styling |

---

## Dependencies
- Task 1 (tokens)
- Task 9 (PipelineStepper)

---

## Design Spec
- Grid: `grid-cols-1 md:grid-cols-[280px_1fr]` (left dial, right checklist)
- Score dial: 140×140px SVG
  - Track: stroke `foreground-4` at 25% opacity, strokeWidth 8
  - Progress: stroke `#00694c` (≥80) or `#996300` (<80), strokeDasharray based on score
  - Centre: value (38px bold) + label (11px uppercase)
- Checklist rows:
  - Pass: `bg-success-muted` circle + Check icon `text-primary`
  - Warn: `bg-warning-muted` circle + `!` text `text-warning`
  - Fail: `bg-destructive-muted` circle + × icon `text-destructive`

---

## Implementation Steps

1. Add PipelineStepper at top
2. Create score dial SVG helper function
3. Implement grid layout
4. Render score dial on left
5. Render checklist on right with colour-coded badges
6. Test: verify dial colours and checklist styling

---

## Code Template (SVG dial excerpt)

```tsx
function ScoreDial({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const isGood = score >= 80;

  return (
    <div className="flex items-center justify-center">
      <div className="relative w-[140px] h-[140px]">
        <svg viewBox="0 0 140 140" className="w-full h-full">
          {/* Track */}
          <circle cx="70" cy="70" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-foreground-4 opacity-25" />
          {/* Progress */}
          <circle cx="70" cy="70" r="60" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={isGood ? "text-primary" : "text-warning"} style={{ transform: "rotate(-90deg)", transformOrigin: "70px 70px", transition: "stroke-dashoffset 500ms ease" }} />
        </svg>
        {/* Centre text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[38px] font-extrabold text-foreground">{score}</span>
          <span className="text-[11px] uppercase tracking-wider text-foreground-3">SEO</span>
        </div>
      </div>
    </div>
  );
}
```

---

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
- [ ] WHEN score ≥80 THEN dial progress stroke is primary colour (`var(--color-primary)`)
- [ ] WHEN check item status is "pass" THEN icon is Check and colour is primary
- [ ] WHEN grid renders THEN left column is 280px wide on desktop
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)

---

## Handoff to Next Task
**Files changed:** `app/dashboard/seo/page.tsx` updated

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
