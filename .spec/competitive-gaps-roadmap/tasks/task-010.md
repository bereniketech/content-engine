---
task: "010"
feature: competitive-gaps-roadmap
rec: R5
title: "Add URL input tab to ArticleUpload component"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["009"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`
- `.kit/skills/development/build-website-web-app/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Add a "URL" tab alongside the existing "File" tab in `ArticleUpload.tsx`. The URL tab renders a `URLIngestionInput` component that calls `/api/ingest` and passes the resulting `sessionId` upstream to the parent flow.

## Files

### Create
- `D:/content-engine/components/input/URLIngestionInput.tsx`

### Modify
- `D:/content-engine/components/input/ArticleUpload.tsx`

## Dependencies
- TASK-009 complete (`POST /api/ingest` route exists)
- Existing `components/ui/button.tsx`, `components/ui/card.tsx`
- Tailwind CSS v4

## Codebase Context

`components/input/ArticleUpload.tsx` currently has a single file drop zone. It accepts props including an `onSessionCreated: (sessionId: string) => void` or similar callback. Read the file to understand exact props before modifying.

`components/input/TopicForm.tsx` and `DataDrivenForm.tsx` show the input form pattern used in this project (each has its own tab in the dashboard input flow).

Existing tab-switching pattern (infer from `app/dashboard/page.tsx`): likely uses React state `activeTab` with conditional rendering.

## Implementation Steps

1. Create `components/input/URLIngestionInput.tsx`:
```typescript
'use client'
interface URLIngestionInputProps {
  onSuccess: (sessionId: string, preview: string) => void
  onError: (message: string) => void
}
```
   - Render a URL `<input>` field with placeholder "Paste YouTube URL, audio URL, or web page URL"
   - "Process URL" `<Button>` that on click:
     - Sets `loading = true`, clears previous error
     - POSTs `{ url }` to `/api/ingest` with `Authorization: Bearer {token}` (use Supabase client for token)
     - On 200: calls `onSuccess(data.sessionId, data.preview)`, shows preview snippet
     - On error: calls `onError(error.message)`, shows inline error text
     - Sets `loading = false`
   - Show spinner in button while loading
   - Show preview box below input when `preview` is available: truncated text in a gray box

2. Modify `ArticleUpload.tsx`:
   - Add tab state: `const [activeTab, setActiveTab] = useState<'file' | 'url'>('file')`
   - Render two tab buttons at top: "File Upload" | "URL"
   - Conditionally render existing file upload UI under `activeTab === 'file'`
   - Render `<URLIngestionInput>` under `activeTab === 'url'`
   - Wire `URLIngestionInput.onSuccess` to the same `onSessionCreated` callback the file upload uses
   - Wire `URLIngestionInput.onError` to show error state in the panel

3. Use Supabase browser client (`lib/supabase.ts`) to get access token for Authorization header.

## Test Cases

- Render URLIngestionInput with valid URL → spinner shows on submit → preview shown on success
- Render URLIngestionInput with invalid URL → API returns 400 → error message shown inline
- Tab switching: click "URL" tab → URLIngestionInput renders; click "File Upload" → file UI renders

## Decision Rules
- Do not replace the existing file upload — additive tab approach only.
- `URLIngestionInput` must be a separate component file for testability.
- Loading state must disable the button (not just show spinner).
- Use `fetch` with bearer token, not a custom API client.

## Acceptance Criteria
- ArticleUpload.tsx has two tabs: "File Upload" and "URL".
- URL tab renders URLIngestionInput component.
- Submitting a URL calls `/api/ingest`, shows spinner, then preview or error.
- On success, `onSessionCreated` callback fired with returned `sessionId`.
- Existing file upload functionality completely unchanged.

Status: COMPLETE
Completed: 2026-04-28T07:20:36Z
