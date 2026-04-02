---
task: 003
feature: data-driven-pipeline
status: pending
depends_on: [1]
---

# Task 003: Deep Research Prompt and API Route

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /api-design, /notebooklm
Commands: /verify, /task-handoff

---

## Objective

Create the deep research prompt template and API route. The route integrates with the NotebookLM API for multi-capability research (deep research, competitive intel, market synthesis, etc.), with a fallback to Google Search + Claude when NotebookLM is unavailable. Saves the result as `dd_research` asset.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [Existing research prompt pattern — from lib/prompts/research.ts:1-43]
export function getResearchPrompt(topic: string, searchResults: Array<{ title: string; snippet: string; link: string }>) {
  const resultsText = searchResults
    .map((result, i) => `${i + 1}. ${result.title}\n${result.snippet}\n${result.link}`)
    .join('\n\n')

  return `Analyze the following search results for the topic "${topic}" and provide structured research intelligence.
// ... returns JSON with intent, demand, trend, keywords, faqs, competitors, gaps
`
}
```

```typescript
// [Existing research route pattern — from app/api/research/route.ts:22-185]
// Pattern: requireAuth → parse body → validate → googleSearch (parallelized) → createMessage → JSON.parse with fallback → save asset → respond
export async function POST(request: NextRequest) {
  // ...auth, parse, validate...
  const [mainResults, tipsResults] = await Promise.all([
    googleSearch(sanitizedTopic),
    googleSearch(`${sanitizedTopic} tips`),
  ])
  // ...createMessage, JSON.parse, save asset...
}
```

```typescript
// [Google Search utility — from lib/google-search.ts:15-51]
export async function googleSearch(query: string): Promise<SearchResult[]> {
  // Uses GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID
  // Returns Array<{ title, link, snippet }>
}
```

```typescript
// [AI createMessage — from lib/ai.ts:50-72]
export async function createMessage(opts: CreateMessageOptions): Promise<string> {
  // Provider-agnostic, returns full response text
}
```

```typescript
// [DeepResearchResult — from types/index.ts (added in task-001)]
export interface DeepResearchResult {
  summary: string;
  keyFindings: string[];
  statistics: string[];
  expertInsights: string[];
  caseStudies: string[];
  controversies: string[];
  trends: string[];
  gaps: string[];
  sourceUrls: string[];
  capabilitiesUsed: string[];
}
```

### Key Patterns in Use
- **Parallelized search:** Research route uses `Promise.all()` for multiple Google Search queries.
- **JSON parse with fallback:** Try `JSON.parse(responseText)`, then try extracting from markdown code blocks.
- **Asset saving:** `supabase.from('content_assets').insert({ session_id, asset_type, content })`.
- **Auth pattern:** `const { user, supabase } = await requireAuth(request)`.

### Architecture Decisions Affecting This Task
- ADR-1: NotebookLM as primary research engine, Google Search + Claude as fallback when NotebookLM key is absent or API fails.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-003.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Create `lib/prompts/deep-research.ts`:
   - Export `getDeepResearchPrompt(topic: string, findings: string): string`.
   - Prompt instructs AI to synthesize findings into `DeepResearchResult` JSON.
   - Include schema in prompt for structured output.
2. Create `app/api/data-driven/research/route.ts`:
   - `requireAuth()` → parse body → validate (must have `topic` or `sourceText`).
   - If `sourceText` provided without `topic`, derive topic from source text via lightweight AI call.
   - **Primary path (NotebookLM):** Check if `NOTEBOOKLM_API_KEY` is set. If yes, use NotebookLM skill to create notebook, add source, select capabilities based on topic, extract findings.
   - **Fallback path:** If NotebookLM unavailable, run parallelized Google Search (`topic`, `topic insights`, `topic statistics`) + `createMessage()` with deep research prompt.
   - Parse AI response as JSON with fallback extraction.
   - `resolveSessionId()` with `fallbackInputType: 'data-driven'`.
   - Save asset as `dd_research`.
   - Return `{ data: { id, sessionId, assetType, content, version, createdAt } }` with status 201.
3. Handle errors: auth (401), validation (400), research failure (500 with `research_error` code).

_Requirements: 4_
_Skills: /code-writing-software-development — API route, /api-design — REST, /notebooklm — integration_

---

## Acceptance Criteria
- [ ] `lib/prompts/deep-research.ts` exports prompt builder function
- [ ] `app/api/data-driven/research/route.ts` handles POST requests
- [ ] Route uses NotebookLM when `NOTEBOOKLM_API_KEY` is set
- [ ] Route falls back to Google Search + Claude when NotebookLM is unavailable
- [ ] Response matches `DeepResearchResult` schema
- [ ] Asset saved as `dd_research` in `content_assets`
- [ ] Auth required (401 without token)
- [ ] All existing tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
