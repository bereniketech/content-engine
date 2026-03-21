# TASK-006 — SEO Engine API + UI

## Session Bootstrap
Skills needed: code-writing-software-development, api-design, claude-developer-platform

## Objective
Build `POST /api/seo` and the SEO panel UI with scores, metadata, schemas, and copy buttons per field.

## Implementation Steps
1. Create `/lib/prompts/seo.ts` — Claude prompt that takes topic + research output and returns structured JSON:
   `{ title, metaDescription, slug, primaryKeyword, secondaryKeywords[], faqSchema, articleSchema, snippetAnswer, headingStructure, seoScore, keywordScore, rankingPotential }`
2. Create `/app/api/seo/route.ts`:
   - Accept `{ topic, research, keywords }`
   - Call Claude with SEO prompt; parse JSON response
   - Save to `content_assets` (`asset_type = 'seo'`)
   - Return full SEO object
3. Create `/components/sections/SEOPanel.tsx`:
   - Render each field (title, meta, slug, keywords) with individual copy buttons
   - SEO Strength Score as a progress bar (0–100, colour: red <40, amber <70, green ≥70)
   - Keyword Coverage Score as numeric badge
   - Ranking Potential as label chip (Low/Medium/High)
   - FAQ Schema and Article Schema in collapsible code blocks with copy button
4. Wire SEO page to call `/api/seo` after research completes (or manually via button)

## Acceptance Criteria
- `POST /api/seo` returns full SEO object (title, meta, slug, keywords, schemas, scores)
- SEO panel renders all fields with copy buttons per field
- SEO Strength Score shown as a progress bar (0–100)
- Keyword Coverage Score and Ranking Potential label displayed
- Result saved to `content_assets` with `asset_type = 'seo'`

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [ ]
- Next task: task-007.md
- Notes: ___
