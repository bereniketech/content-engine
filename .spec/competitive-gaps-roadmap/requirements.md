# Requirements — Competitive Gaps Roadmap
**Feature slug:** competitive-gaps-roadmap  
**Format:** EARS (Easy Approach to Requirements Syntax)  
**Date:** 2026-04-28  
**Priority order:** R6 → R5 → R7 → R4 → R3 → R2 → R10 → R1 → R8 → R9

---

## Req 1 — Contextual Image Generation Pipeline (R6)

**Gap addressed:** 1.11 — Auto-generate social-ready images after article creation.

### Functional Requirements

**REQ-1.1** WHEN an article generation session completes, the system SHALL automatically invoke the image generation pipeline with the article title, intro paragraph, and primary keyword as context.

**REQ-1.2** WHERE the `@fal-ai/client` package is installed and `FAL_API_KEY` is present, the system SHALL generate a featured image at 1200×630 px suitable for OpenGraph/Twitter Cards.

**REQ-1.3** WHERE social card generation is requested, the system SHALL additionally generate a portrait card at 1080×1350 px suitable for Instagram and Pinterest.

**REQ-1.4** WHEN image generation fails, the system SHALL surface a non-blocking error badge in the Images panel and SHALL NOT halt article delivery.

**REQ-1.5** WHEN the user views the Images panel, the system SHALL display generated images alongside the existing prompt list with download buttons for each size variant.

**REQ-1.6** The system SHALL store generated image URLs in `content_assets` under `asset_type = 'image_generated'` linked to the current session.

**REQ-1.7** WHILE generation is in progress, the system SHALL show a loading skeleton in the Images panel.

### Non-Functional Requirements

**REQ-1.NF1** Image generation SHALL complete within 30 seconds per image; if exceeded, return a timeout error.

**REQ-1.NF2** All image URLs stored in Supabase SHALL be scoped by `user_id` via RLS (inherited from `sessions` join).

---

## Req 2 — URL Ingestion + Transcription (R5)

**Gap addressed:** 1.12 — Accept YouTube URLs, audio URLs, and web pages as content source inputs.

### Functional Requirements

**REQ-2.1** WHEN a user submits a YouTube URL (matching `youtube.com/watch?v=` or `youtu.be/`), the system SHALL fetch the transcript via `googleapis` YouTube Data API v3 and feed it into the existing article-upload pipeline as `input_type = 'upload'`.

**REQ-2.2** WHEN a user submits an audio file URL (mp3, wav, m4a), the system SHALL transcribe it using fal.ai Whisper endpoint and feed the transcript into the upload pipeline.

**REQ-2.3** WHEN a user submits a web page URL (non-YouTube, non-audio), the system SHALL scrape the `<body>` text content (stripping navigation, ads, scripts) and feed it as source text.

**REQ-2.4** WHERE URL type detection is ambiguous, the system SHALL attempt detection in order: YouTube pattern → audio extension → web scrape.

**REQ-2.5** WHEN transcription or scraping fails, the system SHALL return a structured error `{ code: 'ingestion_error', source: string, message: string }` with HTTP 422.

**REQ-2.6** The system SHALL expose a new `POST /api/ingest` route accepting `{ url: string, sessionId?: string }`.

**REQ-2.7** WHEN ingestion succeeds, the system SHALL store the extracted text in `content_assets` under `asset_type = 'source_transcript'` and return `{ sessionId, wordCount, preview: string }`.

**REQ-2.8** The existing `ArticleUpload` input component SHALL gain a URL input tab alongside the existing file upload tab.

### Non-Functional Requirements

**REQ-2.NF1** URLs SHALL be validated with a regex allowlist before any external HTTP call is made.

**REQ-2.NF2** Web scraping SHALL timeout after 15 seconds; transcription after 120 seconds.

---

## Req 3 — Per-Article ROI Dashboard (R7)

**Gap addressed:** 1.10 — Surface performance data per article in ContentLibrary view.

### Functional Requirements

**REQ-3.1** WHEN a user navigates to the Content Library, the system SHALL display a table of all sessions with columns: article title, publish date, GA4 organic clicks (28d), Search Console impressions (28d), average position, estimated traffic value, trend sparkline (14-day), and a "Needs Refresh" badge.

**REQ-3.2** WHERE `content_performance` rows exist for a session, the system SHALL compute 14-day click trend from those rows and render a sparkline using `recharts`.

**REQ-3.3** WHEN average position drops below a configurable threshold (default: rank > 20), the system SHALL display a "Needs Refresh" amber badge on that article row.

**REQ-3.4** WHERE GA4 data is not connected, the system SHALL show a "Connect GA4" prompt instead of metrics columns.

**REQ-3.5** WHEN the user clicks a row, the system SHALL navigate to the session's full output panel.

**REQ-3.6** The system SHALL expose a `GET /api/roi` route that aggregates `content_performance` + session metadata for all sessions of the authenticated user.

**REQ-3.7** WHEN a session has no analytics data, the system SHALL display `—` in metric columns rather than zero.

### Non-Functional Requirements

**REQ-3.NF1** The ROI API SHALL respond within 2 seconds by querying pre-aggregated `content_performance` rows (no live GA4 call on page load).

**REQ-3.NF2** The content library table SHALL be paginated at 25 rows per page.

---

## Req 4 — Scheduled Publishing Queue (R4)

**Gap addressed:** 1.7 — Calendar UI for scheduling articles to publish at future times.

### Functional Requirements

**REQ-4.1** WHEN the user navigates to the Schedule view, the system SHALL display a weekly calendar (7-column grid, current week by default) showing all `scheduled_posts` for the authenticated user.

**REQ-4.2** WHEN the user drags an article card to a calendar slot, the system SHALL update the `publish_at` timestamp in `scheduled_posts` via `PATCH /api/schedule/[id]`.

**REQ-4.3** Each calendar slot SHALL display article title, platform icon, and status badge (queued / publishing / published / failed).

**REQ-4.4** WHEN a `scheduled_post` reaches its `publish_at` time, the system SHALL fire an Inngest scheduled event `content/schedule.publish` which calls the existing `api/publish/` route per platform.

**REQ-4.5** WHEN a scheduled publish fails, the system SHALL set `status = 'failed'` with `error_details`, display a red badge, and offer a "Retry" button that resets `status = 'queued'` and re-enqueues.

**REQ-4.6** The system SHALL expose `POST /api/schedule` (create), `PATCH /api/schedule/[id]` (update time/status), and `DELETE /api/schedule/[id]` (cancel).

**REQ-4.7** WHEN the user creates a new scheduled post, the system SHALL enforce that `publish_at` is at least 5 minutes in the future.

**REQ-4.8** The `scheduled_posts` table (already created in migration `20260420_distribution_and_analytics_001.sql`) SHALL be extended with a `title` text column for display purposes.

### Non-Functional Requirements

**REQ-4.NF1** The Inngest function SHALL check due posts every minute using a cron schedule `"* * * * *"`.

**REQ-4.NF2** Drag-drop SHALL be implemented without additional npm packages using native HTML5 drag events.

---

## Req 5 — Brand Voice Profiles + Score (R3)

**Gap addressed:** 1.5 — Inject brand voice into every generation prompt and score alignment.

### Functional Requirements

**REQ-5.1** WHEN a user creates a Brand Voice Profile, the system SHALL store `{ name, tone_adjectives: string[], writing_samples: string[], forbidden_phrases: string[], formality_level: 'formal'|'casual'|'neutral' }` in a new `brand_voices` Supabase table.

**REQ-5.2** WHEN a user selects an active brand voice, the system SHALL inject its `tone_adjectives`, `writing_samples` (first 500 chars each), and `forbidden_phrases` into every Claude system prompt for that session.

**REQ-5.3** AFTER article generation completes, the system SHALL run a classifier Claude prompt that scores brand alignment 0–100 and returns a `{ score: number, violations: string[] }` object.

**REQ-5.4** WHEN the output panel renders, the system SHALL display dual score cards: SEO score (existing) + Brand Score with the same visual treatment.

**REQ-5.5** WHERE `violations` is non-empty, the system SHALL list them below the brand score card.

**REQ-5.6** The system SHALL expose `GET /api/brand-voice` (list), `POST /api/brand-voice` (create), `PUT /api/brand-voice/[id]` (update), `DELETE /api/brand-voice/[id]` (delete), and `POST /api/brand-voice/score` (score article).

**REQ-5.7** WHEN no brand voice is active, the system SHALL skip brand injection and hide brand score UI.

**REQ-5.8** A user MAY have at most 5 brand voice profiles.

### Non-Functional Requirements

**REQ-5.NF1** Brand voice scoring SHALL use `claude-haiku` to minimize token cost and latency (< 3 seconds).

**REQ-5.NF2** `writing_samples` SHALL be truncated to 2000 characters total across all samples when injected into prompts.

---

## Req 6 — Living Content Brief Artifact (R2)

**Gap addressed:** 1.2, 1.3 — Structured brief surfaced after research, editable before generation.

### Functional Requirements

**REQ-6.1** AFTER the research step completes, the system SHALL generate a structured `brief.md` artifact containing: target keyword, search intent, audience, suggested H1, H2 outline (5–8 sections), competitor gaps to address, recommended word count, and CTAs.

**REQ-6.2** WHEN the brief is generated, the system SHALL store it in a new `briefs` Supabase table linked to `session_id` with `status = 'draft'`.

**REQ-6.3** WHEN the output panel renders between research and generation steps, the system SHALL surface a `BriefCard` component showing the structured brief in an editable form.

**REQ-6.4** WHEN the user edits the brief and clicks "Save Brief", the system SHALL PATCH the `briefs` row and update `status = 'approved'`.

**REQ-6.5** WHEN the user clicks "Generate Article", the system SHALL read the approved brief from Supabase and inject it as additional context into the article generation Claude prompt.

**REQ-6.6** The system SHALL expose `POST /api/brief` (generate), `GET /api/brief?sessionId=` (fetch), and `PATCH /api/brief/[id]` (update).

**REQ-6.7** WHERE a brief already exists for a session, `POST /api/brief` SHALL update rather than duplicate.

### Non-Functional Requirements

**REQ-6.NF1** Brief generation SHALL run in the same pipeline SSE stream as research to avoid extra round trips.

**REQ-6.NF2** Brief text content SHALL not exceed 4000 tokens to keep injection cost manageable.

---

## Req 7 — Plagiarism + AI Detection Gate (R10)

**Gap addressed:** 1.13 — Originality and AI-detection scoring after generation.

### Functional Requirements

**REQ-7.1** AFTER article generation completes, the system SHALL call the Originality.ai API with the full article text and return `{ originalityScore: number, aiScore: number }`.

**REQ-7.2** WHEN `originalityScore < 90`, the system SHALL automatically trigger a rewrite prompt asking Claude to rephrase flagged sections, then re-score.

**REQ-7.3** WHEN the output panel renders, the system SHALL display badge indicators: green (≥90% original, ≤20% AI), amber (70–89% original or 21–40% AI), red (<70% original or >40% AI).

**REQ-7.4** WHERE the Originality.ai API key is not configured, the system SHALL skip detection and show a "Connect Originality.ai" CTA.

**REQ-7.5** WHEN auto-rewrite occurs, the system SHALL preserve the rewritten article as the active version in `content_assets`.

**REQ-7.6** The system SHALL expose `POST /api/detect` accepting `{ sessionId, text }` and returning detection scores.

**REQ-7.7** Detection results SHALL be stored in `content_assets` under `asset_type = 'detection_result'`.

### Non-Functional Requirements

**REQ-7.NF1** The auto-rewrite retry SHALL run at most once to avoid infinite loops.

**REQ-7.NF2** Detection API calls SHALL timeout after 30 seconds with a graceful fallback to "Detection unavailable".

---

## Req 8 — Inline AI Editor (R1)

**Gap addressed:** 1.4 — Context-aware inline editing of generated articles.

### Functional Requirements

**REQ-8.1** WHEN the article output is rendered, it SHALL be displayed inside a `ContentEditor` component built on Tiptap (ProseMirror) rather than a read-only markdown renderer.

**REQ-8.2** WHEN the user right-clicks a paragraph or types `/` at the start of a paragraph, the system SHALL display a context menu with actions: Rewrite, Expand, Shorten, Change Tone, Fix SEO, Add Statistic.

**REQ-8.3** WHEN the user selects an action, the system SHALL send the selected paragraph text plus the article context (title, keyword, target audience) to `POST /api/edit` and stream the response back into the editor.

**REQ-8.4** WHEN streaming completes, the system SHALL replace the selected paragraph with the rewritten version and push an undo entry to the editor history.

**REQ-8.5** WHEN "Fix SEO" is invoked, the system SHALL also re-run the SEO score after edit.

**REQ-8.6** WHEN "Change Tone" is invoked, the system SHALL present a sub-menu of tone options (professional, conversational, persuasive, empathetic) before firing the edit request.

**REQ-8.7** The editor content SHALL auto-save to `content_assets` (debounced 2 s) when modified.

**REQ-8.8** The system SHALL expose `POST /api/edit` accepting `{ paragraph, action, articleContext }` and streaming SSE text.

### Non-Functional Requirements

**REQ-8.NF1** Tiptap SHALL be installed as `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-slash-command` — no editor loaded on pages that don't render articles.

**REQ-8.NF2** Each inline edit SHALL operate only on the selected paragraph (not full article) to minimise token usage.

---

## Req 9 — Topical Authority Planner (R8)

**Gap addressed:** 1.3 — Generate a content cluster from a pillar keyword.

### Functional Requirements

**REQ-9.1** WHEN a user enters a pillar keyword and clicks "Build Cluster", the system SHALL call `POST /api/cluster` which invokes Claude to generate: 1 pillar article brief + 8–12 supporting article briefs.

**REQ-9.2** Each brief in the cluster SHALL include: keyword, search intent, estimated monthly volume (from Google Search API), keyword difficulty (1–100), suggested internal link target, and recommended publish order.

**REQ-9.3** WHEN the cluster is generated, the system SHALL store it in a new `content_clusters` Supabase table with status tracking per article (`pending` / `in_progress` / `published`).

**REQ-9.4** WHEN viewing a cluster, the system SHALL display completion percentage (published articles / total articles) and a recommended publish sequence.

**REQ-9.5** WHEN the user clicks "Generate" on an individual cluster brief, the system SHALL create a new session pre-loaded with that brief and navigate to the pipeline.

**REQ-9.6** The system SHALL expose `POST /api/cluster` (create cluster), `GET /api/cluster/[id]` (fetch), `PATCH /api/cluster/[id]/article/[articleId]` (update article status).

### Non-Functional Requirements

**REQ-9.NF1** Cluster generation SHALL complete within 45 seconds; use streaming SSE to show progress.

**REQ-9.NF2** A user MAY have at most 20 active clusters.

---

## Req 10 — Team Workspaces + Approval Workflow (R9)

**Gap addressed:** 1.6 — Multi-user collaboration with role-based approval workflow.

### Functional Requirements

**REQ-10.1** WHEN a user creates a workspace, the system SHALL create a row in `workspaces` table with `{ name, slug, owner_id }` and add the creator as `workspace_members` with `role = 'admin'`.

**REQ-10.2** WHEN an admin invites a user by email, the system SHALL create a pending `workspace_members` row. WHEN the invited user logs in, the membership SHALL activate.

**REQ-10.3** `workspace_members.role` SHALL be constrained to `writer | editor | admin`.

**REQ-10.4** WHEN a writer submits an article for review, the system SHALL create a `content_approvals` row with `status = 'review'` and send an email notification to all workspace editors/admins.

**REQ-10.5** WHEN an editor approves an article, the system SHALL update `content_approvals.status = 'approved'` and notify the writer.

**REQ-10.6** WHEN an editor requests changes, the system SHALL set `status = 'changes_requested'` and include a `feedback` text field.

**REQ-10.7** The content state machine SHALL enforce: `draft → review → approved → published` and `review → changes_requested → draft`.

**REQ-10.8** Writers SHALL only view their own content; editors/admins SHALL view all workspace content.

**REQ-10.9** The system SHALL expose: `POST /api/workspace`, `GET /api/workspace/[id]/members`, `POST /api/workspace/[id]/invite`, `POST /api/approval`, `PATCH /api/approval/[id]`.

**REQ-10.10** Email notifications SHALL be sent via Supabase Edge Function calling an email provider (Resend or SendGrid).

### Non-Functional Requirements

**REQ-10.NF1** All workspace data SHALL be protected by RLS policies that check `workspace_members` membership.

**REQ-10.NF2** A single workspace SHALL support at most 25 members.

**REQ-10.NF3** This feature SHALL be gated behind a `workspace_enabled` feature flag until fully tested.
