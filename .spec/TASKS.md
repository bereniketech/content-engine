# Content Engine Stability Roadmap — Task Index

**Status:** Task files generated from code review and stability roadmap  
**Total Tasks:** 33  
**Phases:** 4 (Phases 1–4, Days 1–10+)  
**Stability Target:** 6.5/10 → 10/10 (2 weeks initial), then production excellence beyond

---

## Phase 1: Unblock Production (Days 1–3, Tasks 001–024)

### Day 1: Fix Critical Issues (Tasks 001–006)
- [ ] **Task 001:** Fix hardcoded trust score in content generation (5 min)
- [ ] **Task 002:** Replace singleton in wallet.ts with factory pattern (15 min)
- [ ] **Task 003:** Replace singleton in generate.ts with factory pattern (15 min)
- [ ] **Task 004:** Replace singleton in admin/auth.ts with factory pattern (15 min)
- [ ] **Task 005:** Fix IP extraction from x-forwarded-for header (5 min)
- [ ] **Task 006:** Remove PCI-sensitive data from webhook logging (10 min)

**Day 1 Subtotal:** ~75 minutes  
**Critical Issues Fixed:** 3 (trust score, singletons, IP extraction)

---

### Day 2: Fix Subscription & Refund Logic (Tasks 007–010)
- [ ] **Task 007:** Reorder signup checks before creating auth user (1 hour)
- [ ] **Task 008:** Insert subscription row into database after Razorpay creation (30 min)
- [ ] **Task 009:** Add error handling for credit refund failures (45 min)
- [ ] **Task 010:** Soften multi-account penalty for shared devices (30 min)

**Day 2 Subtotal:** ~2 hours 45 minutes  
**High Issues Fixed:** 4 (subscriptions, refunds, signup ordering, device penalty)

---

### Day 3: Hot Path & Logging (Tasks 011–012)
- [ ] **Task 011:** Route content generation through lib/ai.ts (1 hour)
- [ ] **Task 012:** Migrate middleware logging to structured logger (15 min)

**Day 3 Subtotal:** ~1 hour 15 minutes  
**Medium Issues Fixed:** 2 (hot path, logging)

### Day 3+ (Optional): Low Priority Issues (Tasks 021–024)
- [ ] **Task 021:** Add webhook secret guard at module init (5 min)
- [ ] **Task 022:** Add index on user_devices.fingerprint_hash (10 min)
- [ ] **Task 023:** Document higherTier tie-breaking logic (5 min)
- [ ] **Task 024:** Validate and clamp max_tokens in generate route (10 min)

**Low Priority Subtotal:** ~30 minutes  
**Low Issues Fixed:** 4 (env var guard, performance index, clarity, token abuse prevention)

**Phase 1 Total:** ~5.5 hours (with low priority tasks)  
**Expected Stability After Phase 1:** 8.0/10 (8.1/10 with tasks 021–024) ✅

---

## Phase 2: Strengthen Hot Paths (Days 4–6, Tasks 013–020)

### Day 4: Admin & Rate Limiting (Tasks 013–015)
- [ ] **Task 013:** Add middleware sentinel for admin auth re-validation (45 min)
- [ ] **Task 014:** Fix IP signup limit race condition with atomic operations (1 hour)
- [ ] **Task 015:** Extract auth cookie name to shared constant (15 min)

**Day 4 Subtotal:** ~2 hours

---

### Day 5: Payment & Pricing (Tasks 016–017)
- [ ] **Task 016:** Verify/implement safe negative credit handling (1 hour)
- [ ] **Task 017:** Move FX rates from hardcoded to database (2 hours)

**Day 5 Subtotal:** ~3 hours

---

### Day 6: Test Infrastructure (Tasks 018–020)
- [ ] **Task 018:** Comprehensive tests for credit generation flow (1 hour)
- [ ] **Task 019:** Comprehensive tests for signup anti-abuse flow (1.5 hours)
- [ ] **Task 020:** Comprehensive tests for webhooks & CAPTCHA gating (2 hours)

**Day 6 Subtotal:** ~4.5 hours

**Phase 2 Total:** ~9.5 hours  
**Expected Stability After Phase 2:** 8.8/10 ✅

---

## Phase 3: Production Readiness (Days 7–10, Tasks 025–029)

### Day 7: Database Migrations & Load Testing Setup
- [ ] **Task 025:** Execute and verify database migrations (subscriptions unique constraint, FX rates table) (2 hours)
- [ ] **Task 026:** Set up load testing environment and scenarios (Artillery config, payload generators) (1.5 hours)

**Day 7 Subtotal:** ~3.5 hours

### Day 8–9: Load Testing & Security Audit
- [ ] **Task 027:** Run load tests and verify rate limits under load (2 hours)
- [ ] **Task 028:** Execute security review checklist and document findings (1.5 hours)

**Day 8–9 Subtotal:** ~3.5 hours

### Day 10: Production Deployment
- [ ] **Task 029:** Deploy to production and configure monitoring (3 hours)

**Day 10 Subtotal:** ~3 hours

**Phase 3 Total:** ~10 hours  
**Expected Stability After Phase 3:** 9.5/10 ✅

---

## Phase 4: Production Excellence (Beyond Day 10, Tasks 030–033)

### Monitoring & Incident Management
- [ ] **Task 030:** Monitor production metrics and establish SLOs (3 hours setup + ongoing)
- [ ] **Task 031:** Establish incident response and postmortem procedures (2 hours)

### Performance & Cost Optimization
- [ ] **Task 032:** Set up continuous performance profiling and optimization (2 hours setup + ongoing)
- [ ] **Task 033:** Implement cost optimization and capacity planning (2 hours + monthly reviews)

**Phase 4 Total:** ~9 hours setup + ongoing  
**Expected Stability After Phase 4:** 10.0/10 ✅ (sustained through monitoring, incident response, and continuous optimization)

---

## Task Dependencies Graph

```
task-001 (trust score)
  └─ No dependencies

task-002,003,004 (Supabase singletons)
  ├─ task-002 (wallet.ts)
  ├─ task-003 (generate.ts) ← used by task-011
  └─ task-004 (admin/auth.ts)

task-005 (IP extraction) ← used by task-007

task-006 (webhook logging)

task-007 (signup ordering) ← used by task-019
  ├─ Depends on: task-005 (IP extraction)

task-008 (subscription insert) ← used by task-020
  └─ Depends on: task-002 (Supabase factory)

task-009 (refund handling)
  └─ Depends on: task-003 (Supabase factory)

task-010 (multi-account penalty)

task-011 (hot path routing)
  └─ Depends on: task-003 (Supabase factory)

task-012 (structured logging)

task-013 (admin sentinel)

task-014 (rate limiter)

task-015 (cookie constant)

task-016 (credit deduction)

task-017 (FX rates database)

task-018 (generate tests)

task-019 (signup tests)
  └─ Depends on: task-007 (signup ordering)

task-020 (webhook tests)
  └─ Depends on: task-001 (trust score) + task-008 (subscription insert)

task-021,022,023,024 (LOW priority issues)
  ├─ task-021 (webhook secret guard) — no dependencies
  ├─ task-022 (fingerprint index) — no dependencies
  ├─ task-023 (higherTier comment) — no dependencies
  └─ task-024 (max_tokens validation) — no dependencies
```

---

## How to Use This Task List

1. **Start with Phase 1, Day 1:** Tasks 001–006 are independent and can run in parallel within a day
2. **Day 2 & 3:** Complete sequentially; some tasks depend on Day 1 changes
3. **Phase 2 (Days 4–6):** Testing is last; implement fixes first
4. **Track Progress:** Use `/task-handoff` after each task to advance to the next
5. **Dependencies:** Check `depends_on` field in each task file before starting

---

## Acceptance & Sign-Off

### After Phase 1 (Day 3):
- [ ] All 12 tasks completed
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`bun run type-check`)
- [ ] `/verify` passes on all code
- **Status:** APPROVED FOR STAGING

### After Phase 2 (Day 6):
- [ ] All 8 tasks completed
- [ ] >85% test coverage on critical paths
- [ ] All tests pass
- **Status:** APPROVED FOR LOAD TESTING

### After Phase 3 (Day 10):
- [ ] Database migrations applied
- [ ] Load tested at 100× scale
- [ ] Security audit passed
- [ ] Production deployment completed
- **Status:** APPROVED FOR PRODUCTION ✅

### After Phase 4 (Production Excellence):
- [ ] SLOs and monitoring configured
- [ ] Incident response procedures documented
- [ ] Performance profiling active
- [ ] Cost optimization identified
- [ ] 24/7 on-call coverage established
- **Status:** PRODUCTION EXCELLENCE SUSTAINED ✅

---

## Quick Commands

```bash
# Run a single task
cd d:\content-engine
cat .spec/tasks/task-001.md  # Read task

# Test a task's code
npm test                      # Run all tests
npm test -- task-name         # Run specific test

# Verify everything
npm run type-check
npm run lint
npm test

# Create next task
/task-handoff                 # Marks current task done, advances counter
```

---

## Documents Referenced

- **code-review.md** — Full detailed review with line numbers and fix code
- **REVIEW-SUMMARY.md** — Executive summary with issue breakdown
- **stability-roadmap-10-10.md** — 3-phase execution plan (Days 1–10)
- **EXTRACTED_TASKS.json** — Raw task data (source for these files)

---

## Key Metrics

| Phase | Days | Tasks | Work | Time Est. | Stability |
|-------|------|-------|------|-----------|-----------|
| 1 | 1–3 | 12 | Fix CRITICAL/HIGH issues | ~5.5h | 8.0 |
| 2 | 4–6 | 8 | Strengthen hot paths, tests | ~9.5h | 8.8 |
| 3 | 7–10 | 5 | Database, load test, security, deploy | ~10h | 9.5 |
| 4 | 10+ | 8 | Monitoring, incident response, optimization | ~9h setup | 10.0 |
| **Total** | **10+** | **33** | **All phases** | **~34 hours** | **10.0** |

---

**Generated:** 2026-04-28  
**Source:** Extracted from code-review.md, REVIEW-SUMMARY.md, stability-roadmap-10-10.md via generate-claude-md + planning-specification-architecture-software skills
