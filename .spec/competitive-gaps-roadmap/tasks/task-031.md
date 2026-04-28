---
task: "031"
feature: competitive-gaps-roadmap
rec: R1
title: "Create POST /api/edit route with SSE streaming and wire to ContentEditor"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["029", "030"]
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create `POST /api/edit` that accepts a paragraph + action and streams back the rewritten text via SSE. Then wire the ContentEditor to call this route and stream results into the editor, replacing the selected paragraph.

## Files

### Create
- `D:/content-engine/app/api/edit/route.ts`

### Modify
- `D:/content-engine/components/sections/ContentEditor.tsx`

## Dependencies
- TASK-029/030: ContentEditor with slash menu
- `lib/auth.ts`, `lib/ai.ts` (or Anthropic SDK directly for streaming)

## API Contracts

**POST /api/edit:**
```typescript
// Request
{
  paragraph: string
  action: 'rewrite' | 'expand' | 'shorten' | 'change_tone' | 'fix_seo' | 'add_stat'
  tone?: 'professional' | 'conversational' | 'persuasive' | 'empathetic'
  articleContext: { title: string; keyword: string; audience: string }
}

// Response: text/event-stream
// data: {"delta": "text chunk"}\n\n
// data: [DONE]\n\n
```

## Codebase Context

Check `lib/ai.ts` for streaming support. Anthropic SDK `@anthropic-ai/sdk` supports streaming:
```typescript
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const stream = await client.messages.stream({
  model: 'claude-haiku-4-5',
  max_tokens: 2000,
  messages: [{ role: 'user', content: prompt }]
})
```

SSE response pattern (from existing `app/api/pipeline/` or similar streaming routes):
```typescript
const encoder = new TextEncoder()
const stream = new ReadableStream({
  async start(controller) {
    for await (const event of anthropicStream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`))
      }
    }
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    controller.close()
  }
})
return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
```

Action prompts:
- `rewrite`: "Rewrite this paragraph in a more engaging way: {paragraph}"
- `expand`: "Expand this paragraph with more detail and examples: {paragraph}"
- `shorten`: "Shorten this paragraph to its essential point: {paragraph}"
- `change_tone`: "Rewrite in a {tone} tone: {paragraph}"
- `fix_seo`: "Rewrite this paragraph to naturally include the keyword '{keyword}' and improve SEO: {paragraph}"
- `add_stat`: "Add a relevant statistic or data point to this paragraph: {paragraph}"

## Implementation Steps

1. Create `app/api/edit/route.ts`:
   - Auth check
   - Parse and validate body
   - Build action-specific prompt using `articleContext`
   - Stream via Anthropic SDK
   - Return SSE response

2. Modify `ContentEditor.tsx` — implement `handleActionSelected(action, tone?)`:

```typescript
async function handleActionSelected(action: EditAction, paragraphText: string, tone?: string) {
  // 1. Get article context from prop/ref
  // 2. Show "Editing..." indicator
  // 3. Stream fetch to /api/edit
  const response = await fetch('/api/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ paragraph: paragraphText, action, tone, articleContext })
  })
  
  // 4. Read SSE stream
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    const lines = text.split('\n\n')
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const delta = JSON.parse(line.slice(6)).delta as string
        accumulated += delta
      }
    }
  }
  
  // 5. Replace paragraph in editor
  // Find current paragraph node, replace its text content with accumulated
  // Use editor.commands.insertContentAt() or a custom transaction
  replaceParagraphInEditor(editor, paragraphText, accumulated)
  
  // 6. If action === 'fix_seo': trigger SEO rescore
}

function replaceParagraphInEditor(editor: Editor, oldText: string, newText: string) {
  // Walk document, find node with matching text, replace
  editor.commands.command(({ tr, state }) => {
    let replaced = false
    state.doc.descendants((node, pos) => {
      if (!replaced && node.type.name === 'paragraph' && node.textContent === oldText) {
        tr.replaceWith(pos, pos + node.nodeSize, state.schema.nodes.paragraph.create(null, state.schema.text(newText)))
        replaced = true
      }
    })
    return replaced
  })
}
```

## Test Cases

- POST /api/edit with action='rewrite' → streams text chunks → [DONE]
- POST /api/edit missing paragraph → 400
- POST /api/edit unauthenticated → 401
- ContentEditor: action selected → streaming delta accumulates → paragraph replaced in editor
- fix_seo action → SEO rescore triggered after replacement

## Decision Rules
- Each paragraph operation is scoped — never send full article to /api/edit.
- The edit replaces the exact paragraph text — use text content matching to find the node.
- After replacement, push to undo history (Tiptap history extension in StarterKit handles this automatically for transactions).
- `fix_seo` must trigger SEO re-score after edit — add callback to ContentEditorProps.

## Acceptance Criteria
- `POST /api/edit` streams SSE response with delta chunks.
- ContentEditor reads stream and replaces selected paragraph with accumulated text.
- Replacement is undoable (Ctrl+Z).
- `fix_seo` action triggers SEO rescore.
- Auth required on route.

Status: COMPLETE
Completed: 2026-04-28T09:56:09Z
