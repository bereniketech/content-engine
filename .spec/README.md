# Content Engine Spec & Tasks

This directory contains the complete task breakdown for the **Content Engine Stability Roadmap** — a 10-day execution plan to move the system from **6.5/10 to 9.5/10 stability**.

## What's Here

### Task Files
- **`tasks/task-001.md` through `tasks/task-024.md`** — 24 self-contained, executable task files
  - Phase 1: tasks 001–020 (20 CRITICAL/HIGH/MEDIUM issues)
  - Phase 1+: tasks 021–024 (4 LOW priority issues)
  - Each task has: objective, code templates, acceptance criteria, dependencies, and test cases
  - Format: Claude Code planning skill template (Phase 4 Task Enrichment)
  - Ready for execution by Claude agents with zero additional context needed

### Index & Reference
- **`TASKS.md`** — High-level task index with dependencies graph and timeline
- **`README.md`** — This file

### Source Documents
- **`../docs/code-review.md`** — Comprehensive code review (17 issues, 100+ findings)
- **`../docs/REVIEW-SUMMARY.md`** — Executive summary (3-issue verdict)
- **`../docs/stability-roadmap-10-10.md`** — 3-phase execution plan (Days 1–10)

---

## Quick Start

### For Project Managers / Team Leads
1. Open `TASKS.md` for a bird's-eye view of all 24 tasks
2. Check the dependencies graph to understand execution order
3. Phase 1 (Days 1–3): 12 critical/high tasks, ~5 hours (required)
4. Phase 1+ (Optional): 4 low priority tasks, ~30 min (recommended)
5. Phase 2 (Days 4–6): 8 hardening/test tasks, ~9.5 hours total

### For Engineers
1. Start with **Task 001** — read `tasks/task-001.md`
2. Follow the "Implementation Steps" section exactly
3. The "Code Templates" section has before/after code ready to use
4. After completing: run `/task-handoff` to advance to the next task
5. Each task includes test cases — use those to verify success

### For CI/CD Integration
Each task file can be parsed as:
```yaml
task_id: 001
phase: 1
day: 1
agent: software-developer-expert
skills:
  - .kit/skills/development/code-writing-software-development/SKILL.md
dependencies: []
time_estimate: "5 minutes"
files_affected:
  - app/api/content/generate/route.ts
acceptance_criteria:
  - WHEN user trust score < 40 THEN /api/content/generate requires CAPTCHA
  - ...
```

---

## Task Structure Overview

Each `task-NNN.md` file includes:

| Section | Purpose |
|---------|---------|
| **Frontmatter** | Task ID, phase, status, agent assignment, dependencies |
| **Objective** | One-sentence goal; what this task produces |
| **Files** | Which files are created/modified |
| **Code Templates** | Before/after code ready to copy-paste |
| **Implementation Steps** | Exact sequence of changes |
| **Test Cases** | Complete test code to verify success |
| **Decision Rules** | Error handling and edge cases |
| **Acceptance Criteria** | WHEN/THEN statements; checks at task end |

**All information needed to complete a task is inside the task file.** No need to read the codebase first.

---

## Phase Breakdown

### **Phase 1: Unblock Production (Days 1–3)**
**3 CRITICAL + 6 HIGH issues fixed**  
**Timeline:** ~5 hours  
**Result:** Stability 8.0/10 → Ready for staging

| Day | Tasks | Focus | Time |
|-----|-------|-------|------|
| 1 | 001–006 | CRITICAL issues (hardcoded trust score, 3× singletons, IP extraction) + webhook logging | ~75 min |
| 2 | 007–010 | HIGH issues (signup reordering, subscriptions, refund handling, device penalty) | ~2h 45m |
| 3 | 011–012 | MEDIUM issues (hot path routing, logging) | ~1h 15m |

**Phase 1 Entry Criteria:** Code review completed, issues identified  
**Phase 1 Exit Criteria:** All 12 tasks green, tests pass, `/verify` clean

---

### **Phase 2: Strengthen Hot Paths (Days 4–6)**
**6 MEDIUM issues fixed + comprehensive test coverage added**  
**Timeline:** ~9.5 hours  
**Result:** Stability 8.8/10 → Ready for load testing

| Day | Tasks | Focus | Time |
|-----|-------|-------|------|
| 4 | 013–015 | Admin auth sentinel, rate limiter atomicity, cookie constant | ~2h |
| 5 | 016–017 | Credit deduction safety, FX rates database | ~3h |
| 6 | 018–020 | Comprehensive test suites (3 critical paths) | ~4.5h |

**Phase 2 Entry Criteria:** Phase 1 complete, all code merged  
**Phase 2 Exit Criteria:** All 8 tasks green, >85% test coverage, tests pass

---

### **Phase 3: Production Readiness (Days 7–10)**
**Infrastructure, documentation, load testing, security audit**  
**Timeline:** ~5 days (not in task files; see stability-roadmap-10-10.md Days 7–10)  
**Result:** Stability 9.5/10 → Ready for production

**Phase 3 Deliverables:**
- Database migrations (subscriptions, device fingerprints, FX rates)
- Load test at 100× scale
- External security audit
- Deployment documentation + runbooks

---

## Dependency Management

**Key dependency chains:**

```
CRITICAL PATH:
task-001 (trust score)
  ↓ (used by task-020)
task-020 (webhook tests)

SUPABASE FACTORY PATTERN:
task-002 (wallet.ts)
  ↓
task-008 (subscription) uses task-002

task-003 (generate.ts)
  ↓ (used by task-011, task-009)
task-011 (hot path)
task-009 (refund handling)

SIGNUP FLOW:
task-007 (reorder checks)
  ↓ (used by task-019)
task-019 (signup tests)
```

**Rule:** A task can only start after all items in its `depends_on` list are complete.

---

## Metrics & Success Criteria

### Phase 1 Success
- [ ] 0 CRITICAL issues remaining
- [ ] All HIGH issues resolved
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Staging deployment succeeds
- **Checkpoint:** APPROVED FOR STAGING

### Phase 2 Success
- [ ] 0 HIGH issues remaining
- [ ] >85% test coverage on `lib/` and `app/api/`
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Load tests ready
- **Checkpoint:** APPROVED FOR LOAD TESTING

### Phase 3 Success
- [ ] Load tested at 100× scale
- [ ] All metrics green (p95 latency, error rates, rate limits)
- [ ] Security audit passed
- [ ] Deployment docs complete
- **Checkpoint:** APPROVED FOR PRODUCTION
- **Stability Score:** 9.5/10

---

## How Tasks Were Generated

1. **Input:** 3 source documents
   - `code-review.md` — 1,000+ lines, 17 issues with exact line numbers and fix code
   - `REVIEW-SUMMARY.md` — Executive summary with issue breakdown
   - `stability-roadmap-10-10.md` — 3-phase execution plan with daily deliverables

2. **Process:** Claude agents extracted structured task data
   - Parsed daily tasks from roadmap
   - Cross-referenced code locations from code review
   - Matched time estimates and agent assignments
   - Identified dependencies and groupings

3. **Output:** 20 task files in Claude Code planning format
   - Each task self-contained and independently executable
   - Task files can be loaded into execution without reading any other files
   - Code templates ready to copy-paste
   - Test cases included

4. **Format:** Planning skill Phase 4 (Task Enrichment)
   - Follows `planning-specification-architecture-software/SKILL.md` template
   - Compatible with Claude Code `/task-handoff` workflow
   - Ready for both human engineers and AI agents

---

## File Manifest

```
.spec/
├── README.md                    ← You are here
├── TASKS.md                     ← High-level index + dependencies
├── tasks/
│   ├── task-001.md             ← Fix hardcoded trust score
│   ├── task-002.md             ← Singleton (wallet.ts)
│   ├── task-003.md             ← Singleton (generate.ts)
│   ├── task-004.md             ← Singleton (admin/auth.ts)
│   ├── task-005.md             ← IP extraction
│   ├── task-006.md             ← Webhook logging
│   ├── task-007.md             ← Signup reordering
│   ├── task-008.md             ← Subscription insert
│   ├── task-009.md             ← Refund error handling
│   ├── task-010.md             ← Device penalty
│   ├── task-011.md             ← Hot path routing
│   ├── task-012.md             ← Logging
│   ├── task-013.md             ← Admin sentinel
│   ├── task-014.md             ← Rate limiter
│   ├── task-015.md             ← Cookie constant
│   ├── task-016.md             ← Credit deduction
│   ├── task-017.md             ← FX rates database
│   ├── task-018.md             ← Generate tests
│   ├── task-019.md             ← Signup tests
│   └── task-020.md             ← Webhook tests
└── ../docs/
    ├── code-review.md          ← Full review (source)
    ├── REVIEW-SUMMARY.md       ← Executive summary (source)
    └── stability-roadmap-10-10.md ← Execution plan (source)
```

---

## Getting Help

**For task clarification:**
- Read the "Objective" section in the task file
- Check "Code Templates" for the exact before/after code
- Review "Acceptance Criteria" to verify you're done

**For dependencies:**
- Open `TASKS.md` and find the task in the graph
- Check the `depends_on` field in task frontmatter
- Complete dependency tasks first

**For code context:**
- The "Codebase Context" section in each task has key code snippets
- No file reading required; all context is inlined
- If you need more, the `Implementation Steps` will tell you

**For urgent issues:**
- Phase 1 (Days 1–3) are critical path; focus there first
- Phase 1 has zero dependencies between tasks 001–006 (can parallelize)

---

## Next Steps

### For Execution
1. Open `.spec/tasks/task-001.md`
2. Follow Implementation Steps in order
3. Use Code Templates to implement changes
4. Run test cases to verify
5. Use `/task-handoff` when done → advances to task-002

### For Planning / CI Integration
1. Parse all task files (JSON or YAML format from frontmatter)
2. Build execution plan respecting dependencies
3. Assign agents based on `agent:` field
4. Track progress against `status:` field (pending → in_progress → completed)

### For Status Reporting
1. Track completion rate: `completed_tasks / 20 * 100%`
2. Report phase completion: Phase 1 (12/12) → APPROVED FOR STAGING
3. Monitor stability score progression: 6.5 → 8.0 → 8.8 → 9.5

---

**Generated:** 2026-04-28  
**Roadmap Version:** 2 weeks (Phase 1–2 focused, Phase 3 separate)  
**Source:** code-review.md, REVIEW-SUMMARY.md, stability-roadmap-10-10.md  
**Tool Chain:** generate-claude-md + planning-specification-architecture-software skills
