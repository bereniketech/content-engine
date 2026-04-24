# Requirements: Brand Kit & Newsjacking System

**Date:** 2026-04-24  
**Status:** Phase 1 — Requirements Document  
**Feature:** brand-kit-newsjacking

---

## Introduction

The content engine needs two interconnected systems to enable clients to generate on-brand, platform-specific content at scale:

1. **Brand Kit** — a living, version-controlled profile of a client's brand (visual identity, content pillars, tone of voice, platform-specific rules, performance benchmarks) that informs every piece of content generated
2. **Newsjacking Toolkit** — a trending topic engine that identifies topics relevant to the client's niche and generates cross-platform, brand-aligned content in response

Both systems feed into a **continuous feedback loop** where performance metrics from posted content automatically update and refine the brand kit over time, creating a self-optimizing content strategy engine.

---

## Requirements

### Requirement 1: Brand Kit Builder — Visual Identity

**User Story:** As a client, I want to define my brand's visual identity (colors, typography, logo, imagery style, spacing rules) so that all generated content reflects my brand visually.

#### Acceptance Criteria

1. WHEN a client creates a new brand kit THEN the system SHALL display a form with sections for: color palette, typography, logo URLs, imagery style, and spacing system.
2. WHEN a client enters hex color codes for primary, secondary, accent, and neutral colors THEN the system SHALL store and validate each color code format.
3. WHEN a client specifies heading font, body font, and size scale THEN the system SHALL store typography settings as structured data (font family, weights, sizes).
4. WHEN a client uploads or references logo lockup, wordmark, and icon URLs THEN the system SHALL store logo references and display them in brand kit preview.
5. WHEN a client selects imagery style (e.g., "minimalist", "vibrant", "documentary") THEN the system SHALL store the selection.
6. WHEN a client defines grid rules, padding standards, and responsive breakpoints THEN the system SHALL store spacing rules as structured data.
7. WHEN a client saves visual identity settings THEN the system SHALL persist them to the active brand kit version.

---

### Requirement 2: Brand Kit Builder — Content Identity

**User Story:** As a client, I want to define my brand's content identity (positioning, tone, pillars, audience, key messages, writing rules) so that generated content uses my brand voice.

#### Acceptance Criteria

1. WHEN a client fills in positioning statement (2 sentences: what they stand for, who they help, why different) THEN the system SHALL store and display it in brand kit summary.
2. WHEN a client selects tone descriptors (bold/cautious, formal/casual, technical/accessible, vulnerable/confident, etc.) THEN the system SHALL store selected descriptors as tags.
3. WHEN a client enters 3–5 content pillars (core topics they own) THEN the system SHALL store pillars as a searchable list.
4. WHEN a client defines audience ICP (ideal customer profile, problems, language, psychographics) THEN the system SHALL store audience definition as structured data.
5. WHEN a client enters 5–7 key messages (non-negotiable talking points) THEN the system SHALL store messages as a list.
6. WHEN a client enters banned words/phrases (what they'd never say) THEN the system SHALL store as a list for generation guardrails.
7. WHEN a client sets writing rules (sentence length preference, paragraph structure, emoji use, contractions, em-dashes) THEN the system SHALL store as structured rules.
8. WHEN a client saves content identity settings THEN the system SHALL persist them to the active brand kit version.

---

### Requirement 3: Brand Kit Builder — Platform-Specific Overrides

**User Story:** As a client, I want to customize my brand voice and content rules for each platform (LinkedIn, X, Instagram, Reddit, Email) so that generated content is algorithm-optimized while staying on-brand.

#### Acceptance Criteria

1. WHEN a client views platform overrides THEN the system SHALL display tabs or sections for each platform: LinkedIn, X, Instagram, Reddit, Email.
2. WHEN a client edits platform overrides for LinkedIn THEN the system SHALL allow customization of: voice variation, content rules (50-word hook, save-optimization, format preferences, posting window, frequency target).
3. WHEN a client edits platform overrides for X THEN the system SHALL allow customization of: voice variation, thread structure rules, format preferences, posting window, frequency target.
4. WHEN a client edits platform overrides for Instagram THEN the system SHALL allow customization of: voice variation, carousel structure rules (7-slide standard), format preferences, posting window, frequency target.
5. WHEN a client edits platform overrides for Reddit THEN the system SHALL allow customization of: voice variation, subreddit conventions, format preferences, posting window, frequency target.
6. WHEN a client edits platform overrides for Email THEN the system SHALL allow customization of: voice variation, subject line style, segmentation strategy, CTA preferences, posting window (send day/time), frequency target.
7. WHEN a client saves platform overrides THEN the system SHALL persist them to the active brand kit version.

---

### Requirement 4: Brand Kit Builder — Performance Benchmarks

**User Story:** As a client, I want to track historical performance metrics per platform so that the system can learn what content performs best and optimize future content accordingly.

#### Acceptance Criteria

1. WHEN a client views performance benchmarks THEN the system SHALL display a section per platform (LinkedIn, X, Instagram, Reddit, Email).
2. WHEN a client enters historical best-performing formats (e.g., "carousels get 2.5x saves on Instagram") THEN the system SHALL store as text reference.
3. WHEN a client enters historical best-performing topics THEN the system SHALL store as a list per platform.
4. WHEN a client enters current audience metrics (followers, subscribers, email list size) THEN the system SHALL store as numbers.
5. WHEN a client enters target metrics (monthly impressions, engagement rate, conversion rate, email open rate) THEN the system SHALL store as KPI targets per platform.
6. WHEN a client saves benchmark settings THEN the system SHALL persist them to the active brand kit version.

---

### Requirement 5: Brand Kit Versioning & Approval

**User Story:** As a client, I want my brand kit changes to be versioned and approved so that I can track how my brand evolves and revert to previous versions if needed.

#### Acceptance Criteria

1. WHEN a client creates a brand kit THEN the system SHALL assign version = 1 and created_at timestamp.
2. WHEN a client modifies any section (visual, content, platforms, benchmarks) THEN the system SHALL mark the brand kit as modified but not increment the version until approval.
3. WHEN a client clicks "Approve & Save" THEN the system SHALL increment the version number and set approved_at timestamp.
4. WHEN a client views brand kit history THEN the system SHALL display all versions with timestamps, approval status, and a diff of changes.
5. WHEN a client clicks "Revert to Version X" THEN the system SHALL load that version's data and allow re-approval as a new version.
6. WHEN a client marks a brand kit as "Active" THEN the system SHALL use that brand kit version for all new content generation.

---

### Requirement 6: Newsjacking Topic Sourcing

**User Story:** As a client, I want the system to automatically identify trending topics relevant to my niche so that I can generate timely, on-brand content without manually searching for trends.

#### Acceptance Criteria

1. WHEN a client clicks "Generate Newsjacking Topics" THEN the system SHALL query trending topic sources (X Trends API, NewsAPI, industry-specific feeds, or manual input).
2. WHEN the system gathers trending topics THEN it SHALL filter for topics matching client's content pillars (relevance scoring).
3. WHEN the system filters topics THEN it SHALL score by: relevance (keyword match), momentum (velocity), and opportunity (low competition).
4. WHEN filtering is complete THEN the system SHALL display top 5–10 trending topics with: title, source, relevance score, momentum score, context/description.
5. WHEN a topic becomes stale (no longer trending) THEN the system SHALL mark it as expired and remove from display after a configurable TTL.
6. WHEN a client is not interested in suggested topics THEN the system SHALL allow manual topic entry.

---

### Requirement 7: Newsjacking Content Generation

**User Story:** As a client, I want the system to generate brand-aligned, platform-specific content for a trending topic so that I can post timely content across all platforms without writing from scratch.

#### Acceptance Criteria

1. WHEN a client selects a newsjacking topic THEN the system SHALL generate content for all platforms: LinkedIn, X, Instagram, Reddit, Email.
2. WHEN generating LinkedIn content THEN the system SHALL: reference the trend in the first 50 words (hook), contextualize (don't summarize), answer "so what?" in one sentence, apply platform rules (50-word hook, save-optimization, first-person voice, line breaks), and suggest posting within 24–48 hours of trend peak.
3. WHEN generating X content THEN the system SHALL: react within hours, use real-time voice, format as standalone tweet or thread (2–3 tweets max), reference trend + angle in hook, apply platform rules (brevity, thread structure, engagement patterns).
4. WHEN generating Instagram content THEN the system SHALL: create 7-slide carousel (4:5 aspect ratio), slide 1 = scroll-stopping hook (≤12 words), slides 2–6 = one insight per slide (2–3 lines max), slide 7 = strong CTA, apply platform rules (visual rhythm, direct tone, save-optimization).
5. WHEN generating Reddit content THEN the system SHALL: select appropriate subreddits based on topic, format as question/discussion/link per community norms, apply platform rules (community respect, subreddit conventions, conversation tone), and avoid salesy language.
6. WHEN generating Email content THEN the system SHALL: write educationally (not sell-focused), explain trend relevance, suggest next action, apply platform rules (subject line style, segmentation-ready, CTA clarity), and offer optional list segmentation.
7. WHEN content is generated THEN the system SHALL display all platform variants in an editor for client review.

---

### Requirement 8: Content Editor & Distribution

**User Story:** As a client, I want to review, edit, and post generated content so that I can make final adjustments before distribution and post exactly what I approve.

#### Acceptance Criteria

1. WHEN generated content is displayed THEN the system SHALL show all platform variants in separate, editable text fields (one per platform).
2. WHEN a client edits a variant THEN the system SHALL save the edited version separately from the generated version and track both.
3. WHEN a client clicks "Post All" or "Post Selected Platforms" THEN the system SHALL: validate content against platform-specific rules, post via each platform's API, record posted_at timestamp, and mark post status as "posted".
4. WHEN a post is successfully posted THEN the system SHALL store a record linking generated content → platform variants → posted versions for analytics.
5. WHEN posting fails on any platform THEN the system SHALL display error reason, allow retry, and log the failure.
6. WHEN a post is posted THEN the system SHALL display a summary showing which platforms succeeded and link to each post.

---

### Requirement 9: Performance Metrics Ingestion

**User Story:** As a client, I want to enter performance metrics (impressions, saves, engagement) from each platform so that the system can learn what content performs best and refine my brand kit.

#### Acceptance Criteria

1. WHEN a post has been live for a collection window (e.g., 24 hours, 7 days — configurable per platform) THEN the system SHALL show a "Record Metrics" button.
2. WHEN a client clicks "Record Metrics" THEN the system SHALL display a form with fields for each platform: impressions, saves, likes, comments, shares, clicks, conversions.
3. WHEN a client enters metrics and clicks "Save" THEN the system SHALL: validate numeric inputs, store metrics linked to the post, and record recorded_at timestamp and recorded_by_user_id.
4. WHEN a client enters metrics THEN the system SHALL NOT require interpretation — client enters only raw numbers from platform analytics.
5. WHEN metrics are recorded THEN the system SHALL automatically invoke the feedback loop (Requirement 10).

---

### Requirement 10: Feedback Loop & Brand Kit Auto-Updates

**User Story:** As a client, I want the system to interpret performance metrics and automatically suggest brand kit refinements so that my content strategy continuously improves based on data.

#### Acceptance Criteria

1. WHEN metrics are recorded for a post THEN the system SHALL analyze: which elements worked (hook? format? tone? topic?), which platforms resonated most, what patterns emerge.
2. WHEN analysis is complete THEN the system SHALL generate insights: e.g., "vulnerable voice +20% saves on LinkedIn", "carousel format outperforms single image on Instagram".
3. WHEN insights are generated THEN the system SHALL suggest specific brand kit updates: tone adjustments per platform, content pillar priority shifts, platform-specific rules refinements, performance benchmark updates.
4. WHEN suggestions are generated THEN the system SHALL display them to the client with: insight text, impact metric (e.g., +15% improvement), confidence score (0–1), and recommendation for which brand kit field to update.
5. WHEN a client reviews a suggestion THEN they SHALL be able to: approve (apply to active brand kit), reject (dismiss), or edit (modify recommendation before applying).
6. WHEN a client approves a suggestion THEN the system SHALL: apply the change, increment the brand kit version, log the change reason ("Performance feedback: vulnerable voice +20% saves"), and set the updated brand kit as active.
7. WHEN multiple suggestions are pending THEN the system SHALL prioritize by confidence score and impact metric.

---

### Requirement 11: Content Generation (Standard Topic)

**User Story:** As a client, I want to generate content for a custom topic or article (not newsjacking) so that I can create on-brand content for planned topics.

#### Acceptance Criteria

1. WHEN a client clicks "Generate Content" (not newsjacking) THEN the system SHALL display a form: topic text, optional article URL, optional topic description.
2. WHEN a client enters a topic and clicks "Generate" THEN the system SHALL: load the active brand kit, generate content for all platforms using that brand kit, and display all variants in the editor.
3. WHEN content is generated THEN the system SHALL apply the same platform-specific rules as newsjacking generation (Requirement 7).
4. WHEN content is generated THEN the system SHALL allow editing, posting, and metrics collection (Requirements 8, 9, 10) identically to newsjacking flows.

---

### Requirement 12: Multi-Workspace & Multi-Client Isolation

**User Story:** As the platform, I want each client's brand kit, content, and metrics to be completely isolated so that data security and privacy are guaranteed.

#### Acceptance Criteria

1. WHEN a user logs into a workspace THEN the system SHALL load only that workspace's brand kits, generated content, and metrics.
2. WHEN a user attempts to access another workspace's data THEN the system SHALL return 403 Forbidden and log the attempt.
3. WHEN brand kit queries, content generation, or metrics ingestion occur THEN the system SHALL filter by workspace_id at the database level.
4. WHEN displaying data in any UI THEN the system SHALL ensure workspace_id is included in every query filter.

---

## Design Decisions Flagged for Approval

### [OPEN QUESTION 1: Newsjacking Topic Sources]
The spec mentions "X Trends API, NewsAPI, industry-specific feeds, or manual input" but does not specify:
- Which sources are highest priority in Phase 1?
- Should all be integrated in Phase 1, or should some be deferred?
- Should clients be able to configure their own RSS feeds per industry?

**Assumption for Phase 1:** Integrate X Trends API (real-time, easiest implementation) + NewsAPI (industry keyword filtering) + manual topic entry. Defer custom RSS feed configuration to Phase 2.

### [OPEN QUESTION 2: Metrics Collection Window]
The spec mentions "a collection window (e.g., 24 hours, 7 days — configurable per platform)" but does not specify:
- Should the system auto-prompt clients after the window closes, or should they manually record?
- Should the system support historical metrics backfill (recording metrics days/weeks after posting)?

**Assumption for Phase 1:** Manual collection — clients enter metrics when they choose. Auto-prompt deferred to Phase 2.

### [OPEN QUESTION 3: Brand Kit Feedback Loop Cadence]
The spec mentions continuous updates but does not specify:
- Should feedback loop suggestions be generated immediately upon metrics entry, or batched daily/weekly?
- Should there be a minimum confidence threshold before suggesting updates (e.g., only suggest if confidence >0.8)?

**Assumption for Phase 1:** Generate immediately upon metrics entry. Minimum confidence threshold = 0.7 (client can override).

### [OPEN QUESTION 4: Platform-Specific Content Rules Detail Level]
Requirement 3 lists content rules but does not specify exact structure. For example:
- LinkedIn "50-word hook rule" — should this be a boolean flag, a numeric limit, or a checklist rule in generation?
- Should platform rules be enforced as hard constraints (reject content that violates) or soft suggestions (warn but allow)?

**Assumption for Phase 1:** Soft suggestions — generation uses rules as guidance; client can edit regardless. Hard enforcement deferred to Phase 2.

---

## Summary

This spec covers the full brand kit + newsjacking lifecycle:
- **Brand kit definition** (visual, content, platform rules, benchmarks) with versioning
- **Newsjacking** (trending topic sourcing + generation)
- **Standard content generation** (custom topic)
- **Distribution** (editing + posting)
- **Metrics collection** (client enters raw numbers)
- **Feedback loop** (engine interprets → suggests brand kit updates)
- **Data isolation** (multi-workspace security)

All requirements are testable. Open questions are flagged with reasonable Phase 1 assumptions.

---

**Next Step:** Please review and reply **'approved'** to continue to the design phase.
