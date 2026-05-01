---
task: 8
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5]
---

# Task 8: Create New Session Screen with Tabbed Input Modes

## Skills
- .kit/skills/languages/typescript-patterns/SKILL.md
- .kit/skills/frameworks-frontend/react-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

---

## Objective
Create `app/dashboard/new-session/page.tsx` that wraps existing form components (TopicForm, ArticleUpload, DataDrivenForm) with a tabbed interface, add minimal URL input for "Repurpose URL" tab, and add full-width primary button.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/dashboard/new-session/page.tsx` | Tabbed session creation page |

---

## Dependencies
- Task 1 (tokens) must be complete
- Existing form components: `components/input/TopicForm.tsx`, `ArticleUpload.tsx`, `DataDrivenForm.tsx`
- Button component

---

## Codebase Context

### Tab Switcher Spec
- Container: `bg-surface-mid rounded-md p-1 flex gap-1`
- Active tab: `bg-card rounded-sm shadow-sm font-semibold text-foreground`
- Inactive tab: `text-foreground-3 font-normal`

### Create Session Button
- `bg-primary text-primary-foreground w-full h-[52px] rounded-sm text-[15px] font-semibold mt-7`

### Tabs
1. "Start from Topic" → TopicForm
2. "Upload Article" → ArticleUpload
3. "Repurpose URL" → Simple URL input (new, minimal)
4. "Data Pipeline" → DataDrivenForm

---

## Implementation Steps

1. Create `app/dashboard/new-session/page.tsx` (client component)
2. Implement tab state with useState
3. Render tab switcher with pill buttons
4. Render form components in tab panels
5. For URL tab: simple text input field
6. Add "Create Session" button at bottom
7. Test: verify tab switching, form rendering

---

## Code Templates

### `app/dashboard/new-session/page.tsx` — Create

```tsx
"use client";

import { useState } from "react";
import { TopicForm } from "@/components/input/TopicForm";
import { ArticleUpload } from "@/components/input/ArticleUpload";
import { DataDrivenForm } from "@/components/input/DataDrivenForm";
import { Button } from "@/components/ui/button";

type SessionTab = "topic" | "upload" | "url" | "data-driven";

export default function NewSessionPage() {
  const [activeTab, setActiveTab] = useState<SessionTab>("topic");
  const [url, setUrl] = useState("");

  const tabs: Array<{ id: SessionTab; label: string }> = [
    { id: "topic", label: "Start from Topic" },
    { id: "upload", label: "Upload Article" },
    { id: "url", label: "Repurpose URL" },
    { id: "data-driven", label: "Data Pipeline" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Create New Session</h2>
        <p className="mt-1 text-sm text-foreground-2">
          Start with a topic brief, source material, or an uploaded article to initialize your workflow.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="inline-flex rounded-md bg-surface-mid p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-sm px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-card shadow-sm font-semibold text-foreground"
                : "text-foreground-3 font-normal hover:text-foreground-2"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div>
        {activeTab === "topic" && <TopicForm />}

        {activeTab === "upload" && <ArticleUpload />}

        {activeTab === "url" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="url-input" className="block text-sm font-medium text-foreground mb-2">
                Article URL
              </label>
              <input
                id="url-input"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-md bg-card text-foreground placeholder-foreground-3 focus:border-secondary focus:ring-2 focus:ring-secondary/10 outline-none transition-colors"
              />
            </div>
            <Button className="w-full h-[52px] rounded-sm text-[15px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
              Fetch & Create Session
            </Button>
          </div>
        )}

        {activeTab === "data-driven" && <DataDrivenForm />}
      </div>
    </div>
  );
}
```

---

## Test Cases

1. Navigate to `/dashboard/new-session`
2. Verify heading "Create New Session" displays
3. Test each tab:
   - Click "Start from Topic" → TopicForm renders
   - Click "Upload Article" → ArticleUpload renders
   - Click "Repurpose URL" → URL input field renders
   - Click "Data Pipeline" → DataDrivenForm renders
4. Verify tab styling: active tab has white bg + shadow, inactive tabs are gray text

---

## Acceptance Criteria

### Visual/Design Alignment
- [ ] WHEN new session page loads THEN tab switcher renders with 4 tabs (Topic, Upload, URL, Data)
- [ ] WHEN tab is active THEN background is white (`bg-card` / `#ffffff`) with shadow
- [ ] WHEN tab is active THEN text is bold (`font-semibold`) and foreground colour
- [ ] WHEN tab is inactive THEN text is grey (`text-foreground-3`) and normal weight
- [ ] WHEN "Repurpose URL" tab is active THEN URL input field is visible with correct styling
- [ ] WHEN "Create Session" button renders THEN it is full-width, 52px height, primary colour, rounded-sm
- [ ] All design tokens (colors, spacing, radius) match design.md spec

### Logic/Feature Completeness
- [ ] WHEN new session page mounts THEN no errors occur; default tab is "topic"
- [ ] WHEN "Start from Topic" tab is active THEN TopicForm component renders unchanged
- [ ] WHEN "Upload Article" tab is active THEN ArticleUpload component renders unchanged
- [ ] WHEN "Data Pipeline" tab is active THEN DataDrivenForm component renders unchanged
- [ ] WHEN URL tab is active THEN simple text input allows URL entry; no new API calls
- [ ] WHEN tabs are clicked THEN active tab state updates and panel content changes
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)
- [ ] No existing form component logic or state is modified
- [ ] All existing tests pass (jest + playwright)
- [ ] `npm run type-check` — zero errors
- [ ] `/verify` passes

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Existing form components (TopicForm, ArticleUpload, DataDrivenForm) | Render unchanged inside tab panels; do NOT modify their logic or props |
| URL tab input | Create minimal text input for URL entry; do NOT implement full URL fetching logic (can be done in future task) |
| Tab state management | Use React useState for activeTab; do NOT add complex state or external store |
| Tab button styling | Use Tailwind token classes for active/inactive states; never write hardcoded colors or spacing |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

---

## Handoff to Next Task
**Files changed:** `app/dashboard/new-session/page.tsx` created
**Context for next task:** Task 9 creates PipelineStepper component used by all pipeline screens.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
