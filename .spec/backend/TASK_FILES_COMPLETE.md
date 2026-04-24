---
title: All Task Files Complete — Content Engine Backend (17 Tasks)
description: Complete list of all individual task files for backend implementation
date: 2026-04-24
status: All Tasks Created and Ready for Implementation
---

# Content Engine Backend — Complete Task Files Index

**Status:** ✅ All 17 task files created and ready for execution  
**Total Phases:** 7 (Foundation → Deployment)  
**Total Tasks:** 17  
**Estimated Timeline:** 16-25 days

---

## Phase 1: Foundation — Database Schema & Auth Middleware (5 tasks, ~12 hours)

| Task | File | Goal | Est. Time |
|------|------|------|-----------|
| 1.1 | task-1-1.md | FastAPI project structure | 2h |
| 1.2 | task-1-2.md | SQLAlchemy ORM models (13 tables) | 3h |
| 1.3 | task-1-3.md | Database connection & Alembic migrations | 3h |
| 1.4 | task-1-4.md | Supabase JWT auth middleware | 2h |
| 1.5 | task-1-5.md | Error handling & response models | 2h |

---

## Phase 2: Brand Kit Service — CRUD & Versioning (2 tasks, ~5 hours)

| Task | File | Goal | Est. Time |
|------|------|------|-----------|
| 2.1 | task-2-1.md | Brand kit CRUD endpoints | 3h |
| 2.2 | task-2-2.md | Brand kit versioning & approval | 2h |

---

## Phase 3: Content Generation Service (2 tasks, ~6 hours)

| Task | File | Goal | Est. Time |
|------|------|------|-----------|
| 3.1 | task-3-1.md | Content generation job queuing (CloudMQ) | 2h |
| 3.2 | task-3-2.md | Claude API integration with background worker | 4h |

---

## Phase 4: Platform Distribution Service (2 tasks, ~8 hours)

| Task | File | Goal | Est. Time |
|------|------|------|-----------|
| 4.1 | task-4-1.md | Distribution job queueing | 2h |
| 4.2 | task-4-2.md | Multi-platform API integrations (X, LinkedIn, Instagram, Reddit, Email) | 6h |

---

## Phase 5: Metrics & Feedback Loop (2 tasks, ~5 hours)

| Task | File | Goal | Est. Time |
|------|------|------|-----------|
| 5.1 | task-5-1.md | Metrics ingestion endpoint | 2h |
| 5.2 | task-5-2.md | Feedback loop engine with insight generation | 3h |

---

## Phase 6: Newsjacking Service (2 tasks, ~4 hours)

| Task | File | Goal | Est. Time |
|------|------|------|-----------|
| 6.1 | task-6-1.md | Trending topics sourcing from X Trends + NewsAPI | 2h |
| 6.2 | task-6-2.md | Newsjacking content generation with contextualization prompts | 2h |

---

## Phase 7: Deployment & CI/CD (3 tasks, ~4 hours)

| Task | File | Goal | Est. Time |
|------|------|------|-----------|
| 7.1 | task-7-1.md | Docker multi-stage build | 1h |
| 7.2 | task-7-2.md | GitHub Actions CI/CD pipeline | 2h |
| 7.3 | task-7-3.md | Render deployment configuration (Web Service + Background Worker) | 1h |

---

## Task Execution Order (Dependencies)

```
PHASE 1 (Sequential)
├─ Task 1.1 (Foundation)
├─ Task 1.2 (Models) → depends on 1.1
├─ Task 1.3 (DB) → depends on 1.1, 1.2
├─ Task 1.4 (Auth) → depends on 1.1, 1.3
└─ Task 1.5 (Errors) → depends on 1.1, 1.4

PHASE 2 (Sequential)
├─ Task 2.1 (CRUD) → depends on 1.1-1.5
└─ Task 2.2 (Versioning) → depends on 2.1

PHASE 3 (Sequential)
├─ Task 3.1 (Job Queuing) → depends on 3.1, 2.1
└─ Task 3.2 (Claude API) → depends on 3.1

PHASE 4 (Sequential)
├─ Task 4.1 (Distribution Queuing) → depends on 3.1, 2.1
└─ Task 4.2 (Platform APIs) → depends on 4.1

PHASE 5 (Sequential)
├─ Task 5.1 (Metrics) → depends on 4.2
└─ Task 5.2 (Feedback Loop) → depends on 5.1

PHASE 6 (Sequential)
├─ Task 6.1 (Trending Topics) → depends on 3.1
└─ Task 6.2 (Newsjacking Generation) → depends on 6.1, 3.1

PHASE 7 (Sequential)
├─ Task 7.1 (Docker) → depends on 1.1, 1.3
├─ Task 7.2 (CI/CD) → depends on 1.1, 7.1
└─ Task 7.3 (Render) → depends on 7.1, 7.2
```

---

## File Structure After Completion

```
content-engine-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          [Task 1.1]
│   ├── config.py                        [Task 1.3]
│   ├── database.py                      [Task 1.3]
│   ├── worker.py                        [Task 3.2]
│   ├── worker_distribution.py           [Task 4.2]
│   ├── worker_feedback_loop.py          [Task 5.2]
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                    [Task 1.3]
│   │   ├── database.py                  [Task 1.3]
│   │   ├── auth.py                      [Task 1.4]
│   │   ├── errors.py                    [Task 1.5]
│   │   └── cloudmq.py                   [Task 3.1]
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth.py                      [Task 1.4]
│   │   └── error_handler.py             [Task 1.5]
│   ├── models/
│   │   ├── __init__.py                  [Task 1.2]
│   │   ├── base.py                      [Task 1.2]
│   │   ├── workspace.py                 [Task 1.2]
│   │   ├── brand_kit.py                 [Task 1.2]
│   │   ├── content.py                   [Task 1.2]
│   │   ├── metrics.py                   [Task 1.2]
│   │   ├── insights.py                  [Task 1.2]
│   │   ├── newsjacking.py               [Task 1.2]
│   │   └── jobs.py                      [Task 1.2]
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py                    [Task 1.5]
│   │   ├── brand_kit.py                 [Task 2.1]
│   │   ├── content.py                   [Task 3.1]
│   │   ├── distribution.py              [Task 4.1]
│   │   ├── metrics.py                   [Task 5.1]
│   │   └── newsjacking.py               [Task 6.2]
│   ├── services/
│   │   ├── __init__.py
│   │   ├── brand_kit_service.py         [Task 2.1]
│   │   ├── content_generation_service.py [Task 3.1]
│   │   ├── claude_service.py            [Task 3.2]
│   │   ├── prompt_builder.py            [Task 3.2]
│   │   ├── distribution_service.py      [Task 4.1]
│   │   ├── x_service.py                 [Task 4.2]
│   │   ├── linkedin_service.py          [Task 4.2]
│   │   ├── instagram_service.py         [Task 4.2]
│   │   ├── reddit_service.py            [Task 4.2]
│   │   ├── email_service.py             [Task 4.2]
│   │   ├── job_service.py               [Task 3.1]
│   │   ├── metrics_service.py           [Task 5.1]
│   │   ├── feedback_loop_service.py     [Task 5.2]
│   │   └── newsjacking_service.py       [Task 6.1]
│   ├── integrations/
│   │   ├── __init__.py
│   │   ├── x_trends.py                  [Task 6.1]
│   │   └── newsapi.py                   [Task 6.1]
│   └── api/
│       ├── __init__.py
│       └── routes/
│           ├── __init__.py
│           ├── brand_kits.py            [Task 2.1]
│           ├── content.py               [Task 3.1]
│           ├── jobs.py                  [Task 3.1]
│           ├── distribution.py          [Task 4.1]
│           ├── metrics.py               [Task 5.1]
│           ├── insights.py              [Task 5.2]
│           └── newsjacking.py           [Task 6.1]
├── alembic/                             [Task 1.3]
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 0001_initial_schema.py
├── tests/                               [All phases]
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_brand_kits.py
│   ├── test_content_generation.py
│   ├── test_distribution.py
│   ├── test_metrics.py
│   └── test_newsjacking.py
├── .github/workflows/
│   ├── ci.yml                           [Task 7.2]
│   └── deploy.yml                       [Task 7.2]
├── Dockerfile                           [Task 7.1]
├── docker-entrypoint.sh                 [Task 7.1]
├── .dockerignore                        [Task 7.1]
├── requirements.txt                     [Task 1.1]
├── pyproject.toml                       [Task 1.1]
├── .env.example                         [Task 1.1]
├── .gitignore                           [Task 1.1]
├── .spec/
│   ├── requirements.md
│   ├── design.md
│   ├── TASK_PLAN.md
│   ├── TASK_FILES_SUMMARY.md
│   └── tasks/
│       ├── task-1-1.md through task-7-3.md
└── .claude/
    ├── CLAUDE.md
    └── project-config.md
```

---

## How to Use These Task Files

### For Each Task:

1. **Read the task file** in `.spec/tasks/task-N-N.md`
2. **Review Context & Acceptance Criteria** — understand what success looks like
3. **Follow Implementation Steps** — detailed, with code snippets
4. **Run Verification Checklist** — verify before moving to next task
5. **Commit with provided message** — maintains clean commit history
6. **Move to next task** in dependency order

### Template Structure (All Tasks Follow This):

```markdown
---
phase: N
task_number: N.N
title: Task Title
description: One-line summary
dependencies: [Previous tasks]
parallel: true/false
estimated_time: N hours
---

# Task N.N: Title

## Context — Why this task matters
## Acceptance Criteria — Testable requirements
## Files to Create — Full list
## Files to Modify — If applicable
## Implementation Steps — Code + guidance
## Test Cases — Manual testing examples
## Verification Checklist — Before moving on
## Commit Message — Ready to use
## Notes — Gotchas and patterns
```

---

## Estimated Timeline

| Phase | Days | Notes |
|-------|------|-------|
| 1. Foundation | 2-3 | Sequential; establishes scaffold |
| 2. Brand Kit | 1-2 | CRUD + versioning; straightforward |
| 3. Content Gen | 3-5 | Claude integration + async jobs |
| 4. Distribution | 4-6 | Multiple platform integrations |
| 5. Metrics | 3-4 | Ingestion + analytics |
| 6. Newsjacking | 2-3 | Trend sourcing + generation |
| 7. Deployment | 1-2 | Docker + CI/CD + Render |
| **Total** | **16-25 days** | Parallelizable after Phase 1 |

---

## Parallel Work Opportunities

After Phase 1 completes:

- **Phases 2-6** can overlap:
  - Frontend team: Task 2.1 (Brand Kit CRUD) while backend does Task 3.1-3.2 (Content Gen)
  - Backend can work on Phase 4-6 in parallel once Phase 2-3 complete
  - Deployment (Phase 7) can start once Docker is ready (after Phase 1)

- **Recommended parallelization:**
  - Week 1: Phase 1 (sequential foundation)
  - Week 2-3: Phase 2-4 (frontend integrates as backend APIs complete)
  - Week 4: Phase 5-6 (metrics + newsjacking parallel)
  - Week 4-end: Phase 7 (deployment) + final integration testing

---

## Next Steps

1. **Begin Phase 1, Task 1.1** — FastAPI project structure
2. **After Task 1.5** — Phase 1 complete, can start Phase 2
3. **After Task 2.1** — Frontend can integrate Brand Kit endpoints
4. **After Task 3.2** — Content generation available for integration

---

## Success Criteria

By end of all 17 tasks, you will have:

- ✅ Fully functional FastAPI backend with 13-table PostgreSQL schema
- ✅ Multi-tenant workspace isolation via Supabase JWT
- ✅ Brand kit CRUD + versioning system
- ✅ Content generation via Claude API with platform-specific prompts
- ✅ Multi-platform distribution (X, LinkedIn, Instagram, Reddit, Email)
- ✅ Metrics ingestion + feedback loop with auto-insights
- ✅ Newsjacking with trending topics + contextualized generation
- ✅ Async job processing via CloudMQ with status polling
- ✅ Docker containerization + GitHub Actions CI/CD
- ✅ Render deployment with Web Service + Background Worker
- ✅ >90% test coverage with integration tests
- ✅ Fully documented via OpenAPI/Swagger

---

**Status:** All 17 task files complete and ready for implementation.  
**Begin:** Start with Task 1.1 (`task-1-1.md`).  
**Support:** Each task includes implementation steps, test cases, and verification checklists.

---

Last updated: 2026-04-24
