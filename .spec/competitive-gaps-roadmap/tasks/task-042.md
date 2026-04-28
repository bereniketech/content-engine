---
task: "042"
feature: competitive-gaps-roadmap
rec: R3
title: "Integrate brand voice injection into existing article generation pipeline"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["020", "021", "022", "023"]
---

## Skills
- `.kit/skills/development/code-writing-software-development/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Inject the active brand voice profile into the existing article generation prompts. The Inngest pipeline function and the Claude blog prompt must be extended to include brand voice context when an active profile exists.

## Files

### Modify
- `D:/content-engine/lib/prompts/blog.ts`
- `D:/content-engine/lib/inngest/data-driven-pipeline.ts` (or equivalent pipeline function)

## Codebase Context

`lib/prompts/blog.ts` exports the blog generation prompt. It likely accepts parameters like `topic`, `research`, `seoKeywords`. The brand voice addendum from `lib/brand-voice.ts` `buildBrandVoiceSystemAddendum()` must be appended.

`lib/inngest/data-driven-pipeline.ts` is the Inngest function that orchestrates the pipeline. It calls supabase to fetch session data and calls AI libs.

## Implementation Steps

1. Read `lib/prompts/blog.ts` to understand exact function signature.

2. Extend blog prompt to accept optional `brandVoiceAddendum: string | null`:
```typescript
export function getBlogPrompt(
  topic: string,
  research: ResearchResult,
  keywords: string[],
  brandVoiceAddendum?: string | null
): string {
  const basePrompt = `... existing prompt ...`
  if (brandVoiceAddendum) {
    return `${basePrompt}\n\n${brandVoiceAddendum}`
  }
  return basePrompt
}
```

3. Read `lib/inngest/data-driven-pipeline.ts` (or the pipeline function file).

4. In the pipeline, before calling the blog generation step:
   - Query `brand_voices WHERE user_id = userId AND is_active = true LIMIT 1`
   - If found: call `buildBrandVoiceSystemAddendum(voice)`
   - Pass addendum to `getBlogPrompt`
   - If no active voice: pass null (no change to existing behavior)

5. After blog generation completes:
   - Emit `content/brand.score` event with `{ sessionId, articleText, brandVoiceId }` if active voice exists
   - The scoring is async (best-effort) — don't await it in the pipeline

## Test Cases

- Pipeline with active brand voice → brand addendum included in prompt
- Pipeline with no active brand voice → prompt unchanged (exact same output)
- Brand voice with forbidden phrases → addendum includes forbidden phrase list

## Decision Rules
- Brand voice injection must be backward-compatible — no change when no active voice.
- Never block pipeline on brand voice lookup failure (wrap in try/catch with fallback null).
- Token limit: `buildBrandVoiceSystemAddendum` already guards at 2000 chars — no additional guard needed here.

## Acceptance Criteria
- Active brand voice injected into blog generation prompt.
- No active voice → prompt identical to current behavior.
- Brand scoring emitted as async event after generation.
- Lookup failure (DB error) falls back to no injection gracefully.

Status: COMPLETE
Completed: 2026-04-28T11:00:00Z
