# TASK-004 — Input Layer (Topic Form + Article Upload)

## Session Bootstrap
Skills needed: build-website-web-app, code-writing-software-development

## Objective
Build the dual input UI: topic form and article paste/upload. Validate inputs client-side, store form state in React context, and create a Supabase session row on submit.

## Implementation Steps
1. Create `/components/input/TopicForm.tsx`:
   - Fields: topic (text), audience (text), tone (select: authority/casual/storytelling), keywords (text, optional), geography (text, optional)
   - Validate: topic > 5 chars required
   - On submit: call `createSession('topic', formData)` from context
2. Create `/components/input/ArticleUpload.tsx`:
   - Textarea for paste; file input for `.txt` / `.md` only
   - Show "Coming soon" badge for PDF/Doc upload attempts
   - Validate: article > 100 chars
   - On submit: call `createSession('upload', { article })` from context
3. Create `/lib/context/SessionContext.tsx`:
   - Holds `sessionId`, `inputType`, `inputData`, `assets` state
   - `createSession()` writes to Supabase `sessions` table and sets `sessionId`
4. Wrap `/app/dashboard/layout.tsx` with `SessionProvider`
5. Add tab switcher on dashboard home: "Topic" | "Upload Article"

## Acceptance Criteria
- Topic form collects: topic, audience, tone, keywords (optional), geography (optional)
- Article upload accepts text and markdown; shows "Coming soon" for PDF/Doc
- Client-side validation: topic > 5 characters; article > 100 characters
- On submit, form state stored in React context and input_type set to `topic` or `upload`
- A new `session` row is created in Supabase on submit

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [x]
- Next task: task-005.md
- Notes: Implemented SessionContext provider, Topic form, Article upload input, dashboard tab switcher, and dashboard layout provider wiring. Verified via npm.cmd run lint and npx.cmd tsc --noEmit (both pass). Direct slash commands /verify and /task-handoff are not available in this shell.
