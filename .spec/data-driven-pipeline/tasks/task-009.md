---
task: 009
feature: data-driven-pipeline
status: complete
depends_on: [1]
---

# Task 009: DataDrivenForm Input Component

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /build-website-web-app, /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective

Create the `DataDrivenForm` input component. Users choose between "I have data" (text paste or file upload) and "I have a topic" (text input), enter a free-form tone paragraph, and submit to create a `data-driven` session that navigates to the pipeline page.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [Existing TopicForm component — from components/input/TopicForm.tsx (pattern reference)]
// Pattern: form state via useState, onSubmit handler, validation, session creation via SessionContext, router.push
// Uses: useSessionContext(), useRouter(), getSupabaseBrowserClient()
```

```typescript
// [SessionContext usage — from lib/context/SessionContext.tsx]
// Provides: sessionId, inputType, inputData, assets, loadSession, clearSession
// loadSession({ sessionId, inputType, inputData, assets }) sets the active session
```

```typescript
// [Existing form UI patterns — uses Tailwind classes]
// Input fields: className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm ..."
// Labels: className="text-sm font-medium text-foreground"
// Buttons: <Button> from components/ui/button.tsx
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
- **Form state:** `useState` for each field. No form library (no Formik/React Hook Form in deps).
- **Session creation:** Call `supabase.from('sessions').insert(...)`, then `loadSession()` from context.
- **Navigation:** `router.push('/dashboard/data-driven')` after session creation.
- **File upload:** Use `<input type="file" accept=".txt,.md,.pdf" />`, read as text or pass buffer.
- **UI components:** `<Button>`, `<Card>`, `<Badge>` from `components/ui/`.

### Architecture Decisions Affecting This Task
- ADR-2: Tone is a free-form textarea, not a dropdown/enum.
- File upload accepts `.txt`, `.md`, `.pdf`. PDF files are sent to the article route (task-005) as multipart, not parsed on the client.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-009.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Create `components/input/DataDrivenForm.tsx`:
   - State: `mode` ("data" | "topic"), `sourceText`, `sourceFile`, `topic`, `tone`, `isSubmitting`, `error`.
   - Mode toggle: radio/button group — "I have data" vs "I have a topic".
   - **Data mode:** textarea for pasting text + file upload for `.txt`, `.md`, `.pdf`. When file selected, read `.txt`/`.md` as text (FileReader), store `.pdf` filename for later upload.
   - **Topic mode:** text input for topic string.
   - **Tone input:** textarea with placeholder: e.g., "Write in a witty, conversational tone with dry humor. Sound like a seasoned founder talking to other founders."
   - **Validation:** Must have source data (text or file) or topic. Must have tone paragraph. Block submit if invalid.
   - **Submit handler:**
     - Create session via `supabase.from('sessions').insert({ user_id, input_type: 'data-driven', input_data: { sourceText?, sourceFileName?, topic?, tone } })`.
     - Call `loadSession()` from `useSessionContext()`.
     - Navigate to `/dashboard/data-driven`.
   - Use existing UI components: `<Button>`, `<Card>`.
   - Match existing form styling from `TopicForm`.

_Requirements: 1, 2, 11.2_
_Skills: /build-website-web-app — React component, /code-writing-software-development — form validation_

---

## Acceptance Criteria
- [x] Component renders with data/topic mode toggle
- [x] Data mode shows textarea and file upload (accepts .txt, .md, .pdf)
- [x] Topic mode shows text input
- [x] Tone textarea present with placeholder examples
- [x] Validation blocks empty submissions (no data/topic, no tone)
- [x] Submit creates session with `input_type: 'data-driven'`
- [x] After submit, navigates to `/dashboard/data-driven`
- [x] Component uses existing UI patterns (Button, Card, Tailwind classes)
- [x] All existing tests pass
- [ ] `/verify` passes

Verify note: build passed, type-check passed, targeted ESLint on changed files passed, and all 51 existing tests passed. Full `/verify` remains blocked by repo-wide lint noise outside the changed files and the existing global Jest coverage threshold (24.47% lines / 25.51% functions) rather than task-009 regressions.

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** `components/input/DataDrivenForm.tsx`, `lib/data-driven-form.ts`, `lib/data-driven-form.test.ts`, `lib/context/SessionContext.tsx`, `types/index.ts`, `app/dashboard/page.tsx`, `app/dashboard/data-driven/page.tsx`
**Decisions made:** Reused `SessionContext.createSession()` instead of introducing a second session-creation path; added `pendingDataDrivenFile` to preserve a selected PDF across the `/dashboard` to `/dashboard/data-driven` transition; exposed `DataDrivenForm` in the dashboard launcher now so task-009 is user-reachable instead of leaving the component orphaned.
**Context for next task:** `/dashboard/data-driven` now exists as a lightweight landing page that confirms session state and shows staged PDF metadata. Task-010 should replace this placeholder with the real stepper/orchestration flow while reusing the staged PDF from `SessionContext` when the input mode is file-based.
**Open questions:** Full repo `/verify` is still blocked by global lint noise and the existing global Jest coverage threshold; no task-009-local lint or type issues remain.
