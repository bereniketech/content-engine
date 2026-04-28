---
task: "048"
feature: competitive-gaps-roadmap
rec: all
title: "E2E test: Brand voice creation → score shown in output"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: test-expert
depends_on: ["020", "021", "022", "023"]
---

## Skills
- `.kit/skills/testing-quality/tdd-workflow/SKILL.md`

## Agents
- `.kit/agents/software-company/qa/test-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Write Playwright E2E test covering: create brand voice profile → set active → generate article → brand score appears in output.

## Files

### Create
- `D:/content-engine/tests/e2e/brand-voice.spec.ts`

## Implementation Steps

```typescript
import { test, expect } from '@playwright/test'

test.describe('Brand Voice Flow', () => {
  test('create brand voice and verify score in output', async ({ page }) => {
    // Login
    await page.goto('/dashboard/brand-voice')
    
    // Create profile
    await page.click('button:has-text("Add Profile")')
    await page.fill('[placeholder="Profile name"]', 'Test Brand Voice')
    await page.fill('[placeholder*="tone adjectives"]', 'professional, clear, empathetic')
    await page.click('button:has-text("Save")')
    
    // Verify profile appears
    await expect(page.locator('text=Test Brand Voice')).toBeVisible()
    
    // Set active
    await page.click('button:has-text("Set Active")')
    await expect(page.locator('[data-active-voice]')).toBeVisible()
    
    // Navigate to generate article
    await page.goto('/dashboard')
    await page.fill('[placeholder*="topic"]', 'artificial intelligence')
    // ... trigger article generation ...
    
    // Verify brand score appears
    await expect(page.locator('[data-testid="brand-score-card"]')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('[data-testid="brand-score-value"]')).toBeVisible()
  })

  test('no active voice → brand score hidden', async ({ page }) => {
    await page.goto('/dashboard/brand-voice')
    // Ensure no active voice
    // Generate article
    // Verify brand score card NOT present
    await expect(page.locator('[data-testid="brand-score-card"]')).not.toBeVisible()
  })
})
```

Add `data-testid` to:
- `BrandScoreCard`: `data-testid="brand-score-card"`, score value `data-testid="brand-score-value"`
- Active voice indicator: `data-active-voice`

## Test Cases

- Create voice → set active → generate article → score visible
- No active voice → score card hidden

## Acceptance Criteria
- E2E test file created with 2 test cases.
- data-testid attributes added to BrandScoreCard during implementation.

Status: COMPLETE
Completed: 2026-04-28T11:45:00Z
