---
task: "002"
feature: competitive-gaps-roadmap
rec: R6
title: "Add fal.ai social card generation (1200×630 + 1080×1350) to image pipeline"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["001"]
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`
- `.kit/skills/development/code-writing-software-development/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create `lib/fal-images.ts` that uses `@fal-ai/client` to generate social card images at two sizes (1200×630 featured and 1080×1350 portrait). Wire it so that when `autoGenerate: true` is passed to `POST /api/images`, both size variants are generated and stored.

## Files

### Create
- `D:/content-engine/lib/fal-images.ts`

### Modify
- `D:/content-engine/app/api/images/route.ts` (extend TASK-001 changes)
- `D:/content-engine/lib/gemini-image.ts` (created in TASK-001)

## Dependencies
- `@fal-ai/client` — already installed (package.json: `"@fal-ai/client": "^1.9.4"`)
- `FAL_API_KEY` environment variable
- TASK-001 must be complete (lib/gemini-image.ts exists)

## API Contracts

`lib/fal-images.ts` exports:
```typescript
export interface SocialCards {
  featured: string   // 1200×630 data URL or CDN URL
  portrait: string   // 1080×1350 data URL or CDN URL
}

export async function generateSocialCards(
  prompt: string,
  sessionId: string
): Promise<SocialCards>
```

Extended response from `POST /api/images` with `autoGenerate: true`:
```typescript
generatedImage?: {
  imageUrl: string          // featured 1200×630 (Gemini — from task-001)
  socialCards?: {
    featured: string        // 1200×630 (fal.ai)
    portrait: string        // 1080×1350 (fal.ai)
  }
  assetId: string
}
```

## Codebase Context

`@fal-ai/client` usage pattern (from package docs):
```typescript
import * as fal from '@fal-ai/client'

fal.config({ credentials: process.env.FAL_API_KEY })

const result = await fal.run('fal-ai/flux/schnell', {
  input: {
    prompt: string,
    image_size: { width: number, height: number }
  }
})
// result.images[0].url
```

`FAL_API_KEY` is confirmed in env var list for this project.

## Implementation Steps

1. Create `lib/fal-images.ts`:
   - Import `* as fal from '@fal-ai/client'`
   - Call `fal.config({ credentials: process.env.FAL_API_KEY })` at module level
   - Export `generateSocialCards(prompt, sessionId)`:
     - Check `FAL_API_KEY` present; throw `Error('FAL_API_KEY not configured')` if missing
     - Run `fal.run('fal-ai/flux/schnell', { input: { prompt, image_size: { width: 1200, height: 630 } } })` for featured
     - Run `fal.run('fal-ai/flux/schnell', { input: { prompt, image_size: { width: 1080, height: 1350 } } })` for portrait
     - Run both in parallel with `Promise.all`
     - Return `{ featured: result[0].images[0].url, portrait: result[1].images[0].url }`

2. In `app/api/images/route.ts`, extend the `autoGenerate` block (from TASK-001):
   - After Gemini image succeeds, call `generateSocialCards(images.social, sessionId)` wrapped in try/catch
   - On success: store social cards in content_assets as `asset_type = 'social_cards'`, `content = { featured, portrait }`
   - Extend `generatedImage` response to include `socialCards`
   - On failure: add `socialCardsError` to response, do not throw

## Test Cases

- `generateSocialCards` with valid prompt → returns object with `featured` and `portrait` URL strings
- `generateSocialCards` with `FAL_API_KEY` missing → throws Error with message 'FAL_API_KEY not configured'
- Both fal.run calls execute in parallel (verify with Promise.all, not sequential await)

## Decision Rules
- Use `Promise.all` for both sizes — never await sequentially.
- fal.ai failure must not block the Gemini featured image from returning.
- Store fal images in a separate `content_assets` row, not merged into the Gemini row.
- Use `fal-ai/flux/schnell` model — fastest fal.ai image model suitable for social cards.

## Acceptance Criteria
- `lib/fal-images.ts` exports `generateSocialCards` function.
- `generateSocialCards` returns `{ featured: string, portrait: string }` with URL strings.
- `POST /api/images` with `autoGenerate: true` stores three content_assets rows: image_prompts, image_generated, social_cards.
- `FAL_API_KEY` missing returns error without crashing the route.

Status: COMPLETE
Completed: 2026-04-28T00:00:00.000Z
