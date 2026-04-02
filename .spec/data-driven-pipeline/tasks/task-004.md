---
task: 004
feature: data-driven-pipeline
status: pending
depends_on: [1]
---

# Task 004: Context Assessment API Route

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /api-design
Commands: /verify, /task-handoff

---

## Objective

Create the context sufficiency assessment API route. This is a lightweight AI call (~500 tokens) that evaluates whether user-provided source data contains enough context to write an authoritative article, or whether deep research is needed to enrich the data.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [AssessmentResult — from types/index.ts (added in task-001)]
export interface AssessmentResult {
  sufficient: boolean;
  missingAreas: string[];
  suggestedTopic: string;
}
```

```typescript
// [Existing route auth + validation pattern — from app/api/research/route.ts:22-65]
export async function POST(request: NextRequest) {
  try {
    let auth
    try {
      auth = await requireAuth(request)
    } catch {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    const { user, supabase } = auth
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }
    // ...validate fields...
}
```

```typescript
// [createMessage for non-streaming — from lib/ai.ts:50-72]
export async function createMessage(opts: CreateMessageOptions): Promise<string> {
  // Returns full response text, provider-agnostic
}
```

```typescript
// [sanitizeInput — from lib/sanitize.ts]
// Used on all user-provided text before embedding in prompts
```

### Key Patterns in Use
- **Lightweight AI call:** Use `createMessage` with low `maxTokens` (~500) for fast assessment.
- **Standard error envelope:** `{ error: { code, message, details? } }`.

### Architecture Decisions Affecting This Task
- The assess route does NOT save an asset — it's a pass-through that informs the frontend whether to trigger research.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-004.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Create `app/api/data-driven/assess/route.ts`:
   - `requireAuth()` → parse body → validate (`sourceText` required, non-empty).
   - Sanitize `sourceText` via `sanitizeInput()`.
   - Build a prompt: "Evaluate whether the following source data contains enough context to write an authoritative 2000-3500 word article. Check for: pain points, market data, statistics, competitive landscape, actionable insights, expert opinions. Return JSON: `{ sufficient: boolean, missingAreas: string[], suggestedTopic: string }`."
   - Call `createMessage({ maxTokens: 500, messages: [{ role: 'user', content: prompt }] })`.
   - Parse response as JSON with fallback extraction.
   - Return `{ data: AssessmentResult }` with status 200.
2. Error handling: auth (401), missing sourceText (400), AI/parse failure (500).

_Requirements: 3_
_Skills: /code-writing-software-development — API route, /api-design — REST patterns_

---

## Acceptance Criteria
- [ ] `app/api/data-driven/assess/route.ts` handles POST requests
- [ ] Accepts `{ sourceText, sessionId? }` body
- [ ] Returns `{ data: { sufficient, missingAreas, suggestedTopic } }`
- [ ] Sufficient data returns `sufficient: true` with empty `missingAreas`
- [ ] Thin data returns `sufficient: false` with populated `missingAreas` and `suggestedTopic`
- [ ] Auth required (401 without token)
- [ ] Missing `sourceText` returns 400
- [ ] All existing tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
