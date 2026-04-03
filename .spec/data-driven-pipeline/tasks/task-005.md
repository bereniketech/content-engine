---
task: 005
feature: data-driven-pipeline
status: complete
depends_on: [1, 2]
---

# Task 005: Data-Driven Article Prompt and API Route (Streaming)

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /api-design
Commands: /verify, /task-handoff

---

## Objective

Create the article generation prompt and API route. The route accepts source data, research data, or both — and generates a neutral, informational 2000-3500 word markdown article via SSE streaming. It also accepts PDF upload via `multipart/form-data`, using the `parsePdf` utility from task-002. No tone is applied at this stage.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [Existing SSE streaming pattern — from app/api/blog/route.ts:100-155]
const encoder = new TextEncoder()

const readable = new ReadableStream<Uint8Array>({
  async start(controller) {
    try {
      let fullMarkdown = ''
      for await (const chunk of streamMessage({
        maxTokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      })) {
        fullMarkdown += chunk
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
      }

      const { data: savedAsset, error: assetError } = await supabase.from('content_assets').insert({
        session_id: sessionId,
        asset_type: 'blog',
        content: {
          topic,
          tone,
          markdown: fullMarkdown,
          wordCount: fullMarkdown.trim().split(/\s+/).filter(Boolean).length,
        },
      }).select('*').single()

      // ...send done event, close controller...
    } catch (error) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to stream' })}\n\n`))
      controller.close()
    }
  },
})

return new Response(readable, {
  status: 200,
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
})
```

```typescript
// [streamMessage — from lib/ai.ts:77-110]
export async function* streamMessage(
  opts: CreateMessageOptions,
): AsyncGenerator<string> {
  // Yields text chunks, provider-agnostic
}
```

```typescript
// [parsePdf — from lib/pdf-parse.ts (added in task-002)]
export async function parsePdf(buffer: Buffer): Promise<{ text: string; pageCount: number; wasTruncated: boolean }>
```

```typescript
// [resolveSessionId — from lib/session-assets.ts:59-118]
export async function resolveSessionId(options: {
  supabase: SupabaseClient
  userId: string
  providedSessionId?: unknown
  fallbackInputType: SessionInputType
  fallbackInputData: SessionInputData | Record<string, unknown>
}): Promise<string> {
```

### Key Patterns in Use
- **SSE streaming:** Blog route uses `ReadableStream` with `TextEncoder`, sends `data: JSON\n\n` events.
- **Asset saving after stream:** Full markdown accumulated during stream, saved to `content_assets` after completion.
- **Done event:** Final SSE event includes `{ done: true, wordCount, asset }`.
- **multipart/form-data:** Use `request.formData()` to extract file, then `Buffer.from(await file.arrayBuffer())`.

### Architecture Decisions Affecting This Task
- ADR-2: No tone applied at this stage. Article is neutral/informational.
- The route must handle both JSON and multipart/form-data content types.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-005.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Create `lib/prompts/data-driven-article.ts`:
   - Export `getDataDrivenArticlePrompt(sourceText?: string, researchData?: string): string`.
   - Prompt instructs AI to synthesize source data and/or research into a 2000-3500 word structured markdown article.
   - Neutral, informational style — no tone instructions.
   - When both source data AND research are provided, instruct AI to synthesize both (data-enriched mode).
   - Output: pure markdown starting with `#`.
2. Create `app/api/data-driven/article/route.ts`:
   - `requireAuth()`.
   - Detect content type: if `multipart/form-data`, extract file via `request.formData()`, parse PDF with `parsePdf()`. If `application/json`, parse body normally.
   - Validate: must have `sourceText` or `researchData` (or both).
   - Sanitize text inputs.
   - `resolveSessionId()` with `fallbackInputType: 'data-driven'`.
   - Build prompt with `getDataDrivenArticlePrompt()`.
   - Stream via `streamMessage({ maxTokens: 8000, messages: [...] })`.
   - Accumulate full markdown, compute word count.
   - Save asset as `dd_article` with `{ markdown, wordCount }`.
   - Send done event with asset.
3. Return SSE response with correct headers.

_Requirements: 1, 5_
_Skills: /code-writing-software-development — streaming API route, /api-design — multipart handling_

---

## Acceptance Criteria
- [x] `lib/prompts/data-driven-article.ts` exports prompt builder function
- [x] `app/api/data-driven/article/route.ts` handles POST requests
- [x] Route accepts JSON body with `{ sourceText?, researchData?, sessionId }`
- [x] Route accepts `multipart/form-data` with PDF file
- [x] Response is SSE stream with `data: { text }` chunks and `data: { done, wordCount, asset }` final event
- [x] Asset saved as `dd_article` with `{ markdown, wordCount }`
- [x] No tone is applied to the generated article
- [x] Auth required (401 without token)
- [x] All existing tests pass
- [x] `/verify` passes

---

## Handoff - What Was Done
- Implemented the streaming article endpoint in `app/api/data-driven/article/route.ts` with auth, JSON and multipart parsing, PDF ingestion through `parsePdf()`, sanitized input handling, SSE chunk streaming, and `dd_article` asset persistence.
- Strengthened the article prompt in `lib/prompts/data-driven-article.ts` so combined source-plus-research generation explicitly requires thesis, findings, evidence, and pure markdown output.
- Added focused regression coverage for the prompt and route, including auth failure, invalid JSON, invalid PDF, missing session, JSON happy path SSE, multipart PDF happy path, and final done-event payload assertions.

## Handoff - Patterns Learned
- For session-backed UI flows, property-existence checks like `'topic' in inputData` are too weak once multiple session input shapes share optional topic fields; use an explicit type guard instead.
- On this repo, `/verify` is most reliable through VS Code tasks on Windows because direct PowerShell terminals can be polluted by execution-policy profile errors.
- Task-level coverage can be validated cleanly by running all existing tests while scoping `collectCoverageFrom` to the files exercised by the current task.

## Handoff - Files Changed
- `app/api/data-driven/article/route.ts`
- `app/api/data-driven/article/route.test.ts`
- `lib/prompts/data-driven-article.ts`
- `lib/prompts/data-driven-article.test.ts`
- `jest.config.js`
- `types/index.ts`
- `app/dashboard/blog/page.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/research/page.tsx`
- `components/input/TopicForm.tsx`
- `components/sections/FlywheelPanel.tsx`
- `components/sections/TrafficPanel.tsx`
- `bug-log.md`

## Status
COMPLETE
