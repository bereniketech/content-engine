---
task: "027"
feature: competitive-gaps-roadmap
rec: R10
title: "Create POST /api/detect route and lib/detect.ts"
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

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create the plagiarism/AI detection route calling Originality.ai API, plus a `lib/detect.ts` helper that wraps detection with auto-rewrite logic (max one retry).

## Files

### Create
- `D:/content-engine/app/api/detect/route.ts`
- `D:/content-engine/lib/detect.ts`

## Dependencies
- `ORIGINALITY_API_KEY` env var
- `lib/auth.ts`, `lib/ai.ts` (for rewrite prompt)
- `lib/supabase-server.ts` for server-side Supabase

## API Contracts

**POST /api/detect:**
```typescript
// Request
{ sessionId: string; text: string }

// Response 200
{ data: { originalityScore: number; aiScore: number; rewritten: boolean } }

// Response 422 — API key missing
{ error: { code: 'config_error'; message: 'Connect Originality.ai in settings'; connectUrl: '/dashboard/settings' } }

// Response 504 — timeout
{ error: { code: 'timeout'; message: 'Detection service unavailable — please retry' } }
```

## Codebase Context

Originality.ai API (v1):
```typescript
// POST https://api.originality.ai/api/v1/scan/ai
// Header: X-OAI-API-KEY: {ORIGINALITY_API_KEY}
// Body: { content: string, aiModelVersion: 'latest' }
// Response: { score: { ai: number, original: number } }
```

Rate limit: 60 requests/minute. Add 30s timeout.

`lib/ai.ts` `createMessage` for rewrite:
```typescript
const rewritten = await createMessage({
  maxTokens: 4000,
  messages: [{ role: 'user', content: `Rewrite the following article in your own words while preserving all facts and meaning. Make it sound more natural and human-written:\n\n${text}` }]
})
```

## Implementation Steps

1. Create `lib/detect.ts`:

```typescript
interface DetectionResult {
  originalityScore: number
  aiScore: number
}

async function callOriginalityAI(text: string): Promise<DetectionResult> {
  const key = process.env.ORIGINALITY_API_KEY
  if (!key) throw new Error('ORIGINALITY_API_KEY not configured')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch('https://api.originality.ai/api/v1/scan/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OAI-API-KEY': key },
      body: JSON.stringify({ content: text.slice(0, 50_000), aiModelVersion: 'latest' }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Originality.ai error: ${res.status}`)
    const data = await res.json() as { score: { ai: number; original: number } }
    return { originalityScore: data.score.original * 100, aiScore: data.score.ai * 100 }
  } finally {
    clearTimeout(timeout)
  }
}

export async function runDetectionWithRewrite(
  sessionId: string,
  text: string,
  supabase: SupabaseClient
): Promise<{ originalityScore: number; aiScore: number; rewritten: boolean; finalText: string }> {
  let result = await callOriginalityAI(text)
  let currentText = text
  let rewritten = false

  if (result.originalityScore < 90) {
    // One rewrite attempt
    currentText = await createMessage({ maxTokens: 4000, messages: [{ role: 'user', content: `Rewrite the following article...:\n\n${text}` }] })
    result = await callOriginalityAI(currentText)
    rewritten = true

    // Save rewritten text back to content_assets
    await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'blog_rewritten',
      content: { text: currentText, reason: 'originality_rewrite' },
    })
  }

  // Store detection result
  await supabase.from('content_assets').insert({
    session_id: sessionId,
    asset_type: 'detection_result',
    content: { ...result, rewritten, checkedAt: new Date().toISOString() },
  })

  return { ...result, rewritten, finalText: currentText }
}
```

2. Create `app/api/detect/route.ts`:
- Auth
- Parse `{ sessionId, text }` — both required
- Check `ORIGINALITY_API_KEY`; if missing return 422 with connect URL
- Call `runDetectionWithRewrite(sessionId, text, supabase)`
- If `AbortError` → return 504
- Return 200 with `{ originalityScore, aiScore, rewritten }`

## Test Cases

- POST valid text + configured API key → 200 with scores
- POST with `ORIGINALITY_API_KEY` missing → 422 with connectUrl
- POST with text scoring < 90 originality → rewrite triggered → final scores returned
- AbortError (timeout) → 504
- Rewrite only triggered once (max 1 retry)
- Detection result stored in content_assets

## Decision Rules
- Max ONE rewrite cycle — never loop.
- `originalityScore` and `aiScore` are percentages (0–100), not decimals.
- Stored detection result must include `checkedAt` timestamp.
- The 30s timeout must apply to each Originality.ai call independently.

## Acceptance Criteria
- `POST /api/detect` returns originality and AI scores.
- Auto-rewrite triggered when originalityScore < 90, max once.
- Rewritten text stored in content_assets as 'blog_rewritten'.
- Detection result stored in content_assets as 'detection_result'.
- 422 returned when API key missing.
- 504 returned on timeout.

Status: COMPLETE
Completed: 2026-04-28T07:30:36Z
