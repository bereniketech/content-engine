# Backend Specification Complete

**Date:** 2026-04-24  
**Status:** Phase 2 (Design) Complete — Ready for Task Planning

---

## Delivered Artifacts

### Frontend (content-engine)
✅ `.claude/CLAUDE.md` — Updated with brand kit + newsjacking system  
✅ `.spec/brand-kit-newsjacking/requirements.md` (approved)  
✅ `.spec/brand-kit-newsjacking/design.md` (approved)  
✅ `.spec/brand-kit-newsjacking/tasks.md` (approved)  
✅ `.spec/brand-kit-newsjacking/tasks/task-001.md` — PostgreSQL schema  
✅ `.spec/brand-kit-newsjacking/tasks/task-002.md` — Brand kit CRUD API  
✅ `.spec/brand-kit-newsjacking/tasks/TASK_SUMMARY.md` — Overview of 24 tasks  

### Backend (content-engine-backend) — NEW
✅ `.claude/CLAUDE.md` — Backend project setup  
✅ `.spec/requirements.md` — 14 requirements (Phase 1)  
✅ `.spec/design.md` — Full architecture + API design (Phase 2)  
⏳ `.spec/tasks.md` — Task plan (Phase 3, ready on approval)  
⏳ `.spec/tasks/task-NNN.md` — Individual task files (Phase 4, ready on approval)  

---

## What You Get (Backend)

### FastAPI Microservice
- RESTful API for all content engine operations
- Supabase JWT authentication + workspace isolation
- CloudMQ job queue integration (async processing)
- PostgreSQL database schema (shared with frontend via Supabase)

### Services Provided
1. **Brand Kit Service** — CRUD + versioning + approval workflow
2. **Content Generation Service** — Claude API integration with platform-specific rules
3. **Distribution Service** — X, LinkedIn, Instagram, Reddit, Email posting
4. **Metrics Service** — Performance tracking ingestion
5. **Feedback Loop Service** — Insights generation from metrics
6. **Newsjacking Service** — Trending topic sourcing + filtering

### Job Processing
- Background worker processes long-running operations (generation, distribution, metrics)
- CloudMQ handles job queuing (serverless, no infrastructure)
- Render Background Worker handles job processing

### Deployment
- Render (Web Service + Background Worker)
- Supabase PostgreSQL (managed database)
- GitHub Actions CI/CD (automatic deployment on merge)

---

## Architecture Diagram

```
┌──────────────────────────────────┐
│    Next.js Frontend              │
│   (content-engine project)       │
│  Brand Kit UI → Generation UI    │
└────────────┬──────────────────────┘
             │ REST API + JWT
             ▼
┌──────────────────────────────────┐
│    FastAPI Backend               │
│  (content-engine-backend)        │
│  Render Web Service              │
│                                  │
│ • Brand kit CRUD                 │
│ • Content generation (queue)     │
│ • Distribution APIs              │
│ • Metrics ingestion              │
│ • Feedback loop                  │
│ • Newsjacking                    │
└────────┬──────────────────────────┘
         │
    ┌────┼────┐
    │    │    │
    ▼    ▼    ▼
┌──────────────────────────────────┐
│  PostgreSQL + CloudMQ + Render   │
│  Background Worker               │
│                                  │
│ Job Processing:                  │
│ • Claude API calls               │
│ • Platform posting               │
│ • Metrics analysis               │
└──────────────────────────────────┘
```

---

## Tech Stack Summary

| Component | Technology | Why |
|-----------|-----------|-----|
| Framework | FastAPI | Async, type-safe, minimal overhead |
| Language | Python 3.11+ | Same as current project |
| Database | PostgreSQL (Supabase) | Relational, managed, auth integration |
| Auth | Supabase JWT | Token-based, stateless, workspace isolation |
| Job Queue | CloudMQ | Serverless, no infra management |
| Worker | Render Background | Managed, auto-scaling |
| Deployment | Render | Easy setup, auto-scaling, affordable |
| Testing | pytest | Python standard, asyncio support |

---

## Phases Overview

### Phase 1: Foundation (Database + Auth)
- PostgreSQL schema + migrations
- Supabase JWT middleware
- Workspace isolation enforcement
- Health check endpoint

### Phase 2: Brand Kit Service
- CRUD endpoints (POST, GET, PATCH, DELETE)
- Versioning + approval workflow
- Version history + revert
- Input validation

### Phase 3: Content Generation
- Claude API integration
- Platform-specific prompting (LinkedIn, X, Instagram, Reddit, Email)
- CloudMQ job queuing
- Job status polling

### Phase 4: Distribution
- Platform API integrations (X, LinkedIn, Instagram, Reddit)
- Email delivery (Mailchimp/SendGrid)
- Retry logic + error handling
- Status tracking per platform

### Phase 5: Metrics & Feedback Loop
- Metrics ingestion endpoint
- Pattern extraction (tone, format, topic)
- Insight generation
- Brand kit auto-updates

### Phase 6: Newsjacking
- Trending topic sourcing (X Trends, NewsAPI)
- Relevance + momentum scoring
- Topic filtering + ranking
- Newsjacking generation endpoint

### Phase 7: Deployment & Polish
- Docker setup
- Render deployment configuration
- GitHub Actions CI/CD
- Monitoring + logging setup

---

## Next Steps

**Option 1: Approve Backend Spec (Recommended)**
- Reply 'approved' to advance to Phase 3 (Task Planning)
- Backend tasks will be detailed (similar to frontend)
- Start both frontend + backend development in parallel

**Option 2: Request Changes**
- Ask questions about design/architecture
- Request modifications to requirements or design
- Will update spec and re-submit for approval

---

## File Locations

Backend project: `C:\Users\Hp\Desktop\Experiment\content-engine-backend\`

Key files:
- `.claude/CLAUDE.md` — Project setup
- `.spec/requirements.md` — Phase 1 approval ✅
- `.spec/design.md` — Phase 2 approval ✅
- `.spec/tasks.md` — Phase 3 (waiting for approval)

---

**Ready to proceed. Reply 'approved' to continue to task planning phase.**
