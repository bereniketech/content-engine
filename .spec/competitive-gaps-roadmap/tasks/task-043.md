---
task: "043"
feature: competitive-gaps-roadmap
rec: R2
title: "Integrate brief injection into article generation pipeline"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["024", "025", "026"]
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
Wire the approved brief into the article generation pipeline so that Claude receives the brief as additional context before generating the article.

## Files

### Modify
- `D:/content-engine/lib/prompts/blog.ts`
- `D:/content-engine/lib/inngest/data-driven-pipeline.ts` (or equivalent)

## Codebase Context

`lib/brief.ts` exports `injectBriefIntoGenerationContext(brief)` returning a formatted string.

The pipeline function has access to `sessionId` and `supabase`. Brief injection must happen before the blog generation Claude call.

## Implementation Steps

1. Read `lib/prompts/blog.ts` — extend to accept optional `briefContext: string | null`:
```typescript
export function getBlogPrompt(
  topic: string,
  research: ResearchResult,
  keywords: string[],
  brandVoiceAddendum?: string | null,
  briefContext?: string | null  // NEW
): string {
  let prompt = `... existing prompt ...`
  if (briefContext) {
    prompt = `${briefContext}\n\n${prompt}`  // Brief prepended
  }
  if (brandVoiceAddendum) {
    prompt = `${prompt}\n\n${brandVoiceAddendum}`
  }
  return prompt
}
```

2. In pipeline function, before blog generation:
   - Query `briefs WHERE session_id = sessionId AND status = 'approved' LIMIT 1`
   - If found: call `injectBriefIntoGenerationContext(brief)` → `briefContext`
   - Pass to `getBlogPrompt`
   - If not found: pass null (existing behavior)

3. BriefCard integration: the UI `BriefCard` calls `POST /api/brief` and `PATCH /api/brief/{id}` with status='approved'. The pipeline reads this approved brief. Verify the flow:
   - User clicks "Generate Article" only after brief is approved (BriefCard enforces this)
   - Pipeline reads the approved brief

4. Add brief generation step to pipeline trigger flow:
   - After research step in Inngest pipeline: emit event `content/brief.generate`
   - New Inngest function (or add step): generates brief from research → stores in DB
   - This is optional if brief is generated from BriefCard UI instead

## Test Cases

- Pipeline with approved brief → briefContext prepended to blog prompt
- Pipeline with draft/no brief → blog prompt unchanged
- Brief with 5 H2 sections → all sections appear in prompt context
- Brief injection exceeds 16000 chars → truncated at 16000

## Decision Rules
- Brief context prepended to prompt (not appended) — gives Claude the outline before the instructions.
- Never block pipeline on brief lookup failure — try/catch with null fallback.
- `injectBriefIntoGenerationContext` already enforces 16000 char limit.

## Acceptance Criteria
- Approved brief injected into blog prompt as context.
- No brief → prompt unchanged.
- Brief injection failure falls back gracefully.
- Token limit on brief injection enforced by `injectBriefIntoGenerationContext`.

Status: COMPLETE
Completed: 2026-04-28T11:00:00Z
