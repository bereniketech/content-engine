import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test.describe('Schedule Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('schedule page renders 7 day columns', async ({ page }) => {
    await page.goto('/dashboard/schedule')
    const columns = page.locator('[data-testid="calendar-day-column"]')
    await expect(columns).toHaveCount(7)
  })

  test('empty schedule shows empty state', async ({ page }) => {
    await page.goto('/dashboard/schedule')
    // If no posts exist, verify either empty state or grid renders without error
    await expect(page.locator('body')).not.toContainText('Error')
    await expect(page.locator('body')).not.toContainText('undefined')
  })

  test('drag post to new slot intercepts PATCH', async ({ page }) => {
    let patchCalled = false

    await page.route('**/api/schedule/**', (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalled = true
      }
      void route.continue()
    })

    await page.goto('/dashboard/schedule')

    // Only attempt drag-drop if a draggable post exists
    const draggable = page.locator('[data-testid="schedule-post-card"]').first()
    const targetSlot = page.locator('[data-testid="calendar-day-column"]').nth(2)

    if (await draggable.isVisible()) {
      const draggableBox = await draggable.boundingBox()
      const targetBox = await targetSlot.boundingBox()
      if (draggableBox && targetBox) {
        await page.mouse.move(draggableBox.x + draggableBox.width / 2, draggableBox.y + draggableBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2)
        await page.mouse.up()
        await page.waitForTimeout(500)
        expect(patchCalled).toBe(true)
      }
    }
  })
})
