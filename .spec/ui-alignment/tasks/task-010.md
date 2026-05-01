---
task: 10
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9]
---

# Task 10: Redesign Research Screen with PipelineStepper

## Skills
- .kit/skills/languages/typescript-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

---

## Objective
Update `app/dashboard/research/page.tsx`: add PipelineStepper at top, implement underline-style sub-tabs (Keywords, Competitors, Content Brief), update card styling with new tokens, and add KD colour coding.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/research/page.tsx` | Add PipelineStepper, implement sub-tabs, update card styling, KD colour coding |

---

## Dependencies
- Task 1 (tokens)
- Task 9 (PipelineStepper)
- Existing research page logic

---

## Design Spec
- PipelineStepper: current="research"
- Page heading: 24px bold, tracking-tight
- Sub-tabs (underline style): Keywords, Competitors, Content Brief
  - Active: `border-primary text-primary font-semibold`
  - Inactive: `border-transparent text-foreground-3`
  - Container: `border-b border-foreground-4/60 flex gap-0 mb-6`
- Cards: `bg-card rounded-lg shadow-md`
- Row hover: `hover:bg-surface-low transition-colors`
- KD colour coding:
  - >60: `text-destructive font-semibold`
  - 40–60: `text-warning font-semibold`
  - <40: `text-primary font-semibold`

---

## Implementation Steps

1. Add import: `import { PipelineStepper } from "@/components/ui/PipelineStepper"`
2. Add state for sub-tabs: `const [activeSubTab, setActiveSubTab] = useState("keywords")`
3. Add PipelineStepper component at top with `current="research"`
4. Implement sub-tabs with underline styling (borderless buttons)
5. Update existing keyword table, competitor cards, outline card: apply new card styling
6. For KD scores in tables: apply colour coding based on value
7. Test: verify sub-tabs switch, cards styled correctly, KD colours applied

---

## Code Template (excerpt)

Add after page heading:
```tsx
<PipelineStepper current="research" />

{/* Sub-tabs */}
<div className="border-b border-foreground-4/60 flex gap-0 mb-6">
  {["keywords", "competitors", "content-brief"].map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveSubTab(tab)}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors border-b-2",
        activeSubTab === tab
          ? "border-primary text-primary font-semibold"
          : "border-transparent text-foreground-3 hover:text-foreground-2"
      )}
    >
      {tab === "keywords" ? "Keywords" : tab === "competitors" ? "Competitors" : "Content Brief"}
    </button>
  ))}
</div>

{/* Tab content - render existing components with new styling */}
```

For KD colour helper:
```tsx
function getKDColor(score: number): string {
  if (score > 60) return "text-destructive font-semibold";
  if (score >= 40) return "text-warning font-semibold";
  return "text-primary font-semibold";
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
- [ ] WHEN Research page renders THEN PipelineStepper shows "Research" as current
- [ ] WHEN tab is active THEN underline is primary colour (`var(--color-primary)`) with font-semibold
- [ ] WHEN KD score > 60 THEN text colour is destructive red
- [ ] WHEN card renders THEN background is card colour with `shadow-md` token
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)

---

## Handoff to Next Task
**Files changed:** `app/dashboard/research/page.tsx` updated
**Context:** Task 11 applies same pattern to SEO page.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
