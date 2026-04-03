---
task: 010
feature: data-driven-pipeline
status: complete
depends_on: [3, 4, 5, 6, 7, 8, 9]
---

# Task 010: DataDrivenStepper Component and Pipeline Page

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /build-website-web-app, /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective

Create the `DataDrivenStepper` reusable component and the main pipeline page at `/dashboard/data-driven`. The page orchestrates the entire pipeline — determining steps based on input mode, auto-advancing through steps sequentially, firing multi-format + X campaign in parallel, and restoring state from saved assets on page reload.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [SessionContext — from lib/context/SessionContext.tsx]
// Provides: sessionId, inputType, inputData, assets, loadSession, clearSession
// assets: ContentAsset[] — use to restore stepper state on reload
```

```typescript
// [getLatestAssetByType — from lib/session-assets.ts:55-57]
export function getLatestAssetByType(assets: ContentAsset[], assetType: string): ContentAsset | null {
  return [...assets].reverse().find((asset) => asset.assetType === assetType) ?? null
}
```

```typescript
// [Existing dashboard layout — from app/dashboard/layout.tsx]
// Layout wraps all dashboard pages with Sidebar + main content area
// Pages are rendered inside this layout automatically
```

```typescript
// [Existing streaming consumption pattern — from components/sections/BlogPanel.tsx (representative)]
// Fetch with SSE: const response = await fetch('/api/blog', { method: 'POST', body, headers })
// Read stream: const reader = response.body.getReader(), while loop with decoder
// Update state incrementally as chunks arrive
```

```typescript
// [DataDrivenInputData — from types/index.ts (added in task-001)]
export interface DataDrivenInputData {
  sourceText?: string;
  sourceFileName?: string;
  topic?: string;
  tone: string;
}
```

### Key Patterns in Use
- **SSE consumption:** Fetch API with `getReader()`, decode chunks, update React state incrementally.
- **Asset-based state restoration:** Check `assets` array for existing `dd_*` assets to determine which steps are complete.
- **Parallel API calls:** Use `Promise.all([fetchMultiFormat(), fetchXCampaign()])` for parallel execution.
- **Lucide icons:** Used throughout dashboard for step indicators.

### Architecture Decisions Affecting This Task
- Multi-format and X campaign fire in parallel after SEO+GEO completes.
- Stepper steps vary by input mode (see design.md Pipeline Flow Variants).
- State persists via saved assets — on reload, check which `dd_*` assets exist to restore stepper.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-010.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Create `components/sections/DataDrivenStepper.tsx`:
   - Props: `steps: StepConfig[]`, `currentStepIndex: number`, `onRegenerate: (stepIndex: number) => void`.
   - `StepConfig`: `{ label, status: 'pending' | 'in-progress' | 'complete' | 'error', content?: ReactNode }`.
   - Render vertical list of collapsible step cards.
   - Each card: status icon (circle for pending, spinner for in-progress, checkmark for complete, X for error), label, collapsible content area, regenerate button (shown when complete or error).
   - Use Tailwind for styling, Lucide icons for status indicators.
2. Create `app/dashboard/data-driven/page.tsx`:
   - "use client" page.
   - Read `inputData` from `useSessionContext()` to determine input mode (topic vs data).
   - **Determine steps based on mode:**
     - Topic mode: [Research, Article, SEO+GEO, Multi-format + X Campaign]
     - Data mode: [Assess, (Research if insufficient), Article, SEO+GEO, Multi-format + X Campaign]
   - **State restoration on mount:** Check `assets` for `dd_research`, `dd_article`, `dd_seo_geo`, `dd_blog`, `dd_x_campaign` to determine which steps are already complete.
   - **Auto-advance logic:**
     - Start first pending step automatically.
     - When a step completes, start the next.
     - After SEO+GEO completes, fire multi-format and X campaign in parallel via `Promise.all()`.
   - **Step execution:**
     - Assess: `POST /api/data-driven/assess` → if `sufficient: false`, insert Research step.
     - Research: `POST /api/data-driven/research`.
     - Article: `POST /api/data-driven/article` (SSE — show streaming markdown preview).
     - SEO+GEO: `POST /api/data-driven/seo-geo`.
     - Multi-format + X Campaign: parallel `POST` to both routes.
   - **Regenerate:** Re-run a specific step, clear downstream assets, re-advance.
   - Render `<DataDrivenStepper>` with computed steps.

_Requirements: 9_
_Skills: /build-website-web-app — React page, /code-writing-software-development — state management, API orchestration_

---

## Acceptance Criteria
- [ ] `DataDrivenStepper` renders vertical stepper with status icons and collapsible cards
- [ ] Pipeline page shows correct steps for topic mode (Research → Article → SEO+GEO → Multi-format + X Campaign)
- [ ] Pipeline page shows correct steps for data mode with assessment
- [ ] Steps auto-advance sequentially
- [ ] Article step shows streaming markdown preview
- [ ] Multi-format and X campaign fire in parallel after SEO+GEO
- [ ] Regenerate button works per step
- [ ] Page reload restores state from saved assets
- [ ] All existing tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:**
- app/dashboard/data-driven/page.tsx
- components/sections/DataDrivenStepper.tsx
- lib/data-driven-pipeline.ts
- lib/data-driven-pipeline.test.ts

**Decisions made:**
- Implemented pipeline orchestration as a client-side state machine with immutable step runtime updates and automatic progression to the next pending step.
- Restored step completion from saved `dd_*` assets and used latest `dd_article` + `dd_seo_geo` assets to rebuild content previews after reload.
- Implemented regenerate as downstream reset plus in-memory downstream asset clearing to avoid stale completion on reload.
- Added SSE tail-buffer processing so final article stream chunks/events are not dropped when the stream closes without a trailing delimiter.

**Context for next task:**
- Topic mode runs steps: Research -> Article -> SEO+GEO -> Multi-format + X Campaign.
- Data mode runs Assess first, then conditionally injects/removes Research based on `sufficient` result.
- Final distribution step executes multi-format and X-campaign in parallel via `Promise.all`.
- Helper utilities and tests for step ordering/restoration/regenerate asset mapping are in `lib/data-driven-pipeline.ts` and `lib/data-driven-pipeline.test.ts`.

**Open questions:**
- Regenerate currently clears downstream assets in SessionContext memory; if persistent deletion in Supabase is required, add a delete endpoint and invoke it from regenerate.

## Handoff — What Was Done
- Built reusable `DataDrivenStepper` with status icons, collapsible step cards, and regenerate controls.
- Replaced `/dashboard/data-driven` placeholder with full orchestration: dynamic step derivation, restore from assets, sequential auto-advance, SSE article preview, and parallel distribution generation.
- Added pipeline helper module plus tests for step derivation, restoration, next-step selection, regenerate state reset, and downstream asset-clearing maps.

## Handoff — Patterns Learned
- Keep pipeline execution deterministic by deriving a step key list from mode + assessment outcome, then always running the first pending step.
- For SSE readers, flush any remaining buffer after `reader.read()` completes to avoid losing the final event payload.
- Regenerate must reset both step runtime state and downstream asset memory to keep reload restoration accurate.

## Handoff — Files Changed
- app/dashboard/data-driven/page.tsx
- components/sections/DataDrivenStepper.tsx
- lib/data-driven-pipeline.ts
- lib/data-driven-pipeline.test.ts

## Status
COMPLETE
