# TASK-007 — Blog Generation API + UI (Streaming)

## Session Bootstrap
Skills needed: code-writing-software-development, api-design, claude-developer-platform, build-website-web-app

## Objective
Build `POST /api/blog` with SSE streaming via Claude and a Blog panel UI that renders markdown incrementally. Include tone control and per-section regeneration.

## Implementation Steps
1. Create `/lib/prompts/blog.ts` — Claude prompt that takes topic + SEO + research + tone and instructs a 1500–2500 word structured markdown article with examples, use cases, and CTA
2. Create `/app/api/blog/route.ts`:
   - Accept `{ topic, seo, research, tone }`
   - Call `anthropic.messages.stream(...)` with blog prompt
   - Pipe Claude stream to `ReadableStream` response with `Content-Type: text/event-stream`
   - On stream end, save full markdown to `content_assets` (`asset_type = 'blog'`)
3. Create `/app/api/blog/expand/route.ts`:
   - Accept `{ sectionTitle, context }` — regenerates a single H2 section
   - Returns streamed markdown for that section only
4. Create `/components/sections/BlogPanel.tsx`:
   - Fetch `/api/blog` with `fetch()` + `ReadableStream` reader
   - Render partial markdown using `react-markdown` as tokens arrive
   - Parse H2 headings from rendered markdown; add "Expand section" button next to each
   - Copy full article button at top
   - On stream complete: show word count badge
5. Install: `npm install react-markdown`

## Acceptance Criteria
- `POST /api/blog` streams markdown via `ReadableStream`
- Blog panel renders markdown incrementally as tokens arrive (no blank screen)
- Tone selection (authority/casual/storytelling) passed to Claude prompt
- "Expand section" button on each H2 calls Claude to regenerate that section only
- Full blog saved to `content_assets` with `asset_type = 'blog'` on stream completion

## Key Patterns
[greenfield — no existing files to reference]

## Handoff — What Was Done
- Implemented streaming blog generation in `/api/blog` with SSE chunks and end-of-stream persistence to `content_assets` with `asset_type = 'blog'`.
- Implemented streaming section regeneration in `/api/blog/expand` so individual H2 sections can be regenerated in place.
- Updated Blog panel UI to stream-render markdown incrementally, support tone selection, show a top-level copy button, and provide per-H2 "Expand section" controls.

## Handoff — Patterns Learned
- Anthropic SDK stream iteration in this workspace uses `for await (const event of stream)` with `content_block_delta` text events, not `textStream`.
- SSE parsing on the client must keep a rolling buffer and split by event boundaries (`\n\n`) to avoid losing partial JSON chunks.
- Section replacement works most reliably by matching from a specific H2 until the next H2 boundary and escaping regex-sensitive heading text.

## Handoff — Files Changed
- `app/api/blog/route.ts`
- `app/api/blog/expand/route.ts`
- `components/sections/BlogPanel.tsx`
- `.spec/tasks/task-007.md`

## Status
COMPLETE
