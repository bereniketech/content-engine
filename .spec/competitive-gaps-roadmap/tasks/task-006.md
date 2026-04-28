---
task: "006"
feature: competitive-gaps-roadmap
rec: R5
title: "Create lib/ingest/youtube.ts — fetch transcript via googleapis"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["005"]
---

## Skills
- `.kit/skills/development/code-writing-software-development/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Implement YouTube transcript fetching using the `googleapis` library already installed in the project. Extract video ID from URL and fetch available captions, returning clean plain text.

## Files

### Create
- `D:/content-engine/lib/ingest/youtube.ts`
- `D:/content-engine/lib/ingest/errors.ts` (shared IngestionError class)

## Dependencies
- `googleapis` — already installed (`"googleapis": "^171.4.0"`)
- `GOOGLE_SEARCH_API_KEY` env var (used as YouTube Data API key)
- TASK-005 (lib/ingest/ directory exists)

## API Contracts

```typescript
// lib/ingest/errors.ts
export class IngestionError extends Error {
  constructor(
    public readonly source: 'youtube' | 'audio' | 'web',
    message: string
  ) { super(message) }
}

// lib/ingest/youtube.ts
export async function fetchYouTubeTranscript(url: string): Promise<string>
```

## Codebase Context

`googleapis` is used in the project. The YouTube Data API v3 requires:
- API key from `process.env.GOOGLE_SEARCH_API_KEY`
- `youtube.captions.list` to get caption tracks
- `youtube.captions.download` to get the actual transcript content

Video ID extraction:
```typescript
function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}
```

## Implementation Steps

1. Create `lib/ingest/errors.ts` with `IngestionError` class.

2. Create `lib/ingest/youtube.ts`:
   - Import `google` from `googleapis`
   - Implement `extractVideoId(url)` helper
   - Implement `fetchYouTubeTranscript(url)`:
     - Extract videoId; throw `IngestionError('youtube', 'Invalid YouTube URL')` if null
     - Check `GOOGLE_SEARCH_API_KEY`; throw `IngestionError('youtube', 'YouTube API key not configured')` if missing
     - Initialize `const youtube = google.youtube({ version: 'v3', auth: apiKey })`
     - Call `youtube.captions.list({ part: ['snippet'], videoId })`
     - If no captions returned, throw `IngestionError('youtube', 'No captions available for this video')`
     - Get first caption track id
     - Call `youtube.captions.download({ id: captionId, tfmt: 'srv3' })` to get SRT-like format
     - Strip timing tags with regex `/<[^>]+>/g` and clean up whitespace
     - Return clean text string

3. Note: YouTube captions.download requires OAuth2 for private captions; for public videos use the `tlang` and auto-captions approach. Implement with basic API key auth and document the limitation.

## Test Cases

Tests in `lib/ingest/youtube.test.ts` (created alongside):
- Valid YouTube URL + mock googleapis → returns transcript string
- Invalid URL (not YouTube) → throws `IngestionError` with source='youtube'
- Missing `GOOGLE_SEARCH_API_KEY` → throws `IngestionError`
- `captions.list` returns empty array → throws `IngestionError('youtube', 'No captions available...')`

## Decision Rules
- Throw `IngestionError` (not generic Error) so the API route can identify the source.
- Strip all XML/SRT timing tags — return only plain readable text.
- Do not implement OAuth2 flow — API key only; document scope limitation.

## Acceptance Criteria
- `fetchYouTubeTranscript` exported from `lib/ingest/youtube.ts`.
- `IngestionError` exported from `lib/ingest/errors.ts` with `source` property.
- All 4 test cases pass with mocked googleapis.
- No real API calls in tests.

Status: COMPLETE
Completed: 2026-04-28T07:18:48Z
