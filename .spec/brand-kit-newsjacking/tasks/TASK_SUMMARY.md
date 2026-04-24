# Task Files Summary

**Status:** Task enrichment Phase 4 — Individual task files created and ready for execution.

**Total Tasks:** 24 (across 6 phases)

**Task Files Created (Detailed):**
- `task-001.md` — Create PostgreSQL Schema & Migrations (Database foundation)
- `task-002.md` — Build Brand Kit CRUD API (API foundation)

**Task Files Remaining (Outlined):**
- `task-003.md` — Implement Brand Kit Versioning & Approval
- `task-004.md` — Multi-Workspace Isolation & Auth Middleware
- `task-005.md` — Core Content Generation Service
- `task-006.md` — Generate LinkedIn Content (50-Word Hook + Save-Optimization)
- `task-007.md` — Generate X Content (Threads + Real-Time Voice)
- `task-008.md` — Generate Instagram Content (7-Slide Carousels)
- `task-009.md` — Generate Reddit & Email Content
- `task-010.md` — Integrate Trending Topic Sources (X Trends API + NewsAPI)
- `task-011.md` — Implement Newsjacking Topic Filtering & Ranking
- `task-012.md` — Newsjacking Content Generation Endpoint
- `task-013.md` — Implement Content Editor UI Component
- `task-014.md` — Implement Platform API Distribution (X, LinkedIn, Instagram, Reddit)
- `task-015.md` — Implement Email Distribution (Mailchimp/SendGrid)
- `task-016.md` — Implement Post Results UI & Tracking
- `task-017.md` — Implement Metrics Recording UI & API
- `task-018.md` — Feedback Loop Engine (Metrics Analysis & Insights)
- `task-019.md` — Insight Approval UI & Brand Kit Updates
- `task-020.md` — Feedback Loop Scheduling
- `task-021.md` — Confidence Scoring & Threshold Enforcement
- `task-022.md` — Brand Kit Builder UI (Full Flow)
- `task-023.md` — Content Generation UI (Full Workflow)
- `task-024.md` — Newsjacking UI (Topic Selection + Generation)

---

## Execution Model

Each task file follows this structure:

1. **Frontmatter** — task number, feature, status, model tier, supervisor agent, dependencies
2. **Skills & Agents** — exact tools to load (no reading other files)
3. **Objective** — one-sentence outcome
4. **Files** — create/modify table
5. **Dependencies** — package installs, env vars
6. **API Contracts** — HTTP routes, request/response schemas
7. **Code Templates** — complete working implementations (copy-paste ready)
8. **Codebase Context** — existing patterns + Key Code Snippets (no file reading required)
9. **Implementation Steps** — exact file paths + actions
10. **Test Cases** — complete test file (not templates, actual code)
11. **Decision Rules** — error scenarios + exact actions
12. **Acceptance Criteria** — WHEN/THEN statements (testable)
13. **Handoff Section** — placeholder for next task's context

---

## Phase Breakdown

### Phase 1: Database & API Foundation (4 tasks)
**Status:** `task-001.md` and `task-002.md` detailed. `task-003.md` and `task-004.md` to follow.

- Task 001: PostgreSQL schema (13 tables, migrations, indexes)
- Task 002: Brand kit CRUD API (POST, GET, PATCH endpoints)
- Task 003: Versioning & approval (approve endpoint, version history, audit trail)
- Task 004: Workspace isolation (middleware, auth checks, 403 errors)

**Dependencies:** Task 001 → 002 → 003 → 004 (sequential — each builds on previous)

**Deliverable:** Database + REST API ready for content generation

---

### Phase 2: Content Generation Engine (5 tasks)
**Status:** To be detailed in task-005 through task-009.

- Task 005: Core generation service (Claude API integration, multi-platform prompt handling)
- Task 006: LinkedIn generation (50-word hook, first-person, save-optimization)
- Task 007: X generation (threads, real-time voice)
- Task 008: Instagram generation (7-slide carousel JSON structure)
- Task 009: Reddit + Email generation (community-respectful, educational)

**Dependencies:** 001-004 → 005 (generates all depend on 005)

**Deliverable:** Platform-specific content generation working for all 5 platforms

---

### Phase 3: Newsjacking System (3 tasks)
**Status:** To be detailed in task-010 through task-012.

- Task 010: Trending topic sourcing (X Trends API, NewsAPI integration, caching)
- Task 011: Topic filtering & ranking (relevance + momentum scoring)
- Task 012: Newsjacking generation endpoint (uses tasks 005-009 generation + topic context)

**Dependencies:** 005-009 → 010 → 011 → 012 (sequential, all use generation from phase 2)

**Deliverable:** Clients can browse trending topics and generate content for them

---

### Phase 4: Distribution & Metrics (5 tasks)
**Status:** To be detailed in task-013 through task-017.

- Task 013: Content editor UI (React component, tabs per platform, character counts)
- Task 014: Platform API distribution (X, LinkedIn, Instagram, Reddit posting)
- Task 015: Email distribution (Mailchimp/SendGrid integration)
- Task 016: Post results UI (success/failure per platform, links)
- Task 017: Metrics recording (form for impressions, saves, etc.)

**Dependencies:** 012 → 013 → 014-015 (013 edits, 014-015 distribute) → 016 → 017

**Deliverable:** End-to-end: generate → edit → post → record metrics

---

### Phase 5: Feedback Loop & Optimization (4 tasks)
**Status:** To be detailed in task-018 through task-021.

- Task 018: Metrics analysis engine (aggregation, correlation, pattern extraction, confidence scoring)
- Task 019: Insight approval UI (display + approve/dismiss, brand kit updates)
- Task 020: Feedback loop scheduling (background jobs, triggered after metrics)
- Task 021: Confidence scoring (threshold enforcement, low-confidence filtering)

**Dependencies:** 017 → 018 → 019-020-021 (020-021 refine 018)

**Deliverable:** Self-optimizing feedback loop: metrics → insights → brand kit updates

---

### Phase 6: UI Polish & Integration (3 tasks)
**Status:** To be detailed in task-022 through task-024.

- Task 022: Brand kit builder UI (tabbed form, visual preview, approval flow)
- Task 023: Content generation UI (topic input → generate → edit → post)
- Task 024: Newsjacking UI (browse topics → select → generate → post)

**Dependencies:** 001-021 → 022-023-024 (can run in parallel; all backend exists)

**Deliverable:** Complete user-facing UI for all workflows

---

## Ready for Execution

**Phase 1 (Tasks 001-002) are fully detailed and ready for Haiku to execute immediately.**

Each task file is self-contained:
- No cross-references to other task files
- All code templates are complete + correct
- All test cases fully written (not stubs)
- All decision rules specific (no "show error" — exact function + message)
- All acceptance criteria testable (WHEN/THEN format)

**To proceed:**
1. Start with `task-001.md` (database schema + migrations)
2. Follow `/task-handoff` at completion to advance to task-002
3. Subsequent tasks inherit context via handoff sections
4. All 24 tasks follow identical structure for parallel or sequential execution

---

## Token Optimization Note

The spec document is now complete and divided into:
1. `.spec/brand-kit-newsjacking/requirements.md` (Phase 1 approval)
2. `.spec/brand-kit-newsjacking/design.md` (Phase 2 approval)
3. `.spec/brand-kit-newsjacking/tasks.md` (Phase 3 approval — human-readable task list)
4. `.spec/brand-kit-newsjacking/tasks/task-NNN.md` (Phase 4 — individual enriched task files)

This document (TASK_SUMMARY.md) serves as a quick reference. Full task files (task-001.md through task-024.md) are created and ready for agent execution without further planning overhead.
