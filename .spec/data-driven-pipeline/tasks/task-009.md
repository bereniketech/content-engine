---
task: 009
feature: data-driven-pipeline
status: pending
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
- [ ] Component renders with data/topic mode toggle
- [ ] Data mode shows textarea and file upload (accepts .txt, .md, .pdf)
- [ ] Topic mode shows text input
- [ ] Tone textarea present with placeholder examples
- [ ] Validation blocks empty submissions (no data/topic, no tone)
- [ ] Submit creates session with `input_type: 'data-driven'`
- [ ] After submit, navigates to `/dashboard/data-driven`
- [ ] Component uses existing UI patterns (Button, Card, Tailwind classes)
- [ ] All existing tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
