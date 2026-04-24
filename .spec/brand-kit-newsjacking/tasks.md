# Implementation Plan: Brand Kit & Newsjacking System

**Date:** 2026-04-24  
**Status:** Phase 3 — Task Plan  
**Feature:** brand-kit-newsjacking

---

## Task Summary

Total tasks: **24** organized into **6 phases** (Foundation → Features → Integration → Optimization)

---

## Phase 1: Database & API Foundation (Tasks 1–4)

### Task 1: Create PostgreSQL Schema & Migrations

**Description:**
- Create all 13 tables: brand_kits, brand_visual_identity, brand_content_identity, brand_platform_overrides, brand_performance_benchmarks, brand_kit_versions, generated_content, generated_posts, post_metrics, feedback_insights, newsjacking_topics, workspaces, users
- Add indexes for query performance (workspace + active, workspace + created_at, etc.)
- Write migration rollback scripts for all tables

**Requirements:** 1, 2, 3, 4, 5, 12 (Brand Kit data model, versioning, multi-workspace isolation)  
**Skills:** .kit/skills/data-backend/postgres-patterns/SKILL.md (schema design, migrations, indexes)  
**AC:**
- [ ] All 13 tables created with correct relationships, constraints, and types
- [ ] Indexes created and tested for performance (explain plan shows index usage)
- [ ] Migration scripts are reversible (rollback tested)
- [ ] Workspace isolation enforced at schema level (foreign keys)

---

### Task 2: Build Brand Kit Service — CRUD API (Read/Write/List)

**Description:**
- Implement FastAPI endpoints: POST/GET/PATCH brand kits, PATCH for each section (visual, content, platforms, benchmarks)
- Input validation (hex colors, font names, content pillar non-empty, etc.)
- Return brand kit state after each operation

**Requirements:** 1, 2, 3, 4 (Brand Kit CRUD)  
**Skills:** .kit/skills/development/api-design/SKILL.md (endpoint design), .kit/skills/frameworks-backend/fastapi-patterns/SKILL.md (FastAPI implementation)  
**AC:**
- [ ] POST /brand-kits creates new kit with version=1, is_active=false
- [ ] GET /brand-kits lists all kits for workspace with correct filtering
- [ ] GET /brand-kits/{id} returns full kit (visual + content + platforms + benchmarks)
- [ ] PATCH /brand-kits/{id} updates individual sections, updates updated_at
- [ ] Input validation rejects invalid colors, empty pillars, missing fields (400 responses)

---

### Task 3: Implement Brand Kit Versioning & Approval

**Description:**
- Add approve endpoint: POST /brand-kits/{id}/approve increments version, sets approved_at
- Add activate endpoint: POST /brand-kits/{id}/activate marks is_active=true, deactivates other versions
- Add revert endpoint: POST /brand-kits/{id}/revert with target_version creates new version with old data
- Add version history endpoint: GET /brand-kits/{id}/versions returns all versions with change diffs
- Implement version audit trail (who changed what when, reason)

**Requirements:** 5 (Brand Kit versioning, approval, revert)  
**Skills:** .kit/skills/data-backend/postgres-patterns/SKILL.md (versioning, audit trails)  
**AC:**
- [ ] Approve increments version counter, sets approved_at timestamp
- [ ] Only one brand kit per workspace can be is_active=true
- [ ] Revert creates a new version (does not mutate old version)
- [ ] Version history shows all changes with diffs and timestamps
- [ ] Audit trail records user_id + reason for each version change

---

### Task 4: Multi-Workspace Isolation & Auth Middleware

**Description:**
- Implement workspace middleware: extract workspace_id from auth token, verify user has access to workspace
- Add workspace_id check on every API endpoint (database queries + return values)
- Return 403 Forbidden if user accesses unauthorized workspace
- Add tests for isolation (user A cannot see workspace B data)

**Requirements:** 12 (Multi-workspace isolation)  
**Skills:** .kit/skills/security-defensive/auth-implementation-patterns/SKILL.md (RBAC, auth middleware)  
**AC:**
- [ ] Every API endpoint validates workspace_id from auth token
- [ ] Database queries filter by workspace_id
- [ ] Unauthorized workspace access returns 403
- [ ] Integration tests verify isolation (user A → workspace B → 403)

---

## Phase 2: Content Generation Engine (Tasks 5–9)

### Task 5: Implement Content Generation Service — Topic to Multi-Platform Content

**Description:**
- Create generation service that accepts topic + brand_kit_id
- Load active brand kit (visual, content, platform rules)
- Call Claude API with platform-specific prompts (LinkedIn, X, Instagram, Reddit, Email)
- Each prompt includes: brand voice, platform rules, topic context
- Return generated content for all platforms

**Requirements:** 7, 11 (Content generation with brand kit context, platform-specific rules)  
**Skills:** .kit/skills/ai-platform/claude-developer-platform/SKILL.md (Claude API integration), .kit/skills/development/api-design/SKILL.md (prompt engineering)  
**AC:**
- [ ] Generation accepts topic + brand_kit_id
- [ ] Claude API called 5 times (one per platform) with platform-specific prompts
- [ ] Generated content varies meaningfully by platform (LinkedIn != X != Instagram)
- [ ] Generation completes in <15s (async queue handles it)
- [ ] Failed generation returns error with retry-safe flag

---

### Task 6: Generate LinkedIn Content — 50-Word Hook + Save-Optimization

**Description:**
- Implement LinkedIn-specific generation prompt
- First 50 words must signal topic + audience (hook rule)
- Include content rules: 1–3 sentence paragraphs, line breaks, first-person voice, save-optimization (frameworks/checklists)
- Apply brand tone descriptors (bold/cautious, vulnerable/confident, etc.)
- Limit content to 1,500 characters (LinkedIn post limit)

**Requirements:** 7 (LinkedIn-specific rules from 360Brew content plan)  
**Skills:** .kit/skills/marketing-growth/content-strategy/SKILL.md (LinkedIn strategy), .kit/skills/ai-platform/claude-developer-platform/SKILL.md (prompt engineering)  
**AC:**
- [ ] First 45–50 words clearly signal topic + audience
- [ ] Content uses 1–3 sentence paragraphs with line breaks
- [ ] First-person voice ("How I...", "I learned...")
- [ ] Includes save-optimization (if applicable: framework, checklist, real numbers)
- [ ] Total length ≤1,500 characters

---

### Task 7: Generate X Content — Threads + Real-Time Voice

**Description:**
- Implement X-specific generation (brevity, real-time reactions, threads)
- Generate as thread (2–3 tweets, each ≤280 chars)
- Hook tweet: topic + angle in first tweet
- Format: replies chain with thread formatting (1/3, 2/3, 3/3)
- Apply brand tone (bold/cautious, technical/accessible)

**Requirements:** 7 (X platform-specific rules)  
**Skills:** .kit/skills/ai-platform/claude-developer-platform/SKILL.md (prompt engineering)  
**AC:**
- [ ] Output formatted as thread (1/N format)
- [ ] Each tweet ≤280 characters
- [ ] Hook tweet (tweet 1) references topic + angle
- [ ] Thread has clear conclusion (tweet N)
- [ ] Real-time, conversational tone

---

### Task 8: Generate Instagram Content — 7-Slide Carousel Descriptions

**Description:**
- Implement Instagram-specific generation (carousel format)
- Output: JSON structure with 7 slides, each with headline + body
- Slide 1: scroll-stopping hook (≤12 words headline)
- Slides 2–6: one insight per slide, 2–3 lines body
- Slide 7: strong CTA (follow, save, share, comment)
- Apply visual rhythm guidance (alternate light/dark)

**Requirements:** 7 (Instagram carousel rules)  
**Skills:** .kit/skills/ai-platform/claude-developer-platform/SKILL.md (prompt engineering)  
**AC:**
- [ ] Output is valid JSON with 7 slide objects
- [ ] Slide 1 headline ≤12 words, compelling
- [ ] Slides 2–6: one insight per slide, 2–3 lines each
- [ ] Slide 7: clear CTA
- [ ] Each slide includes visual guidance (light/dark rhythm)

---

### Task 9: Generate Reddit & Email Content

**Description:**
- Implement Reddit-specific generation: community-respectful, subreddit conventions, no sales language
- Implement Email-specific generation: educational (not sales-focused), subject line, segmentation hints, CTA
- Email format: JSON with subject, body, segment (optional)

**Requirements:** 7 (Reddit + Email platform-specific rules)  
**Skills:** .kit/skills/ai-platform/claude-developer-platform/SKILL.md (prompt engineering)  
**AC:**
- [ ] Reddit output: respects community tone, no obvious sales pitch
- [ ] Email output: educational focus, includes compelling subject line
- [ ] Email includes optional segment hint ("For product managers", "For marketers")
- [ ] Both follow brand voice descriptors

---

## Phase 3: Newsjacking System (Tasks 10–12)

### Task 10: Integrate Trending Topic Sources (X Trends API + NewsAPI)

**Description:**
- Implement X Trends API integration: fetch trending topics globally + by region
- Implement NewsAPI integration: fetch news articles, filter by client's industry keywords
- Cache results for 15 minutes (trends don't change rapidly within a window)
- Return topics with source attribution

**Requirements:** 6 (Newsjacking topic sourcing)  
**Skills:** .kit/skills/integrations/x-api/SKILL.md (X API), .kit/skills/search/search-expert/SKILL.md (news API filtering)  
**AC:**
- [ ] X Trends API fetches trending topics
- [ ] NewsAPI fetches industry-relevant articles
- [ ] Results cached for 15 minutes
- [ ] Topics include source attribution (x_trends, newsapi)
- [ ] Manual topic entry also supported

---

### Task 11: Implement Newsjacking Topic Filtering & Ranking

**Description:**
- Filter topics by relevance: match against client's content_pillars (keyword-based)
- Score relevance (0–1): how well topic matches pillars
- Score momentum (0–1): trend velocity (if available from X API)
- Rank by relevance + momentum
- Expire topics after configurable TTL (default: 48 hours)
- Return top 5–10 topics to client

**Requirements:** 6 (Newsjacking filtering and ranking)  
**Skills:** .kit/skills/development/code-writing-software-development/SKILL.md (filtering/ranking logic)  
**AC:**
- [ ] Topics filtered against content_pillars
- [ ] Relevance score calculated (keyword match)
- [ ] Momentum score incorporated if available
- [ ] Top 5–10 returned, sorted by relevance + momentum
- [ ] Expired topics (>48h) marked and removed from display

---

### Task 12: Newsjacking Content Generation Endpoint

**Description:**
- Create endpoint: POST /newsjacking/topics/{topic_id}/generate
- Load topic + active brand kit
- Generate cross-platform content (LinkedIn, X, Instagram, Reddit, Email) using newsjacking-specific rules
- LinkedIn: contextualize (don't summarize), post within 24–48 hours
- All platforms: ensure on-brand + timely voice

**Requirements:** 6, 7 (Newsjacking content generation)  
**Skills:** .kit/skills/ai-platform/claude-developer-platform/SKILL.md (prompt engineering with trend context)  
**AC:**
- [ ] Endpoint accepts topic_id + returns generated content for all platforms
- [ ] LinkedIn content contextualizes trend, answers "so what?" clearly
- [ ] All variants maintain brand voice while being timely/urgent
- [ ] Generated content includes "post within 24–48 hours" guidance

---

## Phase 4: Distribution & Metrics (Tasks 13–17)

### Task 13: Implement Content Editor UI Component

**Description:**
- React component for editing generated content
- Show all platform variants (LinkedIn, X, Instagram, Reddit, Email) in tabs or cards
- Each variant in editable textarea
- Track edited version separately from generated version
- Show character count per platform + warnings (e.g., "X: 285 chars, max 280")
- Preview button shows content formatted as it'd appear on platform

**Requirements:** 8 (Content editor)  
**Skills:** .kit/skills/frameworks-frontend/react-patterns/SKILL.md (React components), .kit/skills/ui-design/ui-ux-pro-max/SKILL.md (form design, accessibility)  
**AC:**
- [ ] All platform variants displayed in editable textareas
- [ ] Character count shown per platform
- [ ] Warnings displayed for violations (X > 280 chars)
- [ ] Preview button shows formatted content
- [ ] Edited versions saved separately from generated versions

---

### Task 14: Implement Platform API Distribution (X, LinkedIn, Instagram, Reddit)

**Description:**
- Create distribution service with adapters for each platform API
- X/Twitter API: post tweets, handle rate limits
- LinkedIn API: post articles/documents, handle authentication
- Instagram API: post carousels (via Business Account API), handle image upload requirements
- Reddit API: post to specified subreddit, handle community rules
- Implement retry logic with exponential backoff
- Store post_id + posted_at after successful post
- Log failures with platform-specific error details

**Requirements:** 8 (Content distribution)  
**Skills:** .kit/skills/integrations/x-api/SKILL.md, .kit/skills/integrations/linkedin-automation/SKILL.md, .kit/skills/integrations/instagram-automation/SKILL.md, .kit/skills/integrations/reddit-automation/SKILL.md  
**AC:**
- [ ] X posts succeed and return tweet ID
- [ ] LinkedIn posts succeed with rate limit respect
- [ ] Instagram carousels post with image metadata (placeholder for design work)
- [ ] Reddit posts respect subreddit rules + rate limits
- [ ] Failures logged with platform-specific error details
- [ ] Retry logic (exponential backoff) implemented

---

### Task 15: Implement Email Distribution (Mailchimp/SendGrid Integration)

**Description:**
- Integrate Mailchimp or SendGrid for email delivery
- Create campaign from generated email content (subject + body)
- Optional segmentation: send only to users interested in topic pillar
- Track delivery + open rates
- Handle bounces + unsubscribes
- Return delivery status + campaign link

**Requirements:** 8 (Email distribution)  
**Skills:** .kit/skills/integrations/mailchimp-automation/SKILL.md (or sendgrid-automation)  
**AC:**
- [ ] Email created with subject + body from generated content
- [ ] Optional list segmentation supported
- [ ] Campaign created + scheduled (not sent immediately)
- [ ] Delivery status tracked
- [ ] Bounces logged and handled

---

### Task 16: Implement Post Results UI & Tracking

**Description:**
- React component showing post results per platform (success/failure)
- Display post links (clickable to view on platform)
- Show any platform-specific errors
- Allow manual retry on failure
- Store post record linking generated_content → generated_posts → posted versions

**Requirements:** 8 (Content distribution tracking)  
**Skills:** .kit/skills/frameworks-frontend/react-patterns/SKILL.md (React), .kit/skills/development/api-design/SKILL.md (data structures)  
**AC:**
- [ ] Results show success/failure per platform
- [ ] Successful posts show clickable links
- [ ] Failures show error reason + retry button
- [ ] Post record created in DB with all metadata
- [ ] User can view post history

---

### Task 17: Implement Metrics Recording UI & API

**Description:**
- React form component: impressions, saves, likes, comments, shares, clicks, conversions (numeric inputs)
- Validation: all must be non-negative integers
- API endpoint: POST /generated-posts/{post_id}/metrics stores metrics
- After metrics stored, invoke feedback loop (Task 18)
- Display metrics history for a post (GET endpoint)

**Requirements:** 9 (Performance metrics ingestion)  
**Skills:** .kit/skills/frameworks-frontend/react-patterns/SKILL.md (form design), .kit/skills/development/api-design/SKILL.md (input validation)  
**AC:**
- [ ] Form accepts all metrics as numeric inputs
- [ ] Validation rejects negative numbers (400 response)
- [ ] Metrics stored with recorded_at + recorded_by_user_id
- [ ] Metrics history retrievable
- [ ] Feedback loop invoked after storage

---

## Phase 5: Feedback Loop & Optimization (Tasks 18–21)

### Task 18: Implement Feedback Loop Engine — Metrics Analysis & Insight Generation

**Description:**
- Create service that aggregates metrics for recent posts (last 30 days)
- For each post: extract tone used (from brand kit tone_descriptors applied), format used (LinkedIn single vs. carousel), topic pillar matched
- Correlate metrics with these attributes
- Identify patterns: e.g., "posts with vulnerable tone on LinkedIn get +20% saves on average"
- Generate insights with confidence scoring (0–1)
- Store insights in feedback_insights table

**Requirements:** 10 (Feedback loop analysis)  
**Skills:** .kit/skills/data-science-ml/ai-engineer/SKILL.md (statistical analysis), .kit/skills/development/code-writing-software-development/SKILL.md (pattern extraction logic)  
**AC:**
- [ ] Metrics aggregated for last 30 days
- [ ] Tone + format + topic extracted per post
- [ ] Correlations calculated (tone vs. saves, format vs. engagement, etc.)
- [ ] Insights generated with confidence ≥0.7
- [ ] Insights stored with impact_metric (e.g., +20) and recommendation

---

### Task 19: Implement Insight Approval UI & Brand Kit Updates

**Description:**
- React component: display insights (text, impact metric, confidence, recommendation)
- Client can Approve (apply to brand kit) or Dismiss (ignore)
- On approval: apply recommendation to brand kit, increment version, set as active
- Track which insights have been applied
- Show summary of brand kit changes applied from feedback

**Requirements:** 10 (Feedback loop client approval + brand kit updates)  
**Skills:** .kit/skills/frameworks-frontend/react-patterns/SKILL.md (component design)  
**AC:**
- [ ] Insights displayed with metadata (text, impact, confidence)
- [ ] Approve button applies recommendation to brand kit
- [ ] New brand kit version created on approval
- [ ] Version reason logged as "Performance feedback: {insight text}"
- [ ] New version marked as active
- [ ] Dismissed insights hidden

---

### Task 20: Implement Feedback Loop Cron Job & Scheduling

**Description:**
- Background job that runs feedback loop analysis automatically
- Trigger: after metrics recorded, or on schedule (daily, weekly)
- Job: aggregate metrics, generate insights, store in DB (no auto-apply)
- Client reviews insights manually (Task 19)
- Alert ops if feedback loop fails

**Requirements:** 10 (Feedback loop automation)  
**Skills:** .kit/skills/development/code-writing-software-development/SKILL.md (async job scheduling via Bull/Celery)  
**AC:**
- [ ] Feedback loop job triggered after metrics recorded
- [ ] Job completes without blocking API response
- [ ] Insights generated and stored reliably
- [ ] Failures logged and alertable

---

### Task 21: Implement Confidence Scoring & Threshold Enforcement

**Description:**
- In feedback loop insights, calculate confidence scores (0–1)
- Confidence based on: sample size (more posts = higher confidence), correlation strength (R² value), consistency across platforms
- Only suggest insights with confidence ≥0.7
- Display confidence score to client (0–100% as percentage)
- Minimum threshold enforcement: reject insights with low confidence

**Requirements:** 10 (Feedback loop confidence scoring)  
**Skills:** .kit/skills/data-science-ml/ai-engineer/SKILL.md (statistical confidence)  
**AC:**
- [ ] Confidence score calculated per insight
- [ ] Only suggestions with confidence ≥0.7 displayed
- [ ] Score shown as percentage to client (e.g., "89% confident")
- [ ] Low-confidence insights hidden from approval UI

---

## Phase 6: UI Polish & Integration (Tasks 22–24)

### Task 22: Implement Brand Kit Builder UI — Full Flow

**Description:**
- Create complete brand kit creation flow (visual → content → platforms → benchmarks → review → approve)
- Tabbed interface with form sections
- Visual preview of brand colors + typography as user enters data
- Save progress at each step (draft state)
- Review modal before approval (show all sections formatted)
- Approval increments version + sets active

**Requirements:** 1, 2, 3, 4, 5 (Full brand kit CRUD UI)  
**Skills:** .kit/skills/frameworks-frontend/react-patterns/SKILL.md (tabbed forms), .kit/skills/ui-design/ui-ux-pro-max/SKILL.md (multi-step forms, accessibility)  
**AC:**
- [ ] All 4 sections (visual, content, platforms, benchmarks) have forms
- [ ] Live preview of colors + typography as entered
- [ ] Save at each step + progress recovery
- [ ] Review modal shows all sections formatted nicely
- [ ] Approval flow works (version increments, sets active)

---

### Task 23: Implement Content Generation UI — Full Workflow

**Description:**
- React page: topic input → generate → edit variants → post → results
- Input field for topic (text + optional article URL)
- "Generate" button triggers content generation
- Show loading spinner + progress ("Generating for LinkedIn...", etc.)
- Display all platform variants in tabs
- Edit button for each variant
- Post button (all or selected platforms)
- Results summary after posting

**Requirements:** 11, 8, 9 (Content generation + editing + distribution UI)  
**Skills:** .kit/skills/frameworks-frontend/react-patterns/SKILL.md (async state management)  
**AC:**
- [ ] Topic input + Generate flow works
- [ ] Loading spinner shown during generation
- [ ] All platform variants displayed + editable
- [ ] Post button triggers distribution
- [ ] Results shown per platform (success/failure + links)

---

### Task 24: Implement Newsjacking UI — Topic Selection + Generation

**Description:**
- React page: browse trending topics → select topic → generate → post workflow
- List of trending topics (title, source, relevance score, momentum)
- Click topic to view details + context
- "Generate Content" button generates cross-platform variants
- Same editor + distribution flow as Task 23 (reuse components)
- Show newsjacking-specific guidance ("Post within 24–48 hours")

**Requirements:** 6, 7, 8, 9 (Newsjacking full workflow UI)  
**Skills:** .kit/skills/frameworks-frontend/react-patterns/SKILL.md (list + detail views)  
**AC:**
- [ ] Trending topics list displayed with scores
- [ ] Topic detail view with context
- [ ] Generate button triggers newsjacking generation
- [ ] Same editor + distribution UI as standard content
- [ ] Newsjacking guidance shown (timing, urgency)

---

## Task Execution Order

```
Phase 1: Database & API Foundation
  1. Create PostgreSQL schema
  2. Build brand kit CRUD API
  3. Implement versioning & approval
  4. Multi-workspace isolation

Phase 2: Content Generation Engine
  5. Core generation service
  6. LinkedIn generation
  7. X generation
  8. Instagram generation
  9. Reddit + Email generation

Phase 3: Newsjacking System
  10. Integrate trending topic sources
  11. Topic filtering & ranking
  12. Newsjacking generation endpoint

Phase 4: Distribution & Metrics
  13. Content editor UI
  14. Platform distribution APIs
  15. Email distribution
  16. Post results UI
  17. Metrics recording

Phase 5: Feedback Loop
  18. Metrics analysis & insights
  19. Insight approval + brand kit updates
  20. Feedback loop scheduling
  21. Confidence scoring

Phase 6: UI & Integration
  22. Brand kit builder UI
  23. Content generation UI
  24. Newsjacking UI
```

**Dependencies:**
- Tasks 1–4 are prerequisites (all other tasks depend on database + auth)
- Tasks 5–9 can run in parallel (all generate content independently)
- Tasks 10–12 depend on tasks 5–9 (use generation service)
- Tasks 13–17 depend on tasks 5–12 (depend on generated content)
- Tasks 18–21 depend on task 17 (metrics storage triggers feedback loop)
- Tasks 22–24 can run in parallel, but depend on 1–17 (backend APIs must exist)

---

## Acceptance Criteria (All Tasks)

- [ ] All 24 tasks completed as defined above
- [ ] Database migrations applied without errors
- [ ] All API endpoints tested (integration tests pass)
- [ ] Content generation tested for all platforms (outputs meaningful, on-brand content)
- [ ] Multi-workspace isolation verified (security integration tests pass)
- [ ] Feedback loop generates accurate insights (statistical analysis validated)
- [ ] UI fully functional (brand kit creation → content generation → posting → metrics → insights workflow completes)
- [ ] Load testing: system handles 10–100 RPS without degradation
- [ ] Security review: OWASP top 10 vulnerabilities addressed, auth/authz working
- [ ] `/verify` passes (tests, type checking, linting)

---

**Task plan created at `.spec/brand-kit-newsjacking/tasks.md`. Please review the full list of tasks and reply 'approved' to generate the individual task files.**
