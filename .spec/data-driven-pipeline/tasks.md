# Implementation Plan: Data-Driven Content Generation Pipeline

- [ ] 1. Types, interfaces, and database migration
  - Add `DataDrivenInputData`, `DeepResearchResult`, `AssessmentResult`, `SeoGeoResult`, `XCampaignOutput`, `MultiFormatOutput` to `types/index.ts`.
  - Extend `SessionInputType` to include `"data-driven"` and update `SessionInputData` union.
  - Create Supabase migration to update `sessions.input_type` check constraint.
  - _Requirements: 1, 2, 12_
  - _Skills: /code-writing-software-development (typed models), /database-migrations (Supabase migration)_
  - **AC:** All new types compile without errors. Migration SQL is valid and adds `'data-driven'` to the constraint.

- [ ] 2. PDF parsing utility
  - Install `pdf-parse` dependency.
  - Create `lib/pdf-parse.ts`: accept `Buffer`, extract text, enforce 80K char limit with truncation flag, reject image-only PDFs with helpful error, return `{ text, pageCount, wasTruncated }`.
  - Write unit tests for valid PDF, oversized PDF, and image-only PDF rejection.
  - _Requirements: 1.3_
  - _Skills: /code-writing-software-development (utility module), /tdd (unit tests first)_
  - **AC:** `lib/pdf-parse.ts` exports a function that extracts text from a PDF buffer. Unit tests pass for all three cases. `pdf-parse` is in `package.json`.

- [ ] 3. Deep research prompt and API route
  - Create `lib/prompts/deep-research.ts`: input is topic + NotebookLM findings, output is `DeepResearchResult` JSON schema.
  - Create `app/api/data-driven/research/route.ts`: accepts `{ topic?, sourceText?, sessionId? }`, integrates with NotebookLM API (capability selection based on topic), falls back to Google Search + Claude if NotebookLM unavailable, saves asset `dd_research`.
  - _Requirements: 4_
  - _Skills: /code-writing-software-development (API route), /api-design (REST patterns), /notebooklm (NotebookLM integration)_
  - **AC:** Route returns `DeepResearchResult` JSON. Asset saved as `dd_research`. Fallback to Google Search works when NotebookLM key is absent.

- [ ] 4. Context assessment API route
  - Create `app/api/data-driven/assess/route.ts`: accepts `{ sourceText, sessionId? }`, lightweight Claude call (~500 tokens) evaluating data sufficiency, returns `AssessmentResult`.
  - _Requirements: 3_
  - _Skills: /code-writing-software-development (API route), /api-design (REST patterns)_
  - **AC:** Route returns `{ sufficient, missingAreas, suggestedTopic }`. Sufficient data returns `true`, thin data returns `false` with populated `missingAreas`.

- [ ] 5. Data-driven article prompt and API route (streaming)
  - Create `lib/prompts/data-driven-article.ts`: input is sourceText and/or researchData, neutral informational style, NO tone, 2000-3500 word structured markdown.
  - Create `app/api/data-driven/article/route.ts`: accepts JSON `{ sourceText?, researchData?, sessionId }` or `multipart/form-data` (PDF upload), streams via SSE (reuse blog route pattern), saves asset `dd_article` with `{ markdown, wordCount }`.
  - _Requirements: 1, 5_
  - _Skills: /code-writing-software-development (streaming API route), /api-design (multipart handling)_
  - **AC:** Route streams markdown via SSE. Accepts both JSON and PDF upload. Asset saved as `dd_article`. No tone is applied. Word count is 2000-3500.

- [ ] 6. SEO+GEO prompt and API route
  - Create `lib/prompts/seo-geo.ts`: input is article markdown, output is `SeoGeoResult` JSON (SEO fields + GEO fields: citationOptimization, entityMarking, conciseAnswers, structuredClaims, sourceAttribution).
  - Create `app/api/data-driven/seo-geo/route.ts`: accepts `{ article, sessionId }`, non-streaming `createMessage()`, saves asset `dd_seo_geo`.
  - _Requirements: 6_
  - _Skills: /code-writing-software-development (API route), /api-design (REST patterns)_
  - **AC:** Route returns `SeoGeoResult` with both SEO and GEO sections populated. Asset saved as `dd_seo_geo`. No tone influence.

- [ ] 7. Multi-format prompt and API route
  - Create `lib/prompts/multi-format.ts`: input is article + seoGeo + tone paragraph, output is `MultiFormatOutput` JSON with blog, LinkedIn, Medium, newsletter — all tone-applied.
  - Create `app/api/data-driven/multi-format/route.ts`: accepts `{ article, seoGeo, tone, sessionId }`, non-streaming, saves 4 assets: `dd_blog`, `dd_linkedin`, `dd_medium`, `dd_newsletter`.
  - _Requirements: 7_
  - _Skills: /code-writing-software-development (API route), /api-design (REST patterns)_
  - **AC:** Route returns all 4 format outputs. Each saved as separate asset. Tone paragraph shapes all outputs. Newsletter includes subject line, preview text, body, and plain-text fallback.

- [ ] 8. X campaign prompt and API route
  - Create `lib/prompts/x-campaign.ts`: input is article + seoGeo + tone paragraph, output is `XCampaignOutput` JSON with exactly 10 posts (mystery/reveal_slow/reveal_full phases) + threadVariant.
  - Create `app/api/data-driven/x-campaign/route.ts`: accepts `{ article, seoGeo, tone, sessionId }`, non-streaming, saves asset `dd_x_campaign`.
  - _Requirements: 8_
  - _Skills: /code-writing-software-development (API route), /x-api (X platform patterns)_
  - **AC:** Route returns exactly 10 posts with correct phase distribution (1-3 mystery, 4-6 reveal_slow, 7-10 reveal_full). Posts 1-6 have `hasLink: false`. Posts 7-10 have `hasLink: true`. Content <= 280 chars. Thread variant included.

- [ ] 9. DataDrivenForm input component
  - Create `components/input/DataDrivenForm.tsx`: toggle between "I have data" (textarea + file upload for .txt/.md/.pdf) and "I have a topic" (text input), tone textarea with placeholder examples, validation (must have source data or topic, must have tone), submit creates `data-driven` session and navigates to pipeline page.
  - _Requirements: 1, 2, 11.2_
  - _Skills: /build-website-web-app (React component, Tailwind), /code-writing-software-development (form validation)_
  - **AC:** Form renders with data/topic toggle. File upload accepts .txt/.md/.pdf. Tone textarea present with placeholder. Validation blocks empty submissions. Submit creates session and navigates to `/dashboard/data-driven`.

- [ ] 10. DataDrivenStepper component and pipeline page
  - Create `components/sections/DataDrivenStepper.tsx`: reusable vertical stepper with collapsible step cards, status indicators (pending/in-progress/complete/error), regenerate button per step.
  - Create `app/dashboard/data-driven/page.tsx`: orchestrates the pipeline — determines steps based on input mode, auto-advances through steps sequentially, fires multi-format + X campaign in parallel after SEO+GEO, restores state from saved assets on reload.
  - _Requirements: 9_
  - _Skills: /build-website-web-app (React page, Tailwind), /code-writing-software-development (state management, API orchestration)_
  - **AC:** Stepper shows correct steps for each input mode. Steps auto-advance. Article step shows streaming preview. Multi-format and X campaign fire in parallel. Regenerate works per step. State persists across page reload via saved assets.

- [ ] 11. Output display pages (blog, LinkedIn, Medium, newsletter, X campaign)
  - Create 5 pages under `app/dashboard/data-driven/`: `blog/page.tsx`, `linkedin/page.tsx`, `medium/page.tsx`, `newsletter/page.tsx`, `x-campaign/page.tsx`.
  - Blog/LinkedIn/Medium: rendered with `react-markdown` + copy button.
  - Newsletter: subject line, preview text, body sections with per-section copy and "Copy Full HTML" button.
  - X Campaign: 10-post timeline, phase-coded cards (purple/amber/green), copy per post, "Copy All as Thread", link indicator.
  - _Requirements: 10_
  - _Skills: /build-website-web-app (React pages, Tailwind)_
  - **AC:** All 5 pages render their respective content from session assets. Copy buttons work. X campaign shows correct phase colors and link indicators.

- [ ] 12. Dashboard integration (Sidebar, tabs, history, SummaryPanel)
  - Modify `Sidebar.tsx`: add separator + "Data Pipeline" nav group with 6 items.
  - Modify `app/dashboard/page.tsx`: add "Data-Driven" tab, render `DataDrivenForm`, show "Data-Driven" badge with "Data"/"Topic" sub-badge in history.
  - Modify `SummaryPanel.tsx`: add `dd_research`, `dd_article`, `dd_seo_geo`, `dd_blog`, `dd_linkedin`, `dd_medium`, `dd_newsletter`, `dd_x_campaign` to `ASSET_CATALOG`.
  - _Requirements: 11_
  - _Skills: /build-website-web-app (React modifications, Tailwind)_
  - **AC:** Third tab appears on dashboard. Sidebar shows Data Pipeline group. History shows correct badges. SummaryPanel recognizes all `dd_*` asset types.

- [ ] 13. Build verification and integration smoke test
  - Run `npm run build` — fix any type errors or build failures.
  - Manual smoke test: verify topic-only flow, data-sufficient flow, and that existing topic/upload pipelines still work.
  - _Requirements: All_
  - _Skills: /code-writing-software-development (build verification)_
  - **AC:** `npm run build` passes with zero errors. Existing topic and upload flows are unaffected. All new routes respond correctly to well-formed requests.
