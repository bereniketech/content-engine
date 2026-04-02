# Requirements: Data-Driven Content Generation Pipeline

## Introduction

The data-driven pipeline is a new content generation flow that runs **parallel to** the existing topic-based and upload-based pipelines. It accepts either **raw source data** (text/PDF) or **just a topic** as input, paired with a **free-form tone paragraph** (not the existing `TopicTone` enum). Content flows through three iterations: neutral article generation, SEO+GEO optimization, and tone-applied multi-format output with a strategic 10-post X hype campaign. When source data is thin or absent, an enhanced deep research step gathers material before article generation.

---

## Requirements

### Requirement 1: Dual Input Mode

**User Story:** As a user, I want to provide either raw source data (text or PDF) or just a topic name, so that the system can generate a comprehensive article from whatever starting material I have.

#### Acceptance Criteria

1. WHEN user selects "I have data" mode THEN the system SHALL accept raw text via textarea OR a file upload (`.txt`, `.md`, `.pdf`).
2. WHEN user selects "I have a topic" mode THEN the system SHALL accept a topic string via text input.
3. WHEN user uploads a PDF THEN the system SHALL extract text content, enforce an 80,000 character limit (truncating with a flag if exceeded), and reject image-only PDFs with a helpful error message.
4. IF neither source data nor topic is provided THEN the system SHALL block submission with a validation error.
5. The system SHALL create a session with `input_type: 'data-driven'` upon form submission.

---

### Requirement 2: Free-Form Tone Paragraph

**User Story:** As a user, I want to describe my desired writing tone in my own words (a free paragraph), so that the final outputs match my brand voice exactly rather than being limited to preset options.

#### Acceptance Criteria

1. WHEN user enters the data-driven flow THEN the system SHALL present a textarea for a free-form tone paragraph.
2. IF tone paragraph is empty THEN the system SHALL block submission with a validation error.
3. WHEN content is generated THEN the tone paragraph SHALL be applied ONLY to Iteration 3 outputs (blog, LinkedIn, Medium, X campaign) — NOT to the article (Iteration 1) or SEO+GEO (Iteration 2).

---

### Requirement 3: Context Sufficiency Assessment

**User Story:** As a user who provided source data, I want the system to assess whether my data is rich enough to write authoritatively, so that thin data gets automatically enriched with research.

#### Acceptance Criteria

1. WHEN user provides source data THEN the system SHALL run a lightweight AI assessment evaluating whether the data contains sufficient context (pain points, market data, statistics, competitive landscape, actionable insights).
2. WHEN assessment returns `sufficient: true` THEN the system SHALL skip deep research and proceed directly to article generation.
3. WHEN assessment returns `sufficient: false` THEN the system SHALL automatically trigger the deep research step using the `suggestedTopic` derived from the source data.
4. WHEN assessment completes THEN it SHALL return `{ sufficient: boolean, missingAreas: string[], suggestedTopic: string }`.

---

### Requirement 4: Deep Research (Enhanced)

**User Story:** As a user who provided only a topic (or thin data), I want the system to perform deep research gathering detailed findings, statistics, expert opinions, and case studies, so that the resulting article is comprehensive and authoritative.

#### Acceptance Criteria

1. WHEN user provides only a topic (no source data) THEN the system SHALL trigger deep research automatically.
2. WHEN user provides source data assessed as insufficient THEN the system SHALL trigger deep research using the suggested topic.
3. WHEN deep research runs THEN the system SHALL use Google NotebookLM's programmatic API to:
   a. Create a notebook with the topic/source data as a source.
   b. Select and run the appropriate NotebookLM capabilities based on the article's needs:
      - **Deep Research** — comprehensive investigation of the topic, synthesizing multiple angles and evidence.
      - **Competitive Intel** — identify competitors, market positioning, strengths/weaknesses, and differentiation opportunities.
      - **Market Synthesis** — aggregate market data, sizing, segments, growth drivers, and demand signals.
      - **Due Diligence** — verify claims, cross-reference sources, flag risks and inconsistencies.
      - **Literature Review** — survey existing publications, studies, and expert commentary on the topic.
      - **Trend Spotting** — identify emerging patterns, shifts, and forward-looking signals.
   c. The system SHALL determine which capabilities to invoke based on the topic and context assessment (e.g., a product comparison article triggers Competitive Intel + Due Diligence; an industry outlook triggers Market Synthesis + Trend Spotting; a general explainer triggers Deep Research + Literature Review).
   d. Extract and merge structured findings from all generated artifacts.
4. WHEN deep research completes THEN it SHALL produce structured JSON: `{ summary, keyFindings[], statistics[], expertInsights[], caseStudies[], controversies[], trends[], gaps[], sourceUrls[], capabilitiesUsed[] }`.
5. WHEN deep research output is available THEN it SHALL be saved as asset type `dd_research`.

---

### Requirement 5: Neutral Article Generation (Iteration 1)

**User Story:** As a user, I want a 2000-3500 word structured article generated from my data and/or research findings, so that I have a high-quality informational base to repurpose.

#### Acceptance Criteria

1. WHEN article generation runs THEN it SHALL accept source data, research data, or both as input.
2. WHEN both source data AND research are provided THEN the article SHALL synthesize both (data-enriched mode).
3. The article SHALL be written in a neutral, informational style — NO tone applied at this stage.
4. WHEN article generation runs THEN the system SHALL stream the response via SSE (same pattern as existing blog endpoint).
5. WHEN article completes THEN it SHALL be 2000-3500 words of structured markdown identifying core thesis, key findings, and supporting evidence.
6. WHEN article completes THEN it SHALL be saved as asset type `dd_article` with `{ markdown, wordCount }`.

---

### Requirement 6: SEO + GEO Optimization (Iteration 2)

**User Story:** As a user, I want my article optimized for both traditional search engines (SEO) and AI search engines (GEO), so that my content ranks well in Google AND gets cited by ChatGPT, Perplexity, and Google AI Overviews.

#### Acceptance Criteria

1. WHEN SEO+GEO optimization runs THEN it SHALL accept the generated article as input.
2. WHEN SEO analysis completes THEN it SHALL produce: title, meta description, slug, primary keyword, secondary keywords, heading structure (H2/H3), FAQ schema, and SEO score (0-100).
3. WHEN GEO analysis completes THEN it SHALL produce:
   - `citationOptimization` — key statements rewritten to be citation-worthy for AI engines.
   - `entityMarking` — key entities with clear descriptions for AI authority identification.
   - `conciseAnswers` — direct Q&A pairs optimized for AI Overview snippets.
   - `structuredClaims` — factual claims formatted for easy AI extraction.
   - `sourceAttribution` — suggested attribution text for AI engine citations.
4. WHEN SEO+GEO completes THEN results SHALL be saved as asset type `dd_seo_geo`.
5. The tone paragraph SHALL NOT influence SEO+GEO output.

---

### Requirement 7: Multi-Format Output with Tone (Iteration 3)

**User Story:** As a user, I want my article repurposed into platform-specific formats (blog, LinkedIn, Medium) with my custom tone applied, so that I have publish-ready content for each platform.

#### Acceptance Criteria

1. WHEN multi-format generation runs THEN it SHALL accept article, SEO+GEO results, and the user's tone paragraph as input.
2. WHEN multi-format completes THEN it SHALL produce four distinct outputs:
   - **Blog:** Web-optimized post with SEO/GEO enhancements baked in, internal linking placeholders.
   - **LinkedIn:** Professional article with hook opening, strategic line breaks, no hashtag spam.
   - **Medium:** Medium-specific formatting with subtitle, pull quotes, section breaks, reading-time-appropriate length.
   - **Email Newsletter:** Subject line, preview text, email body with sections (hook, key insights, CTA), plain-text fallback, suitable for Substack/Mailchimp/ConvertKit.
3. The user's tone paragraph SHALL shape all four outputs.
4. WHEN multi-format completes THEN four assets SHALL be saved: `dd_blog`, `dd_linkedin`, `dd_medium`, `dd_newsletter`.

---

### Requirement 8: X Hype Campaign (Iteration 3)

**User Story:** As a user, I want a strategic 10-post X campaign that builds mystery and anticipation before revealing my content, so that I maximize engagement and clicks.

#### Acceptance Criteria

1. WHEN X campaign generation runs THEN it SHALL accept article, SEO+GEO results, and the user's tone paragraph as input.
2. WHEN X campaign completes THEN it SHALL produce exactly 10 posts following a hype arc:
   - **Posts 1-3 (mystery):** Provocative questions, bold claims without context, "something big is coming" energy, NO links.
   - **Posts 4-6 (slow reveal):** Tease specific insights from the article, share one surprising stat/fact, build anticipation, NO links.
   - **Posts 7-10 (full reveal):** Share the content directly, link to blog, include CTA and summary.
3. Each post SHALL include: `postNumber`, `phase` (mystery/reveal_slow/reveal_full), `content` (<=280 chars), `purpose`, `scheduleSuggestion`, `hashtags[]`, `hasLink` (boolean).
4. WHEN X campaign completes THEN it SHALL also produce a `threadVariant` — all 10 posts as a connected thread alternative.
5. WHEN X campaign completes THEN results SHALL be saved as asset type `dd_x_campaign`.

---

### Requirement 9: Pipeline Stepper UX

**User Story:** As a user, I want to see a visual vertical stepper showing my pipeline progress with status indicators and content previews, so that I can track the generation process and regenerate individual steps.

#### Acceptance Criteria

1. WHEN user submits the data-driven form THEN the system SHALL navigate to a pipeline page showing a vertical stepper.
2. The stepper steps SHALL vary based on input mode:
   - **Data mode (sufficient):** Article -> SEO+GEO -> Multi-format + X Campaign.
   - **Data mode (insufficient):** Assess -> Deep Research -> Article -> SEO+GEO -> Multi-format + X Campaign.
   - **Topic mode:** Deep Research -> Article -> SEO+GEO -> Multi-format + X Campaign.
3. Each step SHALL show a status indicator: pending / in-progress / complete / error.
4. WHEN a step completes THEN its content preview SHALL be displayed in a collapsible card.
5. WHEN the article step is in-progress THEN the system SHALL show a streaming markdown preview.
6. WHEN SEO+GEO completes THEN Multi-format and X Campaign SHALL fire in parallel.
7. Each completed step SHALL have a "Regenerate" button.
8. WHEN user reloads the page THEN the stepper SHALL restore state from saved assets.

---

### Requirement 10: Output Display Pages

**User Story:** As a user, I want dedicated pages to view and copy each generated output, so that I can review and use them individually.

#### Acceptance Criteria

1. WHEN user navigates to `/dashboard/data-driven/blog` THEN the system SHALL render the blog post with `react-markdown` and a copy button.
2. WHEN user navigates to `/dashboard/data-driven/linkedin` THEN the system SHALL render the LinkedIn article with a copy button.
3. WHEN user navigates to `/dashboard/data-driven/medium` THEN the system SHALL render the Medium article with a copy button.
4. WHEN user navigates to `/dashboard/data-driven/newsletter` THEN the system SHALL render the email newsletter with subject line, preview text, and body — with copy buttons for each section and a "Copy Full HTML" option.
5. WHEN user navigates to `/dashboard/data-driven/x-campaign` THEN the system SHALL show a 10-post timeline view with:
   - Color-coded phase badges: mystery (purple), slow reveal (amber), full reveal (green).
   - Each post card showing: number, phase badge, content, purpose note, schedule suggestion, hashtags.
   - Copy button per post.
   - "Copy All as Thread" button for the thread variant.
   - Visual indicator showing which posts have links.

---

### Requirement 11: Dashboard Integration

**User Story:** As a user, I want the data-driven pipeline accessible from the existing dashboard alongside topic and upload modes, so that I can choose my preferred workflow from one place.

#### Acceptance Criteria

1. WHEN dashboard loads THEN a third tab "Data-Driven" SHALL appear alongside "Topic" and "Upload".
2. WHEN "Data-Driven" tab is selected THEN the `DataDrivenForm` component SHALL render.
3. WHEN sidebar renders THEN a "Data Pipeline" navigation group SHALL appear with items: Data Pipeline (stepper), Blog, LinkedIn, Medium, Newsletter, X Campaign.
4. WHEN session history loads THEN data-driven sessions SHALL show a "Data-Driven" badge with a "Data" or "Topic" sub-badge indicating the input mode.
5. WHEN the SummaryPanel renders THEN it SHALL recognize the new asset types: `dd_research`, `dd_article`, `dd_seo_geo`, `dd_blog`, `dd_linkedin`, `dd_medium`, `dd_newsletter`, `dd_x_campaign`.

---

### Requirement 12: Database Schema Update

**User Story:** As a developer, I need the database schema updated to support the new input type, so that data-driven sessions are persisted correctly.

#### Acceptance Criteria

1. WHEN database migration runs THEN the `sessions.input_type` check constraint SHALL be updated to allow `'data-driven'` in addition to `'topic'` and `'upload'`.
2. The system SHALL store all new asset types (`dd_research`, `dd_article`, `dd_seo_geo`, `dd_blog`, `dd_linkedin`, `dd_medium`, `dd_x_campaign`) in the existing `content_assets` table with no schema changes beyond the session constraint.

---

## Open Questions

_None — the spec is comprehensive and all design decisions are documented in `.spec/data-driven-pipeline.md`._
