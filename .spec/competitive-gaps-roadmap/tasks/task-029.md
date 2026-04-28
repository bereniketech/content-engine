---
task: "029"
feature: competitive-gaps-roadmap
rec: R1
title: "Install Tiptap and create ContentEditor shell component"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: []
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`
- `.kit/skills/development/build-website-web-app/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Install Tiptap packages, create the `ContentEditor` shell component with basic rich text editing, and wire it to replace the read-only article display in the output panel.

## Files

### Create
- `D:/content-engine/components/sections/ContentEditor.tsx`

### Modify
- `D:/content-engine/package.json` (add Tiptap deps)
- `D:/content-engine/components/sections/BlogPanel.tsx` (conditionally use ContentEditor)

## Dependencies
- No upstream tasks
- Tiptap packages to install: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`

## Codebase Context

Currently `components/sections/BlogPanel.tsx` renders the generated article using `react-markdown`. The goal is to replace `<ReactMarkdown>` with `<ContentEditor>` when the article is in editable mode.

`react-markdown` is installed (`"react-markdown": "^10.1.0"`) — keep it for non-editable contexts.

Next.js 14 with React 19 — Tiptap v2+ supports React 18/19. Use dynamic import to avoid SSR:
```typescript
const ContentEditor = dynamic(() => import('@/components/sections/ContentEditor'), { ssr: false })
```

## Implementation Steps

1. Install Tiptap (add to package.json, run `npm install`):
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

2. Create `components/sections/ContentEditor.tsx` (`'use client'`):

```typescript
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'

interface ContentEditorProps {
  content: string              // markdown or HTML
  sessionId: string
  articleContextRef?: React.RefObject<ArticleContext>
  onSave?: (html: string) => void
}

interface ArticleContext {
  title: string
  keyword: string
  audience: string
}
```

3. Editor initialization:
```typescript
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: 'Article content appears here...' }),
  ],
  content: markdownToHtml(content),  // convert markdown to HTML for Tiptap
  editorProps: {
    attributes: {
      class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
    }
  }
})
```

4. Markdown → HTML conversion: use a simple regex-based converter for MVP (not a full markdown parser):
```typescript
function markdownToHtml(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (line) => line.startsWith('<') ? line : `<p>${line}</p>`)
}
```

5. Auto-save (from TASK-044 — implement basic version here):
   - `useRef` for debounce timer
   - `editor.on('update', ...)` handler → debounce 2000ms → call `onSave(editor.getHTML())`

6. Render:
```tsx
return (
  <div className="border border-gray-200 rounded-lg overflow-hidden">
    <div className="bg-gray-50 border-b px-4 py-2 flex items-center gap-2 text-sm text-gray-500">
      <span>✏️ Editing</span>
      {saveStatus && <span className="ml-auto">{saveStatus}</span>}
    </div>
    <EditorContent editor={editor} />
  </div>
)
```

7. In `BlogPanel.tsx`: wrap `<ContentEditor>` in `dynamic()` import with `ssr: false`; use it in place of `<ReactMarkdown>` when article content is available.

## Test Cases

- ContentEditor mounts without SSR errors
- Content prop changes → editor content updates
- Typing in editor → triggers `editor.on('update')` → onSave called after 2s
- `saveStatus` shows "Saving..." during debounce, "Saved" after successful save

## Decision Rules
- Dynamic import with `ssr: false` is mandatory — Tiptap uses browser DOM APIs.
- Keep `react-markdown` as fallback for non-editable contexts.
- The simple `markdownToHtml` is MVP — it will handle 90% of generated content correctly.
- Don't install `@tiptap/extension-slash-command` in this task — that's TASK-030.

## Acceptance Criteria
- Tiptap packages installed in `package.json`.
- `ContentEditor` component renders rich text editor with article content.
- Dynamic import prevents SSR errors.
- Auto-save debounce fires after 2 seconds of inactivity.
- BlogPanel uses ContentEditor for article display.

Status: COMPLETE
Completed: 2026-04-28T09:54:01Z
