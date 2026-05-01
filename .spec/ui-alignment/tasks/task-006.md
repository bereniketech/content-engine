---
task: 6
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5]
---

# Task 6: Create StatusBadge Component with Status Colour Variants

## Skills
- .kit/skills/languages/typescript-patterns/SKILL.md
- .kit/skills/frameworks-frontend/react-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

## Commands
- .kit/commands/core/code-review.md

---

## Objective
Create `components/ui/StatusBadge.tsx` with four status colour variants (published, review, draft, scheduled), render as pill-shaped badges, and update hub page session rows to use it.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `components/ui/StatusBadge.tsx` | Status badge component with variant-based styling |

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/page.tsx` | Update session rows to import and use StatusBadge (Task 5 already modified this file) |

---

## Dependencies
- Task 1 (tokens) must be complete
- Task 5 (hub page) should be complete for integration

---

## Codebase Context

### Status Badge Variants (from design.md)
| Status | Background | Text | Hex |
|---|---|---|---|
| `published` | `rgba(0,105,76,0.1)` | `#00694c` | primary-muted bg + primary text |
| `review` | `rgba(153,99,0,0.1)` | `#996300` | warning-muted bg + warning text |
| `draft` | `rgba(109,122,115,0.12)` | `#6d7a73` | gray muted bg + foreground-3 text |
| `scheduled` | `rgba(0,96,168,0.08)` | `#0060a8` | secondary-muted bg + secondary text |

### Styling
- Shape: `rounded-full px-2.5 py-0.5`
- Font: `text-[11px] font-semibold`
- No borders

---

## Implementation Steps

1. Create `components/ui/StatusBadge.tsx` with enum type for variants
2. Accept props: `status: "published" | "review" | "draft" | "scheduled"`
3. Map variant to Tailwind classes (bg-primary-muted + text-primary, etc.)
4. In `app/dashboard/page.tsx` session rows: replace generic `Badge` with `StatusBadge` for status display
5. Test in browser: verify each status colour

---

## Code Templates

### `components/ui/StatusBadge.tsx` — Create

```tsx
import { cn } from "@/lib/utils";

export type StatusVariant = "published" | "review" | "draft" | "scheduled";

interface StatusBadgeProps {
  status: StatusVariant;
  children?: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const variants: Record<StatusVariant, string> = {
    published: "bg-primary-muted text-primary",
    review: "bg-warning-muted text-warning",
    draft: "bg-surface-mid text-foreground-3",
    scheduled: "bg-secondary-muted text-secondary",
  };

  const displayText: Record<StatusVariant, string> = {
    published: "Published",
    review: "In Review",
    draft: "Draft",
    scheduled: "Scheduled",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        variants[status]
      )}
    >
      {children ?? displayText[status]}
    </span>
  );
}
```

### `app/dashboard/page.tsx` — Update Session Row (excerpt)

Replace this Badge usage:
```tsx
<Badge variant={session.inputType === "topic" ? "default" : "secondary"}>
  {session.inputType === "topic"
    ? "Topic"
    : session.inputType === "data-driven"
      ? "Data-Driven"
      : "Upload"}
</Badge>
```

With StatusBadge (if status field exists on session):
```tsx
<StatusBadge status="published" />
```

Or keep generic Badge for input type, add StatusBadge separately if session has a status field.

---

## Test Cases

**Visual verification (browser):**

1. Open `/dashboard`
2. Inspect session rows
3. For each status variant, verify:
   - `published`: background `rgba(0,105,76,0.1)`, text `#00694c`
   - `review`: background `rgba(153,99,0,0.1)`, text `#996300`
   - `draft`: background `rgba(109,122,115,0.12)`, text `#6d7a73`
   - `scheduled`: background `rgba(0,96,168,0.08)`, text `#0060a8`

---

## Acceptance Criteria

### Visual/Design Alignment
- [ ] WHEN status is "published" THEN badge background is `rgba(0,105,76,0.1)` and text is `#00694c` (primary colours)
- [ ] WHEN status is "review" THEN badge background is `rgba(153,99,0,0.1)` and text is `#996300` (warning colours)
- [ ] WHEN status is "draft" THEN badge background is grey and text is grey
- [ ] WHEN status is "scheduled" THEN badge background is `rgba(0,96,168,0.08)` and text is `#0060a8` (secondary colours)
- [ ] WHEN component renders THEN shape is pill-shaped (`rounded-full`) with `px-2.5 py-0.5`
- [ ] WHEN badge renders THEN font is `text-[11px] font-semibold`
- [ ] All design tokens (colors) match design.md spec

### Logic/Feature Completeness
- [ ] WHEN StatusBadge is imported THEN it accepts status enum values from sessions data
- [ ] WHEN component renders THEN children prop allows override of default display text
- [ ] WHEN session status changes THEN badge colour updates correctly
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)
- [ ] No existing session data or state is affected
- [ ] All existing tests pass (jest + playwright)
- [ ] `npm run type-check` — zero errors
- [ ] `/verify` passes

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Status string from session API | Accept 'published' \| 'review' \| 'draft' \| 'scheduled' enum values from session.status |
| Custom children text | Optional children prop allows override of default display text (e.g., <StatusBadge status="draft">Custom Label</StatusBadge>) |
| Colour mapping to tokens | Use token-based colours from design.md (primary-muted, warning-muted, secondary-muted); do NOT hardcode hex/rgb values |
| Backward compatibility | If session doesn't have status field, keep generic Badge for now; StatusBadge is for when status data is available |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

---

## Handoff to Next Task
**Files changed:** `components/ui/StatusBadge.tsx` created, `app/dashboard/page.tsx` updated
**Context for next task:** Task 7 creates AIInsightBar component with gradient styling.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
