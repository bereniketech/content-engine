# Tasks — Competitive Gaps Roadmap
**Feature slug:** competitive-gaps-roadmap  
**Date:** 2026-04-28  
**Total tasks:** 52  
**Order:** R6 → R5 → R7 → R4 → R3 → R2 → R10 → R1 → R8 → R9

Each task is sized 2–5 minutes of focused AI execution. All tasks are Haiku-runnable.

---

## R6 — Contextual Image Generation Pipeline

### TASK-001 · Extend api/images/route.ts to auto-generate featured image after article save
_Requirements:_ REQ-1.1, REQ-1.6  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`, `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** POST /api/images accepts optional `autoGenerate: true` flag; when set, after saving image prompts calls /api/images/generate with hero prompt; stores result in content_assets as asset_type='image_generated'; returns { sessionId, imageUrl, asset }.

### TASK-002 · Add fal.ai social card generation (1200×630 + 1080×1350) to image pipeline
_Requirements:_ REQ-1.2, REQ-1.3  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** New helper `lib/fal-images.ts` exports `generateSocialCards(prompt, sessionId)` that calls `@fal-ai/client` for both sizes; returns `{ featured: string; portrait: string }` URLs; FAL_API_KEY missing returns structured error.

### TASK-003 · Add loading skeleton and download buttons to ImagesPanel
_Requirements:_ REQ-1.5, REQ-1.7  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`, `.kit/skills/development/build-website-web-app/SKILL.md`  
**AC:** ImagesPanel.tsx shows skeleton while autoGenerate is in flight; after completion, renders generated image with "Download Featured" (1200×630) and "Download Portrait" (1080×1350) buttons; error badge shown on failure without blocking article display.

### TASK-004 · Unit test for image pipeline auto-generation path
_Requirements:_ REQ-1.4  
_Skills:_ `.kit/skills/testing-quality/tdd-workflow/SKILL.md`  
**AC:** Jest test covers: (a) successful auto-generation returns 201 with imageUrl, (b) fal.ai timeout returns non-blocking error object, (c) missing FAL_API_KEY returns 500 without crashing pipeline.

---

## R5 — URL Ingestion + Transcription

### TASK-005 · Create lib/ingest/detect-url-type.ts for URL classification
_Requirements:_ REQ-2.4  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `detectUrlType(url: string): 'youtube' | 'audio' | 'web' | 'invalid'` exported; YouTube pattern matches `youtube.com/watch?v=` and `youtu.be/`; audio matches `.mp3|.wav|.m4a|.ogg` extension; invalid for non-HTTP; Jest tests cover all four branches.

### TASK-006 · Create lib/ingest/youtube.ts — fetch transcript via googleapis
_Requirements:_ REQ-2.1  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `fetchYouTubeTranscript(url: string): Promise<string>` uses `googleapis` youtube.captions.list; returns cleaned text; throws `IngestionError` on missing captions or API failure; GOOGLE_SEARCH_API_KEY required.

### TASK-007 · Create lib/ingest/audio.ts — Whisper transcription via fal.ai
_Requirements:_ REQ-2.2  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `transcribeAudio(url: string): Promise<string>` calls fal.ai `fal-ai/whisper` endpoint with audio URL; returns transcript text; throws `IngestionError` on timeout (120s) or API error.

### TASK-008 · Create lib/ingest/web-scraper.ts — scrape web page body text
_Requirements:_ REQ-2.3  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `scrapeWebPage(url: string): Promise<string>` uses Node fetch + regex strip of `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>` tags; returns plain text; timeout 15s; URL validated against allowlist regex before fetch.

### TASK-009 · Create POST /api/ingest route with unified ingestion dispatcher
_Requirements:_ REQ-2.6, REQ-2.7  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`, `.kit/skills/data-backend/postgres-patterns/SKILL.md`  
**AC:** `app/api/ingest/route.ts` accepts `{ url, sessionId? }`; dispatches to correct ingest lib; stores result in content_assets as asset_type='source_transcript'; returns `{ sessionId, wordCount, preview }` 200 or `{ error: { code: 'ingestion_error', source, message } }` 422.

### TASK-010 · Add URL input tab to ArticleUpload component
_Requirements:_ REQ-2.8  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`, `.kit/skills/development/build-website-web-app/SKILL.md`  
**AC:** `components/input/URLIngestionInput.tsx` created; ArticleUpload.tsx gains a "URL" tab alongside existing "File" tab; on submit calls `/api/ingest`; shows progress spinner; on success passes sessionId upstream.

### TASK-011 · Unit tests for URL ingestion lib modules
_Requirements:_ REQ-2.NF1, REQ-2.NF2  
_Skills:_ `.kit/skills/testing-quality/tdd-workflow/SKILL.md`  
**AC:** Jest tests for detect-url-type (4 cases), youtube stub (success + missing captions), audio stub (success + timeout), web-scraper (strips nav/scripts, timeout); all use jest.mock for external calls.

---

## R7 — Per-Article ROI Dashboard

### TASK-012 · Create GET /api/roi route aggregating content_performance per session
_Requirements:_ REQ-3.1, REQ-3.6  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`, `.kit/skills/data-backend/postgres-patterns/SKILL.md`  
**AC:** `app/api/roi/route.ts` queries `content_performance` joined to `sessions` for authenticated user; aggregates 28d clicks/impressions/avg_position; computes `needsRefresh` (avg_position > 20); returns paginated array (25/page); responds in < 2s with indexed query.

### TASK-013 · Create lib/roi.ts — ROI computation helpers
_Requirements:_ REQ-3.2, REQ-3.7  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `computeTrend(rows: ContentPerformance[]): number[]` returns 14-day daily click array filled with 0 for missing days; `estimateTrafficValue(clicks: number, avgPosition: number): number` returns rough CPC-based estimate; missing data returns null not 0.

### TASK-014 · Create ContentLibrary component with ROI table
_Requirements:_ REQ-3.1, REQ-3.5  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`, `.kit/skills/development/build-website-web-app/SKILL.md`  
**AC:** `components/sections/ContentLibrary.tsx` renders table with columns: title, publish date, clicks, impressions, avg position, traffic value, sparkline, refresh badge; clicking row navigates to session; GA4 not connected shows "Connect GA4" instead of metrics.

### TASK-015 · Create ROISparkline component using Recharts
_Requirements:_ REQ-3.2  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** `components/ui/ROISparkline.tsx` renders Recharts `<LineChart>` at 80×28px with no axes, no tooltip, single line data series from 14-day trend array; "Needs Refresh" badge is amber pill if needsRefresh=true.

### TASK-016 · Create /dashboard/library page with pagination
_Requirements:_ REQ-3.NF2  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** `app/dashboard/library/page.tsx` fetches /api/roi with page param; renders ContentLibrary with prev/next pagination controls; page state in URL searchParams; server component outer, client component inner.

---

## R4 — Scheduled Publishing Queue

### TASK-017 · Add title column to scheduled_posts — migration file
_Requirements:_ REQ-4.8  
_Skills:_ `.kit/skills/data-backend/postgres-patterns/SKILL.md`  
**AC:** `supabase/migrations/20260428_scheduled_posts_title.sql` adds `ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS title text;` with no breaking changes.

### TASK-018 · Create PATCH /api/schedule/[id] and DELETE /api/schedule/[id] routes
_Requirements:_ REQ-4.6  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** `app/api/schedule/[id]/route.ts` exports PATCH (updates publish_at, status, title) and DELETE (sets status='cancelled'); both require auth; PATCH validates publish_at ≥ now+5min; returns 404 if row not found or not owned by user.

### TASK-019 · Create Inngest function content/schedule.publish with cron trigger
_Requirements:_ REQ-4.4, REQ-4.NF1  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `lib/inngest/schedule-publish.ts` defines Inngest function with cron `"* * * * *"`; queries scheduled_posts WHERE status='queued' AND publish_at <= now(); for each row calls appropriate api/publish/{platform} route; on success sets status='published'; on failure sets status='failed' with error_details.

### TASK-020 · Create ScheduleCalendar component with weekly grid
_Requirements:_ REQ-4.1, REQ-4.3  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`, `.kit/skills/development/build-website-web-app/SKILL.md`  
**AC:** `components/sections/ScheduleCalendar.tsx` renders 7-column weekly grid (Mon–Sun); each column has hourly slots from 6am–10pm; articles rendered as draggable cards showing title, platform icon, status badge (queued/publishing/published/failed).

### TASK-021 · Implement HTML5 drag-drop for ScheduleCalendar
_Requirements:_ REQ-4.2, REQ-4.NF2  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** Drag events (onDragStart, onDragOver, onDrop) on CalendarSlot components; on drop calls PATCH /api/schedule/[id] with new publish_at; optimistic UI update with rollback on API error; no additional npm packages used.

### TASK-022 · Add retry button for failed scheduled posts
_Requirements:_ REQ-4.5  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** Failed posts show red badge + "Retry" button; on click calls PATCH /api/schedule/[id] with `{ status: 'queued' }` which re-enqueues via Inngest; button shows spinner during request.

### TASK-023 · Create /dashboard/schedule page
_Requirements:_ REQ-4.1  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** `app/dashboard/schedule/page.tsx` fetches scheduled_posts for current week; renders ScheduleCalendar; prev/next week navigation; server component outer with client calendar inner.

---

## R3 — Brand Voice Profiles + Score

### TASK-024 · Brand voice DB migration
_Requirements:_ REQ-5.1  
_Skills:_ `.kit/skills/data-backend/postgres-patterns/SKILL.md`  
**AC:** `supabase/migrations/20260428_brand_voices.sql` creates `brand_voices` table with all columns; enables RLS; creates policy `brand_voices_own`; adds unique partial index enforcing max 5 profiles per user (via check trigger or application-level guard).

### TASK-025 · Create GET/POST /api/brand-voice routes
_Requirements:_ REQ-5.6  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** `app/api/brand-voice/route.ts` exports GET (list user's brand voices) and POST (create; enforce max 5 limit; return 409 if exceeded); auth required; validated with Zod-like inline checks.

### TASK-026 · Create PUT/DELETE /api/brand-voice/[id] routes
_Requirements:_ REQ-5.6  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** `app/api/brand-voice/[id]/route.ts` exports PUT (full update) and DELETE; both verify row ownership; PUT sets is_active mutually exclusive (setting one active sets all others inactive for same user).

### TASK-027 · Create POST /api/brand-voice/score route
_Requirements:_ REQ-5.3, REQ-5.NF1  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** `app/api/brand-voice/score/route.ts` accepts `{ articleText, brandVoiceId, sessionId }`; fetches brand voice from DB; builds classifier prompt; calls claude-haiku (max 500 tokens); parses `{ score: number, violations: string[] }`; stores in content_assets as asset_type='brand_score'; responds < 3s.

### TASK-028 · Create lib/brand-voice.ts — prompt injection builder
_Requirements:_ REQ-5.2, REQ-5.NF2  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `lib/brand-voice.ts` exports `buildBrandVoiceSystemAddendum(voice: BrandVoice): string` returning formatted string injected into system prompts; writing_samples truncated to 2000 chars total; forbidden_phrases formatted as bullet list; unit tested.

### TASK-029 · Create BrandVoiceSettings component and /dashboard/brand-voice page
_Requirements:_ REQ-5.1, REQ-5.8  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`, `.kit/skills/development/build-website-web-app/SKILL.md`  
**AC:** `components/sections/BrandVoiceSettings.tsx` renders list of brand voice cards with create/edit/delete; inline edit form with fields for name, tone adjectives (tag input), writing samples (textarea), forbidden phrases (tag input), formality select; "Set Active" toggle; max 5 enforced in UI.

### TASK-030 · Create BrandScoreCard component and add to output panel
_Requirements:_ REQ-5.4, REQ-5.5, REQ-5.7  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** `components/ui/BrandScoreCard.tsx` mirrors existing SEO score card; shows 0-100 gauge, violations list; hidden when no active brand voice; score fetched after article generation via POST /api/brand-voice/score; shown alongside SEO score in dual panel layout.

---

## R2 — Living Content Brief

### TASK-031 · Brief DB migration
_Requirements:_ REQ-6.2  
_Skills:_ `.kit/skills/data-backend/postgres-patterns/SKILL.md`  
**AC:** `supabase/migrations/20260428_briefs.sql` creates `briefs` table; RLS policy scoping to user_id via sessions join; unique constraint on session_id (one brief per session); index on session_id.

### TASK-032 · Create POST /api/brief and GET /api/brief routes
_Requirements:_ REQ-6.6, REQ-6.7  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** POST generates brief via Claude from research data (fetched from content_assets by sessionId); upserts into briefs table; GET returns brief by sessionId query param; returns 404 if not found; both auth-required.

### TASK-033 · Create PATCH /api/brief/[id] route
_Requirements:_ REQ-6.4, REQ-6.6  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** `app/api/brief/[id]/route.ts` PATCH updates editable brief fields; sets status='approved' when caller passes `{ status: 'approved' }`; verifies ownership; returns updated brief.

### TASK-034 · Create lib/brief.ts — brief generation prompt and injector
_Requirements:_ REQ-6.1, REQ-6.5, REQ-6.NF2  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `lib/brief.ts` exports `generateBriefPrompt(researchData)` returning Claude prompt string; `injectBriefIntoGenerationContext(brief: Brief): string` returning formatted context block ≤4000 tokens; unit tested for token length guard.

### TASK-035 · Create BriefCard component between research and generation steps
_Requirements:_ REQ-6.3  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`, `.kit/skills/development/build-website-web-app/SKILL.md`  
**AC:** `components/sections/BriefCard.tsx` renders after research panel; shows keyword, H1, H2 outline (editable list), word count, CTAs; "Save Brief" calls PATCH; "Generate Article" disabled until brief status='approved'; renders only when brief exists for session.

---

## R10 — Plagiarism + AI Detection Gate

### TASK-036 · Create POST /api/detect route calling Originality.ai
_Requirements:_ REQ-7.1, REQ-7.6  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** `app/api/detect/route.ts` accepts `{ sessionId, text }`; calls Originality.ai API with ORIGINALITY_API_KEY; returns `{ originalityScore, aiScore }`; stores in content_assets as asset_type='detection_result'; 422 if ORIGINALITY_API_KEY missing with CTA message; 30s timeout with graceful fallback.

### TASK-037 · Create lib/detect.ts — auto-rewrite logic
_Requirements:_ REQ-7.2, REQ-7.NF1  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `lib/detect.ts` exports `runDetectionWithRewrite(sessionId, text, supabase)`: calls detect API; if originalityScore < 90, triggers one Claude rewrite prompt (max 1 retry); re-calls detect; stores final article back in content_assets; max 1 rewrite cycle enforced.

### TASK-038 · Create DetectionBadge component and add to output panel
_Requirements:_ REQ-7.3, REQ-7.4  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** `components/ui/DetectionBadge.tsx` shows two pills: "Original: X%" and "AI: X%"; green/amber/red per thresholds (≥90%/70-89%/<70% originality; ≤20%/21-40%/>40% AI); "Connect Originality.ai" shown when API key missing; badge added to article output panel below SEO/brand scores.

### TASK-039 · Wire detection into Inngest post-generation hook
_Requirements:_ REQ-7.5  
_Skills:_ `.kit/skills/development/code-writing-software-development/SKILL.md`  
**AC:** `lib/inngest/data-driven-pipeline.ts` (or equivalent) emits `content/detect.run` event after article generation step; new Inngest function `content/detect.run` calls `runDetectionWithRewrite`; final article version saved to content_assets replaces previous version.

---

## R1 — Inline AI Editor

### TASK-040 · Install Tiptap dependencies and create ContentEditor shell
_Requirements:_ REQ-8.1, REQ-8.NF1  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`, `.kit/skills/development/build-website-web-app/SKILL.md`  
**AC:** `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder` added to package.json; `components/sections/ContentEditor.tsx` created as 'use client' component initializing Tiptap with StarterKit; editor renders article markdown via `setContent()`; dynamically imported in page to avoid SSR issues.

### TASK-041 · Create slash command menu for ContentEditor
_Requirements:_ REQ-8.2  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** Custom Tiptap extension adds slash-command popup with items: Rewrite, Expand, Shorten, Change Tone (sub-menu), Fix SEO, Add Statistic; popup rendered via React portal; keyboard navigation (arrow keys + Enter) supported; dismissed on Escape.

### TASK-042 · Create POST /api/edit route with SSE streaming
_Requirements:_ REQ-8.3, REQ-8.8  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** `app/api/edit/route.ts` accepts `{ paragraph, action, tone?, articleContext }`; builds action-specific Claude prompt; streams response as text/event-stream with `data: {"delta": "..."}` chunks; ends with `data: [DONE]`; auth required; paragraph scoped (not full article).

### TASK-043 · Wire editor actions to /api/edit and handle streaming response
_Requirements:_ REQ-8.3, REQ-8.4, REQ-8.6  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** ContentEditor action handler calls /api/edit with SSE fetch; streams delta text into a replacement transaction on the Tiptap editor; on [DONE] commits edit to history (undoable); tone sub-menu shown before firing for Change Tone action; Fix SEO re-fetches SEO score after replacement.

### TASK-044 · Implement auto-save debounce for ContentEditor
_Requirements:_ REQ-8.7  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** ContentEditor registers `onUpdate` handler with 2s debounce using `useRef` setTimeout; on fire, PATCHes content_assets row for current session's blog asset; shows "Saved" / "Saving..." status indicator in editor toolbar.

---

## R8 — Topical Authority Planner

### TASK-045 · Content clusters DB migration
_Requirements:_ REQ-9.3  
_Skills:_ `.kit/skills/data-backend/postgres-patterns/SKILL.md`  
**AC:** `supabase/migrations/20260428_content_clusters.sql` creates `content_clusters` table; RLS policy for owner; index on user_id; check constraint: total_articles BETWEEN 9 AND 13 (1 pillar + 8-12 supporting).

### TASK-046 · Create POST /api/cluster route
_Requirements:_ REQ-9.1, REQ-9.2  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** `app/api/cluster/route.ts` accepts `{ pillarKeyword, name? }`; builds Claude prompt to generate 1 pillar + 8-12 supporting briefs; for each brief queries Google Search API for estimated volume; streams SSE progress; stores completed cluster in content_clusters; enforces max 20 clusters per user.

### TASK-047 · Create GET /api/cluster/[id] and PATCH article status route
_Requirements:_ REQ-9.6  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** GET returns full cluster with articles array; PATCH `/api/cluster/[id]/article/[articleId]` updates article status in the jsonb articles array; updates published_count when status changes to 'published'; auth + ownership verified.

### TASK-048 · Create TopicalAuthorityPlanner component
_Requirements:_ REQ-9.1, REQ-9.4, REQ-9.5  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`, `.kit/skills/development/build-website-web-app/SKILL.md`  
**AC:** `components/sections/TopicalAuthorityPlanner.tsx` has pillar keyword input + "Build Cluster" button; SSE progress bar during generation; on complete shows cluster grid with completion % header; ClusterArticleCard shows keyword, volume, difficulty, publish order, status badge, "Generate" button.

### TASK-049 · Create /dashboard/clusters page
_Requirements:_ REQ-9.NF2  
_Skills:_ `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** `app/dashboard/clusters/page.tsx` lists all user clusters with completion bars; clicking a cluster shows TopicalAuthorityPlanner in detail view; "Generate" button on cluster article creates new session with brief pre-loaded and navigates to /dashboard.

---

## R9 — Team Workspaces + Approval Workflow

### TASK-050 · Workspaces DB migration with RLS
_Requirements:_ REQ-10.1, REQ-10.NF1  
_Skills:_ `.kit/skills/data-backend/postgres-patterns/SKILL.md`, `.kit/skills/testing-quality/security-review/SKILL.md`  
**AC:** `supabase/migrations/20260428_workspaces.sql` creates workspaces, workspace_members, content_approvals tables; enables RLS on all three; creates all policies from design.md section 4.1; adds indexes on workspace_id, user_id; feature_enabled column defaults false.

### TASK-051 · Create workspace API routes (create, invite, list members)
_Requirements:_ REQ-10.1, REQ-10.2, REQ-10.9  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`  
**AC:** `app/api/workspace/route.ts` POST creates workspace + adds creator as admin; `app/api/workspace/[id]/members/route.ts` GET lists members; `app/api/workspace/[id]/invite/route.ts` POST creates pending member row, calls Supabase Edge Function to send invite email; auth required on all; slug auto-generated from name.

### TASK-052 · Create approval API routes and WorkspaceDashboard component
_Requirements:_ REQ-10.4, REQ-10.5, REQ-10.6, REQ-10.7  
_Skills:_ `.kit/skills/development/api-design/SKILL.md`, `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`  
**AC:** `app/api/approval/route.ts` POST submits for review (sets status='review', triggers email); `app/api/approval/[id]/route.ts` PATCH enforces state machine transitions (draft→review, review→approved, review→changes_requested, approved→published); invalid transitions return 422. `components/sections/WorkspaceDashboard.tsx` shows approval queue for editors/admins; writer sees own submissions; all routes check workspace feature_enabled flag.
