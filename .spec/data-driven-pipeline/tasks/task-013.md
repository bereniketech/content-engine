---
task: 013
feature: data-driven-pipeline
status: pending
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
---

# Task 013: Build Verification and Integration Smoke Test

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective

Run a full build verification and manual integration smoke test. Ensure `npm run build` passes with zero errors, all new routes respond correctly, existing pipelines are unaffected, and the complete data-driven flow works end-to-end.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```json
// [Build scripts — from package.json:4-8]
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```

### Key Patterns in Use
- **Build command:** `npm run build` runs Next.js production build with type checking.
- **Lint:** `npm run lint` runs ESLint.
- **Dev server:** `npm run dev` for manual testing.

### Architecture Decisions Affecting This Task
- This is a final verification task — no new code should be written unless fixing build/type errors discovered during verification.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-013.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Run `npm run build` — fix any type errors or build failures.
2. Run `npm run lint` — fix any linting issues.
3. Run all tests (if test runner is configured).
4. **Manual smoke test checklist:**
   - [ ] Existing topic flow: enter topic → research → SEO → blog → social — works unchanged.
   - [ ] Existing upload flow: upload article → expand — works unchanged.
   - [ ] Data-driven tab appears on dashboard alongside Topic and Upload.
   - [ ] DataDrivenForm: data mode (paste text + tone) → submit → navigates to stepper.
   - [ ] DataDrivenForm: topic mode (enter topic + tone) → submit → navigates to stepper.
   - [ ] Stepper: topic-only flow shows Research → Article → SEO+GEO → Multi-format + X Campaign.
   - [ ] Stepper: data-sufficient flow skips research, goes straight to Article.
   - [ ] Article step streams content in real-time.
   - [ ] SEO+GEO produces both SEO and GEO fields.
   - [ ] Multi-format and X campaign fire in parallel after SEO+GEO.
   - [ ] All output pages render correctly (blog, LinkedIn, Medium, newsletter, X campaign).
   - [ ] Copy buttons work on all output pages.
   - [ ] X campaign shows 10 posts with correct phase colors.
   - [ ] Sidebar Data Pipeline links navigate correctly.
   - [ ] History shows data-driven sessions with correct badges.
   - [ ] Page reload restores stepper state from saved assets.
5. Fix any issues discovered during testing.

_Requirements: All_
_Skills: /code-writing-software-development — build verification_

---

## Acceptance Criteria
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes
- [ ] Existing topic and upload flows work unchanged
- [ ] Data-driven tab and form work correctly
- [ ] All 6 API routes respond to well-formed requests
- [ ] Stepper orchestrates the full pipeline
- [ ] All 5 output pages render and copy correctly
- [ ] Dashboard integration (sidebar, tabs, history, SummaryPanel) works
- [ ] No regressions in existing functionality
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
