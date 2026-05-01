---
task: 9
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8]
---

# Task 9: Create PipelineStepper Shared Component

## Skills
- .kit/skills/languages/typescript-patterns/SKILL.md
- .kit/skills/frameworks-frontend/react-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

---

## Objective
Create `components/ui/PipelineStepper.tsx` showing a horizontal progress stepper with steps (Research → SEO → Write → Images → Distribute), active/pending/completed states, and optional navigation callback.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `components/ui/PipelineStepper.tsx` | Visual pipeline progress stepper |

---

## Dependencies
- Task 1 (tokens)
- `lucide-react` (Check icon)

---

## Design Spec
- Container: `bg-card rounded-md shadow-sm border border-foreground-4/20 flex items-center px-2 py-1.5 mb-7`
- Active step: `bg-primary-muted text-primary font-semibold`
- Completed step: Check icon, `text-primary`, connector `bg-primary`
- Pending step: `text-foreground-3`, connector `bg-foreground-4/60`
- Connector line: `w-7 h-0.5` between steps

---

## Implementation Steps

1. Create component with `current` prop (string: "research" | "seo" | "blog" | "images" | "social-x")
2. Define step objects with labels
3. Render horizontal flex row with steps and connectors
4. Color steps based on current + completed status
5. Accept optional `onNavigate` callback
6. Test: verify active/pending states and colours

---

## Code Templates

### `components/ui/PipelineStepper.tsx` — Create

```tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStepperProps {
  current: "research" | "seo" | "blog" | "images" | "social-x";
  onNavigate?: (step: string) => void;
}

const STEPS = [
  { id: "research", label: "Research" },
  { id: "seo", label: "SEO" },
  { id: "blog", label: "Write" },
  { id: "images", label: "Images" },
  { id: "social-x", label: "Distribute" },
];

const stepOrder: Record<string, number> = {
  research: 0,
  seo: 1,
  blog: 2,
  images: 3,
  "social-x": 4,
};

export function PipelineStepper({ current, onNavigate }: PipelineStepperProps) {
  const currentIndex = stepOrder[current] ?? 0;

  return (
    <div className="bg-card rounded-md shadow-sm border border-foreground-4/20 flex items-center px-2 py-1.5 mb-7 gap-1 overflow-x-auto">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;
        const isPending = idx > currentIndex;

        return (
          <div key={step.id} className="flex items-center gap-1">
            {/* Step button */}
            <button
              onClick={() => onNavigate?.(step.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-3.5 py-2 whitespace-nowrap text-sm font-medium transition-colors",
                isActive && "bg-primary-muted text-primary font-semibold",
                isCompleted && "text-primary",
                isPending && "text-foreground-3 hover:text-foreground-2"
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className={cn(
                  "inline-block w-2 h-2 rounded-full",
                  isActive && "bg-primary",
                  isPending && "bg-foreground-4/60"
                )} />
              )}
              {step.label}
            </button>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-7 rounded-full",
                  isCompleted && "bg-primary",
                  !isCompleted && "bg-foreground-4/60"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Test Cases

1. Import and render with `current="seo"`
2. Verify:
   - "Research" step has Check icon + primary text
   - "SEO" step has `bg-primary-muted` + bold primary text
   - "Write" and later steps are gray text
   - Connector between Research→SEO is primary colour
   - Connector between SEO→Write is gray

---

## Acceptance Criteria

### Visual/Design Alignment
- [ ] WHEN stepper renders THEN container is `bg-card rounded-md shadow-sm` with border
- [ ] WHEN stepper renders with current="seo" THEN SEO step has `bg-primary-muted` and bold `text-primary`
- [ ] WHEN step is completed THEN Check icon displays with `text-primary`
- [ ] WHEN step is completed THEN connector line to next step is `#00694c` (primary)
- [ ] WHEN step is pending THEN text colour is `#6d7a73` (foreground-3)
- [ ] WHEN step is pending THEN connector line is grey (`foreground-4/60`)
- [ ] All design tokens (colors, spacing, radius) match design.md spec

### Logic/Feature Completeness
- [ ] WHEN component mounts THEN no errors occur in console
- [ ] WHEN `current` prop changes THEN stepper updates active step without re-rendering other components
- [ ] WHEN optional `onNavigate` callback exists THEN it is called with step ID when button is clicked
- [ ] WHEN `onNavigate` is undefined THEN button clicks do not crash (safe default)
- [ ] WHEN stepper renders THEN all 5 steps (Research, SEO, Write, Images, Distribute) are present
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)
- [ ] No page navigation or state changes occur automatically (callback is optional)
- [ ] All existing tests pass (jest + playwright)
- [ ] `npm run type-check` — zero errors
- [ ] `/verify` passes

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Step order and naming | Use exact order: Research (0) → SEO (1) → Write (2) → Images (3) → Distribute (4); do NOT reorder or rename |
| Current step prop | Accept string enum; invalid values default to first step (research) |
| Navigation callback | Optional; if provided, call with step ID; do NOT enforce navigation (parent component decides) |
| Completed vs Pending | Calculate from step index vs current index; no external completion tracking |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

---

## Handoff to Next Task
**Files changed:** `components/ui/PipelineStepper.tsx` created
**Context for next task:** Tasks 10-14 integrate PipelineStepper into pipeline screens.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
