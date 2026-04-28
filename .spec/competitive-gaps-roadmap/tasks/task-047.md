---
task: "047"
feature: competitive-gaps-roadmap
rec: all
title: "E2E test: URL ingestion → article generation flow"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: test-expert
depends_on: ["009", "010", "011"]
---

## Skills
- `.kit/skills/testing-quality/tdd-workflow/SKILL.md`

## Agents
- `.kit/agents/software-company/qa/test-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Write a Playwright E2E test covering the URL ingestion flow: paste URL → process → transcript appears → article generates.

## Files

### Create
- `D:/content-engine/tests/e2e/url-ingestion.spec.ts`

## Codebase Context

Playwright config at `D:/content-engine/playwright.config.ts`. Existing E2E tests in `D:/content-engine/tests/`. The project runs at `http://localhost:3000` during tests.

Test user credentials are likely set via `process.env.TEST_USER_EMAIL` / `TEST_USER_PASSWORD` environment variables.

## Implementation Steps

```typescript
import { test, expect } from '@playwright/test'

test.describe('URL Ingestion Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('[data-testid="password"]', process.env.TEST_USER_PASSWORD!)
    await page.click('[data-testid="login-submit"]')
    await page.waitForURL('/dashboard')
  })

  test('paste YouTube URL → transcript preview appears', async ({ page }) => {
    await page.goto('/dashboard')
    // Switch to URL tab in ArticleUpload
    await page.click('[data-testid="url-tab"]') // or text-based
    await page.fill('[placeholder*="YouTube URL"]', 'https://youtube.com/watch?v=dQw4w9WgXcQ')
    await page.click('button:has-text("Process URL")')
    
    // Wait for preview to appear (API call with mocked or real YouTube)
    await expect(page.locator('[data-testid="url-preview"]')).toBeVisible({ timeout: 30_000 })
  })

  test('web page URL → article generation starts', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="url-tab"]')
    await page.fill('[placeholder*="YouTube URL"]', 'https://example.com')
    await page.click('button:has-text("Process URL")')
    await expect(page.locator('[data-testid="url-preview"]')).toBeVisible({ timeout: 20_000 })
  })

  test('invalid URL shows error', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="url-tab"]')
    await page.fill('[placeholder*="YouTube URL"]', 'not-a-url')
    await page.click('button:has-text("Process URL")')
    await expect(page.locator('text=Invalid URL')).toBeVisible({ timeout: 5_000 })
  })
})
```

Note: Add `data-testid` attributes to `URLIngestionInput.tsx` components during implementation:
- URL input: `data-testid="url-input"`
- Submit button: already has text "Process URL"
- Preview box: `data-testid="url-preview"`
- Tab button: `data-testid="url-tab"`

## Test Cases

- YouTube URL → preview appears (30s timeout for API call)
- Web page URL → preview appears
- Invalid URL → error message shown
- Empty URL submit → validation error shown

## Decision Rules
- Use `data-testid` attributes not CSS selectors for stability.
- 30s timeout on YouTube (API call is slow).
- Do not run E2E against production — only local dev or CI with test env.

## Acceptance Criteria
- E2E test file created with 3+ test cases.
- Tests use data-testid selectors.
- Tests added to existing Playwright config (no changes needed — auto-detected).

Status: COMPLETE
Completed: 2026-04-28T11:45:00Z
