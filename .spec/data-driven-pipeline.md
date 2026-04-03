# Data-Driven Content Generation Pipeline

## Context
The existing content engine follows a **topic-based** flow: topic → research → SEO → blog → social. The user needs a new **data-driven** pipeline that accepts either **raw source data (text/PDF)** or **just a topic** (in which case deep research is performed first). The tone is a **free-form paragraph** provided by the user, not a fixed dropdown. Content flows through 3 iterations into optimized multi-format output with a strategic X hype campaign.

---

## Pipeline Overview

```
[Input: (Source Data OR Topic) + Tone Paragraph]
  → Step 0: Context Assessment — is there enough data to write authoritatively?
      → If topic only OR data is thin: Deep Research (Google Search + Claude deep analysis)
  → Iteration 1: Generate long-form article (from data + research) — neutral/informational tone
  → Iteration 2: Optimize article for SEO + GEO — tone-independent
  → Iteration 3: Apply tone → Blog post + LinkedIn article + Medium article + 10 X posts (mystery → slow reveal → reveal)
```

**Research triggers in two cases:**
1. User provides only a topic (no source data)
2. User provides source data, but it lacks sufficient context (pain points, market landscape, statistics, etc.)

**Tone is only applied in Iteration 3.** Iterations 1 and 2 produce neutral, informational content. The user's tone paragraph shapes the final outputs only.

---

## Key Design Decisions

1. **Dual input mode:** User provides either source data (text/PDF) or a topic. If topic-only → deep research step runs first to gather material, then article is generated from research findings.
2. **Tone is a free-form paragraph** — not the existing `TopicTone` enum. User writes something like "Write in a witty, conversational tone with dry humor. Sound like a seasoned founder talking to other founders." This paragraph is passed directly into all prompts.
3. **Parallel flow** — runs alongside existing topic-based pipeline, doesn't replace it.
4. **Deep research** (topic-only mode) — uses existing Google Search integration + an enhanced Claude analysis prompt that produces richer, more comprehensive research than the standard research engine.

---

## Implementation Plan

### Step 1: Dependencies & Types

**Install:** `npm install pdf-parse`

**Modify `types/index.ts`:**
```typescript
// Add to SessionInputType
export type SessionInputType = "topic" | "upload" | "data-driven";

// New interface — tone is free-form string, not enum
export interface DataDrivenInputData {
  sourceText?: string;       // raw text (if data provided)
  sourceFileName?: string;   // original filename if PDF/file
  topic?: string;            // topic (if no data, triggers deep research)
  tone: string;              // free-form tone paragraph from user
}

// Add to union
export type SessionInputData = TopicInputData | UploadInputData | DataDrivenInputData;

// New result types
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

export interface XCampaignPost {
  postNumber: number;
  phase: "mystery" | "reveal_slow" | "reveal_full";
  content: string;
  purpose: string;
  scheduleSuggestion: string;
  hashtags: string[];
  hasLink: boolean;
}

export interface XCampaignOutput {
  campaignName: string;
  posts: XCampaignPost[];
  threadVariant: string[];
}
```

**New migration** `supabase/migrations/<timestamp>_data_driven_flow.sql`:
- Update `sessions.input_type` check constraint to allow `'data-driven'`

### Step 2: PDF Parsing Utility

**New `lib/pdf-parse.ts`:**
- Accept `Buffer` from uploaded PDF
- Extract text using `pdf-parse`
- Enforce 80,000 char limit (truncate with flag)
- Return `{ text, pageCount, wasTruncated }`
- Validate minimum text length (reject image-only PDFs with helpful error)

### Step 3: Prompt Templates (5 new files)

**New `lib/prompts/deep-research.ts`:**
- Enhanced version of existing `lib/prompts/research.ts` for topic-only mode
- Input: `topic`, `searchResults`
- Goes deeper than standard research: extracts detailed findings, statistics, expert opinions, case studies, controversies, and emerging trends
- Output: structured JSON with `{ summary, keyFindings[], statistics[], expertInsights[], caseStudies[], controversies[], trends[], gaps[], sourceUrls[] }`
- This research output becomes the "source data" for Iteration 1

**New `lib/prompts/data-driven-article.ts`:**
- Input: `sourceText` (either user-provided data or deep research output)
- **No tone applied** — writes in a neutral, informational style
- Synthesize into 2000-3500 word structured markdown article
- Identify core thesis, key findings, supporting evidence
- Output: pure markdown

**New `lib/prompts/seo-geo.ts`:**
- Input: generated article
- **SEO fields:** title, meta, slug, keywords, heading structure, FAQ schema, score (reuse patterns from `lib/prompts/seo.ts`)
- **GEO fields** (Generative Engine Optimization — optimizing for AI search engines):
  - `citationOptimization` — key statements rewritten to be citation-worthy for ChatGPT, Perplexity, Google AI Overviews
  - `entityMarking` — key entities with clear descriptions (helps AI engines identify authority)
  - `conciseAnswers` — direct Q&A pairs optimized for AI Overview snippets
  - `structuredClaims` — factual claims formatted for easy AI extraction
  - `sourceAttribution` — suggested attribution text for when AI engines cite this content
- Output: JSON matching `SeoGeoResult`

**New `lib/prompts/multi-format.ts`:**
- Input: `article`, `seoGeo`, `tone` (free-form paragraph)
- Outputs JSON with 3 keys:
  - `blog` — web-optimized post with SEO/GEO enhancements baked in, internal linking placeholders
  - `linkedin` — professional LinkedIn article: hook opening, strategic line breaks, no hashtag spam
  - `medium` — Medium-specific: subtitle, pull quotes, section breaks, reading-time-appropriate length
- Tone paragraph applied to all three outputs

**New `lib/prompts/x-campaign.ts`:**
- Input: `article`, `seoGeo`, `tone` (free-form paragraph)
- Generates exactly 10 posts with hype arc:
  - **Posts 1-3 (mystery):** Provocative questions, bold claims without context, "something big is coming" energy, NO links
  - **Posts 4-6 (slow reveal):** Tease specific insights from the article, share one surprising stat/fact, build anticipation, NO links yet
  - **Posts 7-10 (full reveal):** Share the content directly, link to blog, include CTA, summary
- Each post: `{ postNumber, phase, content (≤280 chars), purpose, scheduleSuggestion, hashtags, hasLink }`
- Also generates `threadVariant` — all 10 as a connected thread alternative
- Output: JSON matching `XCampaignOutput`

### Step 4: API Routes (6 new routes)

All routes follow existing patterns: `requireAuth()` → sanitize → AI call → save asset → respond.

**New `app/api/data-driven/assess/route.ts`** (context sufficiency check):
- Accepts `{ sourceText, sessionId }`
- Lightweight Claude call (~500 tokens) that evaluates whether the source data has enough context to write authoritatively: pain points, market data, statistics, competitive landscape, actionable insights
- Returns `{ sufficient: boolean, missingAreas: string[], suggestedTopic: string }`
- If `sufficient: false` → frontend triggers deep research using `suggestedTopic`
- This keeps the pipeline smart: thin data gets enriched, rich data goes straight to article

**New `app/api/data-driven/research/route.ts`:**
- Accepts `{ topic?, sourceText?, sessionId? }`
- **Triggers when:** (a) topic-only mode, or (b) source data provided but assessed as insufficient
- Derives search queries from topic or by extracting the core subject from source data
- Runs Google Search (parallelized: `subject`, `subject insights`, `subject statistics`)
- Calls `createMessage()` with deep-research prompt
- Saves asset `dd_research`
- Returns research JSON

**New `app/api/data-driven/article/route.ts`:**
- Accepts JSON: `{ sourceText?, researchData?, sessionId }` — can receive source data, research, or both
- Also accepts `multipart/form-data` for PDF upload
- PDF: parse with `lib/pdf-parse.ts`; text: use directly
- **No tone used** — article is generated in neutral informational style
- When both source data AND research are provided, the article synthesizes both (data-enriched mode)
- **Streaming** via `streamMessage()` + SSE (same pattern as `app/api/blog/route.ts`)
- Creates/resolves session with `input_type: 'data-driven'`
- Saves asset `dd_article`

**New `app/api/data-driven/seo-geo/route.ts`:**
- Accepts `{ article, sessionId }`
- Non-streaming `createMessage()`
- Saves asset `dd_seo_geo`
- Returns `SeoGeoResult` JSON

**New `app/api/data-driven/multi-format/route.ts`:**
- Accepts `{ article, seoGeo, tone, sessionId }`
- Non-streaming `createMessage()`
- Saves 3 assets: `dd_blog`, `dd_linkedin`, `dd_medium`
- Returns JSON with all three

**New `app/api/data-driven/x-campaign/route.ts`:**
- Accepts `{ article, seoGeo, tone, sessionId }`
- Non-streaming `createMessage()`
- Saves asset `dd_x_campaign`
- Returns `XCampaignOutput` JSON

### Step 5: Input Component

**New `components/input/DataDrivenForm.tsx`:**
- **Source input** (one of):
  - Textarea for pasting raw text data
  - File upload accepting `.txt`, `.md`, `.pdf`
  - OR a topic field (text input) — when no data is provided
- Toggle/radio: "I have data" vs "I have a topic"
- **Tone input**: textarea for free-form tone paragraph (e.g., "Write like a witty founder explaining to other founders...")
  - Placeholder examples to guide user
- Submit → creates `data-driven` session → navigates to pipeline page
- Validation: must have either source data or topic, and must have tone paragraph

### Step 6: Pipeline Page (core UX)

**New `app/dashboard/data-driven/page.tsx`:**
- Vertical stepper showing pipeline progress
- Steps vary based on input and context assessment:
  - **Data mode (sufficient):** Article → SEO+GEO → Multi-format + X Campaign
  - **Data mode (insufficient):** Assess → Deep Research → Article (data + research) → SEO+GEO → Multi-format + X Campaign
  - **Topic mode:** Deep Research → Article → SEO+GEO → Multi-format + X Campaign
- Each step: status indicator (pending / in-progress / complete / error) + content preview
- Auto-advances through steps sequentially
- Regenerate button per step
- Step details:
  - Research (topic mode only): shows key findings, stats, insights
  - Article: streaming markdown preview
  - SEO+GEO: summary card with scores and GEO indicators
  - Multi-format + X Campaign: fires in parallel, shows tabbed results

**New `components/sections/DataDrivenStepper.tsx`:**
- Reusable stepper UI with collapsible step cards
- Props: steps array, current step, onRegenerate callback

### Step 7: Output Display Pages

**New `app/dashboard/data-driven/blog/page.tsx`:**
- Rendered blog with react-markdown + copy button

**New `app/dashboard/data-driven/linkedin/page.tsx`:**
- LinkedIn article view with copy button

**New `app/dashboard/data-driven/medium/page.tsx`:**
- Medium article view with copy button

**New `app/dashboard/data-driven/x-campaign/page.tsx`:**
- 10-post timeline view
- Color-coded phases: mystery (purple), slow reveal (amber), full reveal (green)
- Each post card: number, phase badge, content, purpose note, schedule suggestion, hashtags
- Copy button per post
- "Copy All as Thread" button for the thread variant
- Visual indicator showing which posts have links

### Step 8: Navigation & Dashboard Integration

**Modify `components/dashboard/Sidebar.tsx`:**
- Add visual separator
- Add "Data Pipeline" nav group with items:
  - Data Pipeline (main stepper page)
  - Blog / LinkedIn / Medium / X Campaign (output pages)

**Modify `app/dashboard/page.tsx`:**
- Add third tab: `"data-driven"` alongside `"topic"` and `"upload"`
- `InputTab` type becomes `"topic" | "upload" | "data-driven"`
- Render `DataDrivenForm` when active
- History section: show "Data-Driven" badge for those sessions, with "Data" or "Topic" sub-badge

**Modify `components/dashboard/SummaryPanel.tsx`:**
- Add `dd_research`, `dd_article`, `dd_seo_geo`, `dd_blog`, `dd_linkedin`, `dd_medium`, `dd_x_campaign` to asset catalog

---

## New Asset Types

| Asset Type | Step | Shape |
|---|---|---|
| `dd_research` | 0 (topic mode) | `{ summary, keyFindings[], statistics[], expertInsights[], caseStudies[], trends[], gaps[] }` |
| `dd_article` | 1 | `{ markdown, wordCount }` |
| `dd_seo_geo` | 2 | `SeoGeoResult` (see types above) |
| `dd_blog` | 3 | `{ markdown, wordCount }` |
| `dd_linkedin` | 3 | `{ article }` |
| `dd_medium` | 3 | `{ article, subtitle }` |
| `dd_x_campaign` | 3 | `XCampaignOutput` (10 posts + thread variant) |

---

## Files Summary

| Action | Files |
|---|---|
| **Modify** | `types/index.ts`, `components/dashboard/Sidebar.tsx`, `app/dashboard/page.tsx`, `components/dashboard/SummaryPanel.tsx` |
| **New utils** | `lib/pdf-parse.ts` |
| **New prompts** | `lib/prompts/deep-research.ts`, `lib/prompts/data-driven-article.ts`, `lib/prompts/seo-geo.ts`, `lib/prompts/multi-format.ts`, `lib/prompts/x-campaign.ts` |
| **New API routes** | `app/api/data-driven/assess/route.ts`, `app/api/data-driven/research/route.ts`, `app/api/data-driven/article/route.ts`, `app/api/data-driven/seo-geo/route.ts`, `app/api/data-driven/multi-format/route.ts`, `app/api/data-driven/x-campaign/route.ts` |
| **New components** | `components/input/DataDrivenForm.tsx`, `components/sections/DataDrivenStepper.tsx` |
| **New pages** | `app/dashboard/data-driven/page.tsx`, `app/dashboard/data-driven/blog/page.tsx`, `app/dashboard/data-driven/linkedin/page.tsx`, `app/dashboard/data-driven/medium/page.tsx`, `app/dashboard/data-driven/x-campaign/page.tsx` |
| **New migration** | `supabase/migrations/<timestamp>_data_driven_flow.sql` |

**Total: ~4 modified, ~19 new files**

---

## Verification

1. **Build:** `npm run build` passes with no type errors
2. **Topic-only flow:** Enter topic + tone paragraph → deep research runs → article generated → SEO+GEO → all outputs produced
3. **Data flow (text):** Paste raw text + tone → article generated directly (no research step) → SEO+GEO → all outputs
4. **Data flow (thin data):** Paste minimal text + tone → assess detects insufficient context → research enriches → article uses both
5. **Data flow (PDF):** Upload PDF + tone → text extracted → same pipeline
6. **Streaming:** Iteration 1 article streams in real-time in the stepper UI
7. **Tone:** Verify free-form tone paragraph is reflected ONLY in Iteration 3 outputs (blog, LinkedIn, Medium, X campaign) — not in the article or SEO+GEO
8. **SEO+GEO:** Both SEO fields (title, meta, score) and GEO fields (citations, entities, structured claims) present
9. **Multi-format:** Blog, LinkedIn, Medium are distinct and platform-appropriate
10. **X Campaign:** Exactly 10 posts; posts 1-3 have no links and create mystery; posts 4-6 tease; posts 7-10 have links + CTA
11. **Session persistence:** Reload page → stepper restores from saved assets
12. **History:** Data-driven sessions show with correct badge in dashboard
