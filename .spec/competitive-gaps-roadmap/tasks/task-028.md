---
task: "028"
feature: competitive-gaps-roadmap
rec: R10
title: "Create DetectionBadge component and wire to output panel + Inngest"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["027"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`
- `.kit/skills/development/code-writing-software-development/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create the `DetectionBadge` component showing green/amber/red originality and AI scores, add it to the article output panel, and create the Inngest post-generation hook that triggers detection automatically.

## Files

### Create
- `D:/content-engine/components/ui/DetectionBadge.tsx`
- `D:/content-engine/lib/inngest/detection-hook.ts`

### Modify
- `D:/content-engine/app/api/inngest/route.ts` (register detection function)
- Article output panel component (identify from codebase — likely `components/sections/BlogPanel.tsx`)

## Dependencies
- TASK-027: `POST /api/detect` route and `lib/detect.ts` exist
- Existing `lib/inngest/client.ts`

## Codebase Context

`components/sections/BlogPanel.tsx` renders the generated article. It likely receives `sessionId` as a prop and shows the blog content.

Inngest event emitted after pipeline completion (from `lib/inngest/data-driven-pipeline.ts` or similar): look for where `content/pipeline.start` handler concludes and emits a completion event or returns.

Pattern to emit a follow-up event inside Inngest function:
```typescript
await step.sendEvent('emit-detect', {
  name: 'content/detect.run',
  data: { sessionId, articleText: generatedArticle }
})
```

## Implementation Steps

1. Create `components/ui/DetectionBadge.tsx`:

```typescript
'use client'
interface DetectionBadgeProps {
  originalityScore: number | null
  aiScore: number | null
  isLoading?: boolean
  apiKeyMissing?: boolean
}
```

Colors:
- Originality: ≥90 = green, 70-89 = amber, <70 = red
- AI: ≤20 = green, 21-40 = amber, >40 = red

Render:
```tsx
<div className="flex gap-2 items-center">
  {apiKeyMissing ? (
    <a href="/dashboard/settings" className="text-sm text-blue-600 underline">
      Connect Originality.ai for plagiarism detection
    </a>
  ) : isLoading ? (
    <span className="animate-pulse text-sm text-gray-400">Checking originality...</span>
  ) : (
    <>
      <Badge variant={originalityBadgeVariant}>
        Original: {originalityScore?.toFixed(0) ?? '—'}%
      </Badge>
      <Badge variant={aiBadgeVariant}>
        AI: {aiScore?.toFixed(0) ?? '—'}%
      </Badge>
    </>
  )}
</div>
```

Badge variant mapping: green → `"success"` (or custom class if badge doesn't support it), amber → `"warning"`, red → `"destructive"`.

2. Add `DetectionBadge` to `components/sections/BlogPanel.tsx`:
   - After article generation SSE completes, set `detectionLoading = true`
   - Call `POST /api/detect` with `{ sessionId, text: articleText }`
   - On response: set `detectionScores = { originalityScore, aiScore }`, `detectionLoading = false`
   - Render `<DetectionBadge {...detectionScores} isLoading={detectionLoading} apiKeyMissing={apiKeyMissing} />`
   - Check `apiKeyMissing` from response (422 = true)

3. Create `lib/inngest/detection-hook.ts`:

```typescript
import { inngest } from './client'
import { runDetectionWithRewrite } from '@/lib/detect'
import { createClient } from '@supabase/supabase-js'

export const runDetection = inngest.createFunction(
  { id: 'run-detection', name: 'Post-Generation Detection' },
  { event: 'content/detect.run' },
  async ({ event, step }) => {
    const { sessionId, articleText } = event.data as { sessionId: string; articleText: string }
    await step.run('detect-and-rewrite', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      return runDetectionWithRewrite(sessionId, articleText, supabase)
    })
  }
)
```

4. Register `runDetection` in `app/api/inngest/route.ts`.

5. In the pipeline Inngest function (read `lib/inngest/data-driven-pipeline.ts`), after article is generated, emit `content/detect.run` event if `ORIGINALITY_API_KEY` is set.

## Test Cases

- DetectionBadge with originalityScore=95, aiScore=10 → two green badges
- DetectionBadge with originalityScore=75, aiScore=35 → amber original, amber AI
- DetectionBadge with apiKeyMissing=true → shows connect link
- DetectionBadge isLoading=true → shows "Checking originality..." text
- Inngest function registered and responds to 'content/detect.run' event

## Decision Rules
- Detection badge is non-blocking — article display must not wait for detection.
- Fire detection via direct API call from BlogPanel after SSE completes (immediate feedback) AND via Inngest for persistence.
- Badge variant colors: if `badge.tsx` only supports 'default', 'destructive' — apply color via className override.

## Acceptance Criteria
- DetectionBadge renders two colored pills (Original% and AI%).
- `apiKeyMissing=true` renders connect link instead of badges.
- Detection auto-triggered in BlogPanel after article generation.
- Inngest `runDetection` function registered and handles `content/detect.run` event.
- Detection results stored in content_assets.

Status: COMPLETE
Completed: 2026-04-28T09:52:58Z
