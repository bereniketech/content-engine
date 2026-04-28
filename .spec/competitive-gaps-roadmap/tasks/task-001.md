---
task: "001"
feature: competitive-gaps-roadmap
rec: R6
title: "Extend api/images/route.ts to auto-generate featured image after article save"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: []
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`
- `.kit/skills/development/code-writing-software-development/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`
- `.kit/agents/software-company/software-cto.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Add an `autoGenerate` flag to the existing `POST /api/images` route. When `autoGenerate: true` is sent, after saving the image prompts to `content_assets`, automatically call the `/api/images/generate` endpoint with the hero prompt and store the resulting image URL as a new `content_assets` row with `asset_type = 'image_generated'`.

## Files

### Modify
- `D:/content-engine/app/api/images/route.ts`

### Create
- None

## Dependencies
- Existing `app/api/images/route.ts` logic (prompt generation + content_assets save)
- Existing `app/api/images/generate/route.ts` (internal image generation)
- `lib/session-assets.ts` — `mapAssetRowToContentAsset`
- `lib/auth.ts` — `requireAuth`

## API Contracts

**Request (extended):**
```typescript
{
  topic: string
  blog: unknown
  style?: string
  sessionId?: string
  autoGenerate?: boolean   // NEW
}
```

**Response (extended):**
```typescript
{
  data: {
    sessionId: string
    style: string
    images: ImagePromptsOutput
    asset: ContentAsset
    generatedImage?: {     // NEW — present if autoGenerate=true and succeeded
      imageUrl: string
      assetId: string
    }
    autoGenerateError?: string  // NEW — present if autoGenerate=true but failed
  }
}
```

## Codebase Context

Current `POST /api/images/route.ts` flow:
1. Auth check via `requireAuth`
2. Parse + sanitize `topic`, `blog`, `style`
3. Call Claude for image prompts → `ImagePromptsOutput`
4. Resolve/create session via `resolveSessionId`
5. Insert into `content_assets` with `asset_type = 'images'`
6. Return 201 with `{ sessionId, style, images, asset }`

`app/api/images/generate/route.ts` accepts `POST { prompt: string, style: string }` and calls Gemini to return `{ data: { imageUrl: string } }`. It requires auth separately (but since we're calling it internally server-side, use a direct lib function call instead of HTTP fetch to avoid auth re-check overhead).

Key imports already in file:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
```

`GoogleGenAI` is imported in `generate/route.ts`:
```typescript
import { GoogleGenAI } from '@google/genai'
```

## Implementation Steps

1. Extract the Gemini image generation logic from `app/api/images/generate/route.ts` into a shared helper `lib/gemini-image.ts` exporting `generateImageFromPrompt(prompt: string, style: string): Promise<string>` that returns a base64 data URL. (Create this file.)

2. In `app/api/images/route.ts`, after the `content_assets.insert()` succeeds:
   - Check if `autoGenerate === true` AND `body.autoGenerate` is truthy
   - If yes: call `generateImageFromPrompt(images.hero, style)` wrapped in try/catch
   - On success: insert a second `content_assets` row with `asset_type = 'image_generated'`, `content = { imageUrl, style, size: '1200x630' }`
   - Capture the new asset id
   - On failure: store the error message string, do NOT throw

3. Extend the return JSON to include `generatedImage` or `autoGenerateError` as appropriate.

4. In `lib/gemini-image.ts`:
   - Import `GoogleGenAI` from `@google/genai`
   - Check for `GEMINI_API_KEY`; throw descriptive error if missing
   - Replicate the Gemini call from `generate/route.ts`
   - Return `imageUrl` string

## Test Cases

Covered by TASK-004. Manual smoke test:
- POST `/api/images` with valid body + `autoGenerate: true` → response contains `generatedImage.imageUrl`
- POST `/api/images` with `autoGenerate: false` → response has no `generatedImage` key
- POST `/api/images` with `autoGenerate: true` and `GEMINI_API_KEY` unset → response contains `autoGenerateError`, still returns 201

## Decision Rules
- If `generateImageFromPrompt` throws, set `autoGenerateError` to the error message — never propagate to a 500.
- Never make an HTTP call from route to route; extract shared logic into `lib/`.
- Keep the existing route response shape backward-compatible (adding optional keys only).

## Acceptance Criteria
- POST /api/images with `autoGenerate: true` returns 201 with `data.generatedImage.imageUrl` populated.
- POST /api/images with `autoGenerate: true` stores a second content_assets row with `asset_type = 'image_generated'`.
- POST /api/images without `autoGenerate` behaves identically to current behavior.
- Gemini failure results in `data.autoGenerateError` string, not a 5xx response.

Status: COMPLETE
Completed: 2026-04-28T00:00:00Z
