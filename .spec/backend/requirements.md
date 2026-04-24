# Requirements: Content Engine Backend API

**Date:** 2026-04-24  
**Status:** Phase 1 — Requirements Document  
**Feature:** backend-core-api

---

## Introduction

The content engine requires a dedicated FastAPI backend microservice to handle:
1. **Brand kit management** (CRUD, versioning, approval workflow)
2. **Content generation** (Claude API integration with platform-specific prompts)
3. **Content distribution** (posting to X, LinkedIn, Instagram, Reddit, email)
4. **Metrics ingestion** (performance tracking from platforms)
5. **Feedback loop** (metrics analysis, insight generation, brand kit auto-updates)
6. **Newsjacking** (trending topic sourcing, filtering, generation)

The backend is decoupled from the Next.js frontend (separate Render deployment), communicates via REST API, uses Supabase for database + auth delegation, and CloudMQ for async job processing.

---

## Requirements

### Requirement 1: Authentication & Workspace Isolation

**User Story:** As the API, I want to validate incoming requests using Supabase JWT tokens and isolate all data by workspace so that multi-tenancy is secure.

#### Acceptance Criteria

1. WHEN a request arrives without an Authorization header THEN the API SHALL return 401 Unauthorized.
2. WHEN a request has an invalid or expired JWT token THEN the API SHALL return 401 Unauthorized.
3. WHEN a valid JWT is provided THEN the API SHALL extract the user_id and workspace_id from the token.
4. WHEN a user requests data from a different workspace THEN the API SHALL return 403 Forbidden.
5. WHEN filtering database queries THEN the API SHALL always include `WHERE workspace_id = ?` to prevent cross-workspace leaks.
6. WHEN a token is refreshed or revoked THEN the API SHALL respect token expiry and invalidation.

---

### Requirement 2: Brand Kit CRUD Service

**User Story:** As a client, I want to create, read, update, and delete brand kits via REST API so that I can manage my brand identity.

#### Acceptance Criteria

1. WHEN POST /brand-kits with `{ name: string }` THEN the API SHALL create a brand kit with version=1, is_active=false, approved_at=null.
2. WHEN GET /brand-kits THEN the API SHALL return list of all brand kits for the workspace.
3. WHEN GET /brand-kits/{id} THEN the API SHALL return full brand kit with visual_identity, content_identity, platform_overrides, performance_benchmarks.
4. WHEN PATCH /brand-kits/{id} with updated fields THEN the API SHALL update only provided fields and set updated_at timestamp.
5. WHEN PATCH attempts to modify an approved kit THEN the API SHALL reject with 409 Conflict (versioning requirement).
6. WHEN DELETE /brand-kits/{id} THEN the API SHALL soft-delete the kit (mark as deleted, not hard-delete).

---

### Requirement 3: Brand Kit Versioning & Approval

**User Story:** As a client, I want to approve brand kit changes to create new versions so that I can track brand evolution and revert if needed.

#### Acceptance Criteria

1. WHEN POST /brand-kits/{id}/approve THEN the API SHALL increment version counter and set approved_at timestamp.
2. WHEN POST /brand-kits/{id}/activate THEN the API SHALL set is_active=true for this kit and is_active=false for all others in workspace.
3. WHEN GET /brand-kits/{id}/versions THEN the API SHALL return all versions with timestamps, approval status, and change diffs.
4. WHEN POST /brand-kits/{id}/revert with target_version THEN the API SHALL create a new version with old version's data (unapproved).
5. WHEN a kit is approved THEN the API SHALL record version reason (e.g., "Client approval") and created_by (user_id).

---

### Requirement 4: Content Generation Service (Claude API)

**User Story:** As a client, I want to generate on-brand, platform-specific content by sending a topic so that I don't write content from scratch.

#### Acceptance Criteria

1. WHEN POST /generate-content with `{ topic, source_type, brand_kit_id }` THEN the API SHALL queue a background job (202 Accepted response).
2. WHEN the job runs THEN the API SHALL load the active brand kit (or specified kit) and construct platform-specific prompts (LinkedIn, X, Instagram, Reddit, Email).
3. WHEN prompts are constructed THEN the API SHALL call Claude API with the prompt and brand context.
4. WHEN Claude returns content THEN the API SHALL store as generated_content + generated_posts (one per platform).
5. WHEN storing completes THEN the API SHALL update the job status to "completed" with generated content payload.
6. WHEN Claude API fails THEN the job SHALL retry with exponential backoff (3 retries max) and eventually mark as failed.
7. WHEN GET /jobs/{job_id} THEN the API SHALL return job status, payload (if completed), or error message (if failed).

---

### Requirement 5: Platform-Specific Content Rules in Generation

**User Story:** As a client, I want generated content to follow platform-specific rules (50-word LinkedIn hook, X threads, Instagram carousels) so that content is optimized for each platform's algorithm.

#### Acceptance Criteria

1. WHEN generating LinkedIn content THEN the API SHALL: enforce 50-word hook rule, use first-person voice, include save-optimization (frameworks/checklists), apply brand tone descriptors.
2. WHEN generating X content THEN the API SHALL: format as thread (1/N), keep each tweet ≤280 chars, use real-time voice, reference trend if applicable.
3. WHEN generating Instagram content THEN the API SHALL: output JSON with 7-slide carousel structure, slide 1 hook ≤12 words, slides 2–6 one insight each, slide 7 CTA.
4. WHEN generating Reddit content THEN the API SHALL: use community-respectful tone, avoid sales language, respect subreddit conventions, include community name.
5. WHEN generating Email content THEN the API SHALL: write educationally (not sales), include compelling subject line, optional list segmentation hint.

---

### Requirement 6: Content Distribution Service

**User Story:** As a client, I want to post generated content to all platforms with a single request so that multi-platform publishing is seamless.

#### Acceptance Criteria

1. WHEN POST /platform-distribution with `{ content_id, platforms }` THEN the API SHALL queue distribution jobs (202 Accepted).
2. WHEN distribution job runs for X/Twitter THEN the API SHALL post via X API v2 and store post_id, posted_at, status=posted.
3. WHEN distribution job runs for LinkedIn THEN the API SHALL post via LinkedIn API and store post_id, posted_at, status=posted.
4. WHEN distribution job runs for Instagram THEN the API SHALL post carousel image + caption via Business API and store post_id, posted_at, status=posted.
5. WHEN distribution job runs for Reddit THEN the API SHALL post to specified subreddit and store post_id, posted_at, status=posted.
6. WHEN distribution job runs for Email THEN the API SHALL create campaign in Mailchimp/SendGrid and queue for sending.
7. WHEN any platform API fails THEN the job SHALL log failure, retry, and eventually mark as failed (do not block other platforms).
8. WHEN GET /platform-distribution/{content_id} THEN the API SHALL return status per platform (posted, failed, pending).

---

### Requirement 7: Metrics Ingestion & Storage

**User Story:** As a client, I want to enter performance metrics (impressions, saves, engagement) so that the system can learn what content works.

#### Acceptance Criteria

1. WHEN POST /metrics/{post_id} with `{ impressions, saves, likes, comments, shares, clicks, conversions }` THEN the API SHALL validate all are non-negative integers.
2. WHEN validation passes THEN the API SHALL store metrics linked to the post with recorded_at and recorded_by_user_id.
3. WHEN metrics are stored THEN the API SHALL queue a feedback loop job to analyze patterns.
4. WHEN GET /metrics/{post_id} THEN the API SHALL return all metrics recorded for that post, sorted by recorded_at DESC.
5. WHEN POST /metrics-batch with multiple posts' metrics THEN the API SHALL accept and store all in a single request.

---

### Requirement 8: Feedback Loop Engine

**User Story:** As the system, I want to analyze performance metrics and generate insights so that I can suggest brand kit improvements.

#### Acceptance Criteria

1. WHEN a feedback loop job runs THEN the API SHALL aggregate metrics for posts from the last 30 days.
2. WHEN aggregating THEN the API SHALL extract: tone used (from brand kit), format used, topic pillar matched, platform, performance metrics.
3. WHEN extracting completes THEN the API SHALL correlate metrics with attributes (e.g., tone="vulnerable", platform="linkedin", saves=+20%).
4. WHEN correlations show patterns (confidence ≥0.7) THEN the API SHALL generate insights: "Vulnerable tone +20% saves on LinkedIn".
5. WHEN insights are generated THEN the API SHALL store in feedback_insights table with impact_metric, confidence, recommendation.
6. WHEN GET /insights/{brand_kit_id} THEN the API SHALL return pending insights (applied=false) sorted by confidence DESC.
7. WHEN POST /insights/{insight_id}/approve THEN the API SHALL: apply recommendation to brand kit, increment version, mark insight as applied=true.

---

### Requirement 9: Newsjacking Topic Sourcing

**User Story:** As a client, I want the system to identify trending topics relevant to my niche so that I can generate timely, on-brand content.

#### Acceptance Criteria

1. WHEN GET /newsjacking/topics THEN the API SHALL query X Trends API and NewsAPI for trending topics.
2. WHEN topics are fetched THEN the API SHALL filter for relevance to client's content_pillars (keyword matching).
3. WHEN filtering completes THEN the API SHALL score relevance (0–1) and momentum (0–1) and rank by relevance + momentum.
4. WHEN ranking completes THEN the API SHALL return top 5–10 topics with source, scores, context, expires_at timestamp.
5. WHEN a topic expires (exceeds TTL) THEN the API SHALL mark expired=true and exclude from future listings.
6. WHEN POST /newsjacking/topics/manual with topic_title THEN the API SHALL allow manual topic entry (for topics not trending yet).

---

### Requirement 10: Newsjacking Content Generation

**User Story:** As a client, I want to generate content for a trending topic with the same workflow as standard generation so that newsjacking is seamless.

#### Acceptance Criteria

1. WHEN POST /newsjacking/generate with `{ topic_id, brand_kit_id }` THEN the API SHALL load the topic and queue content generation.
2. WHEN generation runs THEN the API SHALL use newsjacking-specific prompts: contextualize (don't summarize), answer "so what?", urgency/timeliness.
3. WHEN generation completes THEN the API SHALL store generated_content with source_type="newsjacking" and newsjacking_topic_id reference.
4. WHEN content is generated THEN the API SHALL include "post within 24–48 hours" guidance in response.

---

### Requirement 11: Job Queue Management

**User Story:** As the system, I want to queue and process jobs asynchronously so that long-running operations don't block the API.

#### Acceptance Criteria

1. WHEN a long-running operation is requested (content generation, distribution, metrics analysis) THEN the API SHALL queue a CloudMQ job (202 Accepted).
2. WHEN the job is queued THEN the API SHALL return job_id so client can poll status.
3. WHEN CloudMQ processes the job THEN a background worker (Render Background Worker) SHALL handle it.
4. WHEN the job completes THEN the API SHALL update job status to "completed" with payload.
5. WHEN the job fails THEN the API SHALL retry up to 3 times with exponential backoff, then mark as "failed".
6. WHEN GET /jobs/{job_id} THEN the API SHALL return job status, progress (if applicable), and result or error.

---

### Requirement 12: Error Handling & Resilience

**User Story:** As a client, I want clear error messages and graceful degradation so that failures are understandable and don't cascade.

#### Acceptance Criteria

1. WHEN a request validation fails THEN the API SHALL return 400 with `{ error: 'validation_error', message: '...', details: {...} }`.
2. WHEN a resource is not found THEN the API SHALL return 404 with `{ error: 'not_found', message: '...' }`.
3. WHEN auth fails THEN the API SHALL return 401 with `{ error: 'unauthorized' }`.
4. WHEN workspace access is denied THEN the API SHALL return 403 with `{ error: 'forbidden' }`.
5. WHEN a platform API fails during distribution THEN the API SHALL: log the failure, continue with other platforms, return partial success (e.g., "X posted, LinkedIn failed").
6. WHEN a database query times out THEN the API SHALL return 504 Gateway Timeout with `{ error: 'timeout', message: 'Operation took too long' }`.
7. WHEN an unhandled error occurs THEN the API SHALL return 500 with generic error message (no stack trace to client).

---

### Requirement 13: API Documentation & Testing

**User Story:** As a developer, I want OpenAPI documentation and working tests so that I can integrate and debug easily.

#### Acceptance Criteria

1. WHEN accessing /docs THEN the API SHALL serve Swagger UI with all endpoints documented.
2. WHEN accessing /openapi.json THEN the API SHALL return OpenAPI 3.0 schema.
3. WHEN running tests THEN all integration tests SHALL pass (>90% code coverage).
4. WHEN running tests THEN all security tests SHALL pass (workspace isolation, auth validation).
5. WHEN running `pytest` THEN output SHALL show: unit tests, integration tests, coverage report.

---

### Requirement 14: Deployment & Infrastructure

**User Story:** As an operator, I want the backend to deploy to Render with PostgreSQL + CloudMQ so that infrastructure is managed and scalable.

#### Acceptance Criteria

1. WHEN deploying to Render THEN the API SHALL start on port 8000 and be accessible via HTTPS.
2. WHEN environment variables are set THEN the API SHALL read DATABASE_URL, SUPABASE_*, API keys from environment.
3. WHEN the background worker starts THEN it SHALL process CloudMQ jobs continuously (with graceful shutdown).
4. WHEN a job fails THEN the worker SHALL log to stdout (visible in Render logs).
5. WHEN database migrations are needed THEN migration scripts SHALL run before API startup.

---

## Design Decisions Flagged for Approval

### [OPEN QUESTION 1: Job Queue Library]
The spec mentions "CloudMQ" but options include: CloudMQ (serverless), Bull (Redis-based), Celery (Python native). Each has trade-offs.

**Assumption for Phase 1:** Use CloudMQ for simplicity (serverless, zero infrastructure). If performance issues arise, switch to Bull + Redis.

### [OPEN QUESTION 2: Content Generation Sync vs. Async]
Should content generation be sync (fast, but blocks) or async (slower to retrieve but unblocks)?

**Assumption for Phase 1:** Always async (queue job, return 202, client polls for status). Simpler error handling + resilience.

### [OPEN QUESTION 3: Platform API Error Handling]
When posting to X succeeds but LinkedIn fails, should we return 200 (partial success) or 207 (multi-status)?

**Assumption for Phase 1:** Return 200 with detailed status per platform in response (e.g., `{ "x": "posted", "linkedin": "failed", ... }`).

---

## Summary

This spec covers the entire FastAPI backend:
- Auth + multi-tenancy (Supabase JWT + workspace isolation)
- Brand kit CRUD + versioning + approval workflow
- Content generation (Claude API with platform-specific rules)
- Distribution (5 platforms + email)
- Metrics ingestion + feedback loop
- Newsjacking (topic sourcing + generation)
- Job queue management (CloudMQ + Render background worker)
- Error handling + resilience
- API documentation (Swagger) + testing

All requirements are testable. Open questions are flagged with reasonable Phase 1 assumptions.

---

**Next Step:** Please review and reply **'approved'** to continue to the design phase.
