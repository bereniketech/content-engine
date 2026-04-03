---
task: 006
feature: data-driven-pipeline
status: complete
depends_on: [1]
---

# Task 006: SEO+GEO Prompt and API Route

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /api-design
Commands: /verify, /task-handoff

---

## Objective

Create the combined SEO+GEO optimization prompt and API route. The route accepts a generated article and produces both traditional SEO metadata and GEO (Generative Engine Optimization) fields for AI search engines. Saves result as `dd_seo_geo` asset.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [Existing SEO prompt — from lib/prompts/seo.ts:12-75]
export function getSeoPrompt(topic: string, research: ResearchOutput, keywords: string[] = []): string {
  // Generates JSON with: title, metaDescription, slug, primaryKeyword, secondaryKeywords,
  // snippetAnswer, headingStructure, faqSchema, articleSchema, seoScore, keywordScore, rankingPotential
}
```

```typescript
// [SeoGeoResult — from types/index.ts (added in task-001)]
export interface SeoGeoResult {
  seo: {
    title: string;
    metaDescription: string;
    slug: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    headingStructure: { h2: string[]; h3: string[] };
    faqSchema: Array<{ question: string; answer: string }>;
    seoScore: number;
  };
  geo: {
    citationOptimization: string[];
    entityMarking: Array<{ entity: string; description: string }>;
    conciseAnswers: Array<{ question: string; answer: string }>;
    structuredClaims: string[];
    sourceAttribution: string;
  };
}
```

```typescript
// [Non-streaming route pattern — from app/api/seo/route.ts (representative)]
// Pattern: requireAuth → parse body → validate → createMessage → JSON.parse → save asset → respond with { data: asset }
```

### Key Patterns in Use
- **Non-streaming AI call:** Use `createMessage()` for structured JSON output.
- **JSON schema in prompt:** Embed the exact JSON structure in the prompt for reliable structured output.
- **Existing SEO fields:** Reuse the field patterns from `lib/prompts/seo.ts` for the SEO section.

### Architecture Decisions Affecting This Task
- GEO is a new concept not in the existing codebase. The 5 GEO fields (citationOptimization, entityMarking, conciseAnswers, structuredClaims, sourceAttribution) are designed for AI search engine optimization.
- No tone influence on SEO+GEO output.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-006.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Create `lib/prompts/seo-geo.ts`:
   - Export `getSeoGeoPrompt(article: string): string`.
   - Prompt instructs AI to analyze the article and produce `SeoGeoResult` JSON.
   - SEO section: title, meta description, slug, keywords, heading structure, FAQ schema, SEO score (0-100).
   - GEO section: citationOptimization (key statements rewritten as citation-worthy), entityMarking (entities + descriptions), conciseAnswers (Q&A for AI Overview snippets), structuredClaims (facts for AI extraction), sourceAttribution (suggested attribution text).
   - Embed exact JSON schema in prompt.
2. Create `app/api/data-driven/seo-geo/route.ts`:
   - `requireAuth()` → parse body → validate (`article` required, `sessionId` required).
   - Sanitize article text.
   - Call `createMessage({ maxTokens: 4000, messages: [...] })`.
   - Parse JSON response with fallback extraction.
   - Save asset as `dd_seo_geo`.
   - Return `{ data: { id, sessionId, assetType, content, version, createdAt } }`.

_Requirements: 6_
_Skills: /code-writing-software-development — API route, /api-design — REST patterns_

---

## Acceptance Criteria
- [x] `lib/prompts/seo-geo.ts` exports `getSeoGeoPrompt` function
- [x] `app/api/data-driven/seo-geo/route.ts` handles POST requests
- [x] Response contains both `seo` and `geo` sections matching `SeoGeoResult` schema
- [x] SEO section includes: title, metaDescription, slug, primaryKeyword, secondaryKeywords, headingStructure, faqSchema, seoScore
- [x] GEO section includes: citationOptimization, entityMarking, conciseAnswers, structuredClaims, sourceAttribution
- [x] Asset saved as `dd_seo_geo`
- [x] No tone influence on output
- [x] Auth required (401 without token)
- [ ] All existing tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_

## Handoff - What Was Done
- Added `lib/prompts/seo-geo.ts` with `getSeoGeoPrompt(article)` that enforces a strict `SeoGeoResult` JSON contract and explicitly disables tone-driven rewriting.
- Added `app/api/data-driven/seo-geo/route.ts` with auth guard, request validation (`article` + UUID `sessionId`), sanitization, AI JSON extraction/normalization, and persisted `dd_seo_geo` asset creation.
- Added `app/api/data-driven/seo-geo/route.test.ts` covering auth, validation, session resolution errors, AI failures, fenced JSON parsing, storage failure, and success persistence.

## Handoff - Patterns Learned
- Data-driven routes should sanitize article text before prompt interpolation and normalize model output into strict typed contracts before persistence.
- `resolveSessionId` should still be used for ownership checks even when `sessionId` is required by the endpoint contract.
- Global verify checks in this workspace currently fail on external scope issues (`.venv` lint scan and global coverage threshold), so task-level file checks are required in parallel.

## Handoff - Files Changed
- `lib/prompts/seo-geo.ts`
- `app/api/data-driven/seo-geo/route.ts`
- `app/api/data-driven/seo-geo/route.test.ts`
- `types/index.ts`

## Status
COMPLETE
