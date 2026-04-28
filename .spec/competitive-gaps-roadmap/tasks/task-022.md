---
task: "022"
feature: competitive-gaps-roadmap
rec: R3
title: "Create PUT/DELETE /api/brand-voice/[id] and POST /api/brand-voice/score routes"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["020", "021"]
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create PUT/DELETE routes for brand voice management (with mutual exclusion for `is_active`) and the scoring route that runs a Haiku classifier to score article brand alignment.

## Files

### Create
- `D:/content-engine/app/api/brand-voice/[id]/route.ts`
- `D:/content-engine/app/api/brand-voice/score/route.ts`
- `D:/content-engine/lib/brand-voice.ts`

## Dependencies
- TASK-020: `brand_voices` table exists
- TASK-021: GET/POST routes exist (for reference)
- `lib/auth.ts` — `requireAuth`
- `lib/ai.ts` — `createMessage`

## API Contracts

**PUT /api/brand-voice/[id]:**
```typescript
// Request — all optional except at least one field
{
  name?: string
  toneAdjectives?: string[]
  writingSamples?: string[]
  forbiddenPhrases?: string[]
  formalityLevel?: 'formal' | 'casual' | 'neutral'
  isActive?: boolean
}
// Response 200: { data: BrandVoice }
// Response 404: not found/not owned
```

**DELETE /api/brand-voice/[id]:**
```typescript
// Response 200: { data: { id: string; deleted: true } }
// Response 404: not found/not owned
```

**POST /api/brand-voice/score:**
```typescript
// Request
{ articleText: string; brandVoiceId: string; sessionId: string }
// Response 200
{ data: { score: number; violations: string[] } }
```

## Codebase Context

`lib/ai.ts` exports `createMessage`. Existing usage:
```typescript
const rawText = await createMessage({
  maxTokens: 500,
  messages: [{ role: 'user', content: prompt }],
  model: 'claude-haiku-4-5',  // or whatever Haiku model id is configured
})
```

Check `lib/ai.ts` for exact `createMessage` signature — it may accept a `model` parameter.

## Implementation Steps

1. Create `lib/brand-voice.ts`:

```typescript
export interface BrandVoice {
  id: string; name: string; toneAdjectives: string[]
  writingSamples: string[]; forbiddenPhrases: string[]; formalityLevel: string; isActive: boolean
}

export function buildBrandVoiceSystemAddendum(voice: BrandVoice): string {
  const samples = voice.writingSamples
    .map(s => s.slice(0, 400))
    .join('\n---\n')
    .slice(0, 2000)
  return `
## Brand Voice: ${voice.name}
Tone: ${voice.toneAdjectives.join(', ')}
Formality: ${voice.formalityLevel}
Forbidden phrases: ${voice.forbiddenPhrases.map(p => `"${p}"`).join(', ')}
Writing style samples:
${samples}
`.trim()
}

export function buildBrandScorePrompt(article: string, voice: BrandVoice): string {
  return `Rate how well this article matches the brand voice profile below. 
Return JSON: {"score": 0-100, "violations": ["specific issue 1", "specific issue 2"]}
Score 100 = perfect match, 0 = completely off-brand.

BRAND VOICE:
${buildBrandVoiceSystemAddendum(voice)}

ARTICLE (first 3000 chars):
${article.slice(0, 3000)}`
}
```

2. Create `app/api/brand-voice/[id]/route.ts`:

**PUT handler:**
- Auth, validate params.id is UUID
- Fetch existing row (verify ownership)
- If `isActive = true`: first `UPDATE brand_voices SET is_active = false WHERE user_id = auth.uid()` (deactivate all), then update this row with `is_active = true`
- If `isActive = false`: update this row only
- Other fields: build update object with provided snake_case keys
- Return updated row as camelCase

**DELETE handler:**
- Auth, query and verify ownership
- Hard delete (no soft delete needed for brand voices)
- Return `{ data: { id, deleted: true } }`

3. Create `app/api/brand-voice/score/route.ts`:
- Auth
- Parse body: `{ articleText, brandVoiceId, sessionId }`
- Fetch `brand_voices` row by `brandVoiceId` (verify `user_id = auth.uid()`)
- Call `buildBrandScorePrompt(articleText, voice)`
- Call `createMessage({ maxTokens: 500, messages: [{ role: 'user', content: prompt }] })` with Haiku
- Parse response JSON: `{ score: number, violations: string[] }`
- Store in `content_assets` as `asset_type = 'brand_score'`, `content = { score, violations, brandVoiceId }`
- Return `{ data: { score, violations } }`

## Test Cases

- PUT `isActive: true` → all other voices for user set to `is_active=false`
- PUT unknown id → 404
- DELETE own voice → 200 with deleted:true
- DELETE another user's voice → 404
- Score: valid brandVoiceId + article → { score: number, violations: array }
- Score: Claude returns malformed JSON → 502

## Decision Rules
- Mutual exclusion of `is_active` done in a transaction: deactivate all, then activate target.
- Use `extractJsonPayload` from `lib/extract-json.ts` to parse Claude score response (already used in images route).
- Score prompt scoped to first 3000 chars of article to keep token cost low.
- Haiku model for scoring — fast and cheap.

## Acceptance Criteria
- PUT `/api/brand-voice/[id]` with `isActive: true` deactivates all others for the user.
- DELETE `/api/brand-voice/[id]` hard-deletes the row.
- POST `/api/brand-voice/score` returns `{ score: number, violations: string[] }`.
- Score stored in content_assets.
- Auth required on all three routes.

Status: COMPLETE
Completed: 2026-04-28T07:27:27Z
