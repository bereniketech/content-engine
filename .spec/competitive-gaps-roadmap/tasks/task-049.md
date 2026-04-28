---
task: "049"
feature: competitive-gaps-roadmap
rec: all
title: "E2E test: Schedule drag-drop and approval workflow"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: test-expert
depends_on: ["016", "017", "018", "019", "035", "036", "037"]
---

## Skills
- `.kit/skills/testing-quality/tdd-workflow/SKILL.md`

## Agents
- `.kit/agents/software-company/qa/test-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Write Playwright E2E tests for the schedule drag-drop flow and the approval state machine transition.

## Files

### Create
- `D:/content-engine/tests/e2e/schedule.spec.ts`
- `D:/content-engine/tests/e2e/approval.spec.ts`

## Implementation Steps

### schedule.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test('schedule page renders weekly grid', async ({ page }) => {
  // Login + navigate
  await page.goto('/dashboard/schedule')
  // Verify 7 day columns
  const columns = page.locator('[data-testid="calendar-day-column"]')
  await expect(columns).toHaveCount(7)
})

test('drag post to new slot updates DB', async ({ page }) => {
  // Create a scheduled post first via API (setup)
  // Navigate to schedule
  // Perform drag: grab card, drop on new slot
  // Verify card appears in new slot
  // Verify PATCH API was called (intercept network)
  await page.route('/api/schedule/*', route => {
    expect(route.request().method()).toBe('PATCH')
    route.continue()
  })
})
```

Add `data-testid="calendar-day-column"` to each day column in `ScheduleCalendar`.

### approval.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test('writer submits for review → editor approves', async ({ browser }) => {
  const writerContext = await browser.newContext()
  const editorContext = await browser.newContext()
  
  // Writer submits
  const writerPage = await writerContext.newPage()
  // ... login as writer, submit article for review ...
  
  // Editor approves
  const editorPage = await editorContext.newPage()
  // ... login as editor, see queue, approve ...
  await expect(editorPage.locator('text=approved')).toBeVisible()
  
  await writerContext.close()
  await editorContext.close()
})
```

## Test Cases

- Schedule page: 7 day columns rendered
- Drag-drop: PATCH called after drop
- Approval: writer submits → editor sees in queue → editor approves → status='approved'

## Decision Rules
- Approval E2E requires two test users (writer + editor) with different credentials.
- Use `page.route()` to verify network calls without full integration.
- Drag events in Playwright: `page.dragAndDrop(source, target)` or manual dispatchEvent.

## Acceptance Criteria
- Two E2E test files created.
- Schedule: weekly grid verified, drag-drop PATCH intercepted.
- Approval: multi-context test with two user roles.

Status: COMPLETE
Completed: 2026-04-28T11:45:00Z
