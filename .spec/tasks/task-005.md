# TASK-005 — Research Engine API + UI

## Session Bootstrap
Skills needed: code-writing-software-development, api-design, claude-developer-platform

## Objective
Build `POST /api/research` integrating Google Search API + Claude for topic intelligence and competitor gap analysis. Build the Research panel UI to display results.

## Implementation Steps
1. Create `/lib/google-search.ts` — wrapper around Google Custom Search API, returns top 10 results for a query
2. Create `/lib/prompts/research.ts` — Claude prompt that takes topic + search results and returns structured JSON: `{ intent, demand, trend, keywords, faqs, competitors, gaps, alternatives? }`
3. Create `/app/api/research/route.ts`:
   - Validate JWT via Supabase middleware
   - Accept `{ topic, audience, geography? }`
   - Parallelise: `Promise.all([googleSearch(topic), googleSearch(topic + ' tips')])`
   - Call Claude with research prompt
   - If `demand === 'low'` include 3 alternative topics in response
   - Save result to `content_assets` (`asset_type = 'research'`)
   - Return full research object as JSON
4. Create `/components/sections/ResearchPanel.tsx`:
   - Shows intent, demand, trend as colour-coded badges
   - Keyword clusters as tag chips
   - FAQ accordion
   - Competitor gaps as a checklist
   - If demand is low: show alternatives with "Use this topic" buttons
5. Wire Research page to call `/api/research` on "Run Research" button click

## Acceptance Criteria
- `POST /api/research` returns `{ intent, demand, trend, keywords, faqs, competitors, gaps }`
- Google Search API called for top 10 results; Claude analyses and extracts structured data
- IF demand is "low" THEN 3 alternative topics returned and shown in UI
- Research panel displays: intent badge, demand badge, trend badge, keyword clusters, FAQs, competitor gaps
- Result saved to `content_assets` with `asset_type = 'research'`

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [x]
- Next task: task-006.md
- Notes: 
  - All acceptance criteria met: API returns structured JSON with intent/demand/trend/keywords/faqs/competitors/gaps
  - Google Search parallelized for topic + tips queries
  - Claude analysis uses claude-sonnet-4-6 model per skill
  - Alternative topics generated automatically when demand is "low"
  - Results saved to content_assets with asset_type = "research"
  - UI displays all data with color-coded badges, accordion FAQs, and low-demand alerts
  - Auth via Supabase middleware (cookie-based, not Bearer tokens)
  - Error responses follow API design envelope format per skill
  - Code follows code-writing conventions: descriptive names, proper error handling, no magic strings
  - Files created: 
    - /lib/google-search.ts
    - /lib/prompts/research.ts
    - /app/api/research/route.ts
    - /components/sections/ResearchPanel.tsx
    - Updated /app/dashboard/research/page.tsx
  - Build verified (no compilation errors)
  - Ready for deployment
