---
task: 7
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6]
---

# Task 7: Create AIInsightBar Component

## Skills
- .kit/skills/languages/typescript-patterns/SKILL.md
- .kit/skills/frameworks-frontend/react-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

---

## Objective
Create `components/ui/AIInsightBar.tsx` component with teal-to-blue gradient background, left side icon + text, right side CTA buttons, and add to bottom of Hub page.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `components/ui/AIInsightBar.tsx` | AI Insight notification bar with gradient |

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/page.tsx` | Add AIInsightBar component at bottom (after sessions list) |

---

## Dependencies
- Task 1 (tokens) must be complete
- `lucide-react` (Lightbulb icon)

---

## Codebase Context

### Design Spec
- Background gradient: `linear-gradient(to right, rgba(29,158,117,0.05), rgba(55,138,221,0.05))`
- Border: `rgba(29,158,117,0.2)`
- Border radius: `rounded-xl` (24px)
- Padding: `p-6`
- Layout: flex row, items-center, justify-between
- Left: icon circle + text
- Right: secondary button ("Dismiss") + primary button ("Apply Strategy")

---

## Implementation Steps

1. Create `components/ui/AIInsightBar.tsx`
2. Accept props: `title: string`, `description: string`, `onApply?: () => void`, `onDismiss?: () => void`
3. Render with gradient bg, border, rounded corners
4. Add to `app/dashboard/page.tsx` above closing div (bottom of content)
5. Test in browser: verify gradient, buttons clickable

---

## Code Templates

### `components/ui/AIInsightBar.tsx` — Create

```tsx
import { Lightbulb, X } from "lucide-react";
import { Button } from "./button";

interface AIInsightBarProps {
  title: string;
  description: string;
  onApply?: () => void;
  onDismiss?: () => void;
}

export function AIInsightBar({
  title,
  description,
  onApply,
  onDismiss,
}: AIInsightBarProps) {
  return (
    <div
      className="rounded-xl border p-6 flex items-center justify-between gap-6"
      style={{
        background: "linear-gradient(to right, rgba(29,158,117,0.05), rgba(55,138,221,0.05))",
        borderColor: "rgba(29,158,117,0.2)",
      }}
    >
      {/* Left: Icon + text */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary-muted">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-sm mb-0.5">{title}</h3>
          <p className="text-[13px] text-foreground-2">{description}</p>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onApply}
        >
          Apply Strategy
        </Button>
      </div>
    </div>
  );
}
```

### `app/dashboard/page.tsx` — Add to Bottom (before closing div)

```tsx
      {/* AI Insight Bar */}
      <AIInsightBar
        title="AI Insight Engine"
        description='Your "RAG Architecture" guide is trending higher than expected. Click to apply this strategy to other topics.'
        onApply={() => console.log("Apply strategy")}
        onDismiss={() => console.log("Dismiss insight")}
      />
```

---

## Test Cases

1. Start dev: `npm run dev`
2. Navigate to `/dashboard`
3. Scroll to bottom → AIInsightBar visible
4. Verify gradient background applied
5. Click "Apply Strategy" → logs "Apply strategy"
6. Click "Dismiss" → logs "Dismiss insight"

---

## Acceptance Criteria

### Visual/Design Alignment
- [ ] WHEN AIInsightBar renders THEN gradient background is applied correctly (`linear-gradient(to right, rgba(29,158,117,0.05), rgba(55,138,221,0.05))`)
- [ ] WHEN AIInsightBar renders THEN border colour is `rgba(29,158,117,0.2)`
- [ ] WHEN AIInsightBar renders THEN border-radius is `rounded-xl` (24px)
- [ ] WHEN icon circle renders THEN background is `bg-primary-muted` and icon is `text-primary`
- [ ] WHEN "Apply Strategy" button renders THEN it uses primary button style (teal background)
- [ ] WHEN "Dismiss" button renders THEN it uses outline button style
- [ ] All design tokens (colors, spacing) match design.md spec

### Logic/Feature Completeness
- [ ] WHEN component mounts THEN no errors occur in console
- [ ] WHEN "Apply Strategy" button is clicked THEN `onApply` callback executes
- [ ] WHEN "Dismiss" button is clicked THEN `onDismiss` callback executes
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)
- [ ] When callbacks are undefined THEN buttons don't crash (safe to call)
- [ ] No existing page logic or state is affected by this component
- [ ] All existing tests pass (jest + playwright)
- [ ] `npm run type-check` — zero errors
- [ ] `/verify` passes

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Inline styles for gradient | Use `var(--gradient-*)` tokens or CSS variables for gradients; if dynamic, map to design token values in style prop |
| Icon and button styling | Use existing Button component from components/ui/button; use Lightbulb icon from lucide-react |
| Callbacks undefined | Check if callback exists before calling (use optional chaining or conditional call) |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

---

## Handoff to Next Task
**Files changed:** `components/ui/AIInsightBar.tsx` created, `app/dashboard/page.tsx` updated
**Context for next task:** Task 8 creates New Session page with tabbed form wrapper.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
