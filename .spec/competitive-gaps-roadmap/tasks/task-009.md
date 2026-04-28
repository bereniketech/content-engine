---
task: "009"
feature: competitive-gaps-roadmap
rec: R5
title: "Create POST /api/ingest route with unified ingestion dispatcher"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["005", "006", "007", "008"]
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create the unified `/api/ingest` route that dispatches to the correct ingestion lib based on URL type, stores the transcript in `content_assets`, and returns structured success/error responses.

## Files

### Create
- `D:/content-engine/app/api/ingest/route.ts`

## Dependencies
- TASK-005: `lib/ingest/detect-url-type.ts`
- TASK-006: `lib/ingest/youtube.ts`, `lib/ingest/errors.ts`
- TASK-007: `lib/ingest/audio.ts`
- TASK-008: `lib/ingest/web-scraper.ts`
- `lib/auth.ts` — `requireAuth`
- `lib/session-assets.ts` — `resolveSessionId`, `mapAssetRowToContentAsset`
- `lib/sanitize.ts` — `sanitizeInput`

## API Contracts

**Request:**
```typescript
POST /api/ingest
{ url: string; sessionId?: string }
```

**Response 200:**
```typescript
{ data: { sessionId: string; wordCount: number; preview: string; assetId: string } }
```

**Response 422:**
```typescript
{ error: { code: 'ingestion_error'; source: 'youtube' | 'audio' | 'web'; message: string } }
```

**Response 400:**
```typescript
{ error: { code: 'validation_error'; message: string } }
// When URL is missing or invalid type
```

## Codebase Context

Pattern from existing `app/api/research/route.ts`:
```typescript
export async function POST(request: NextRequest) {
  try {
    let auth
    try {
      auth = await requireAuth(request)
    } catch {
      return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
    }
    // ... parse body, validate, process, store, return
  } catch (err) {
    return NextResponse.json({ error: { code: 'server_error' } }, { status: 500 })
  }
}
```

`resolveSessionId` usage from `app/api/images/route.ts`:
```typescript
sessionId = await resolveSessionId({
  supabase,
  userId: user.id,
  providedSessionId: body.sessionId,
  fallbackInputType: 'upload',
  fallbackInputData: { sourceUrl: sanitizedUrl },
})
```

`content_assets.insert` pattern:
```typescript
const { data: savedAsset, error } = await supabase
  .from('content_assets')
  .insert({ session_id: sessionId, asset_type: 'source_transcript', content: { text, url, wordCount } })
  .select('*')
  .single()
```

## Implementation Steps

1. Create `app/api/ingest/route.ts`:

```typescript
// OWASP checklist: JWT auth required, middleware rate limits, URL validated, generic errors.
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sanitizeInput } from '@/lib/sanitize'
import { resolveSessionId } from '@/lib/session-assets'
import { detectUrlType } from '@/lib/ingest/detect-url-type'
import { fetchYouTubeTranscript } from '@/lib/ingest/youtube'
import { transcribeAudio } from '@/lib/ingest/audio'
import { scrapeWebPage } from '@/lib/ingest/web-scraper'
import { IngestionError } from '@/lib/ingest/errors'

export async function POST(request: NextRequest) { ... }
```

2. Flow:
   - Auth check
   - Parse body: `{ url, sessionId? }`
   - Validate `url` is a string and non-empty; return 400 if not
   - Sanitize with `sanitizeInput(url)`
   - Detect URL type; if `'invalid'` return 400
   - Dispatch: `youtube → fetchYouTubeTranscript`, `audio → transcribeAudio`, `web → scrapeWebPage`
   - Wrap dispatch in try/catch: `IngestionError` → 422; other errors → 500
   - Compute `wordCount = text.split(/\s+/).length`
   - Compute `preview = text.slice(0, 300) + (text.length > 300 ? '...' : '')`
   - Resolve/create session
   - Insert `content_assets` row
   - Return 200 with `{ data: { sessionId, wordCount, preview, assetId: savedAsset.id } }`

## Test Cases

- Valid YouTube URL → dispatches to `fetchYouTubeTranscript`, returns 200
- Valid audio URL → dispatches to `transcribeAudio`, returns 200
- Valid web URL → dispatches to `scrapeWebPage`, returns 200
- Missing `url` field → 400
- `IngestionError` thrown → 422 with `{ code: 'ingestion_error', source, message }`
- Unauthenticated request → 401

## Decision Rules
- All dispatch functions called exactly once per request.
- `IngestionError` maps to 422; generic Error maps to 500.
- Never expose raw error stack traces in response.
- OWASP comment required at top of file (consistent with existing routes).

## Acceptance Criteria
- `POST /api/ingest` route exists and handles all three URL types.
- Stores `source_transcript` in content_assets linked to session.
- Returns 200 with `{ sessionId, wordCount, preview, assetId }`.
- Returns 422 with `{ code: 'ingestion_error', source, message }` on ingestion failures.
- Auth required — 401 on missing/invalid token.

Status: COMPLETE
Completed: 2026-04-28T07:19:08Z
