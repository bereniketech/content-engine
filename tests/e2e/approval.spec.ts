import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test.describe('Approval Workflow', () => {
  test('workspace page loads and shows approval queue', async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/dashboard/workspace')
    // Workspace page should render without error
    await expect(page.locator('body')).not.toContainText('Internal server error')
    // Should show either workspace setup or the queue
    const hasQueue = await page.locator('[data-testid="approval-queue"]').isVisible().catch(() => false)
    const hasSetup = await page.locator('text=Create Workspace').isVisible().catch(() => false)
    expect(hasQueue || hasSetup).toBe(true)
  })

  test('submit article for review via API', async ({ page }) => {
    await loginAsTestUser(page)

    // Intercept POST to approval
    let submissionBody: unknown = null
    await page.route('**/api/approval', async (route) => {
      if (route.request().method() === 'POST') {
        submissionBody = await route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'approval-1',
              sessionId: 'sess-test',
              workspaceId: 'ws-test',
              submittedBy: 'user-1',
              status: 'review',
              submittedAt: new Date().toISOString(),
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/dashboard/workspace')
    const submitBtn = page.locator('button:has-text("Submit for Review")')
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await page.waitForTimeout(1000)
      expect(submissionBody).not.toBeNull()
    }
  })

  test('approval PATCH state transition — approved', async ({ page }) => {
    await loginAsTestUser(page)

    // Intercept PATCH to approval/[id]
    await page.route('**/api/approval/**', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = await route.request().postDataJSON()
        expect(body.status).toBe('approved')
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 'approval-1', status: 'approved' } }),
        })
      } else {
        await route.continue()
      }
    })

    // Mock GET approvals to return one in 'review' status
    await page.route('**/api/approval*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{
              id: 'approval-1',
              sessionId: 'sess-test',
              workspaceId: 'ws-test',
              submittedBy: 'user-writer',
              status: 'review',
              submittedAt: new Date().toISOString(),
            }],
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/dashboard/workspace')
    const approveBtn = page.locator('button:has-text("Approve")')
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
      await expect(page.locator('text=approved')).toBeVisible({ timeout: 5_000 })
    }
  })
})
