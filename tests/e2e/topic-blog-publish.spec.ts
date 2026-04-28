import { test, expect } from '@playwright/test'
import { loginAsTestUser, mockAiResponses } from './helpers/auth'

test.describe('Topic → Blog → Publish golden path', () => {
  test.beforeEach(async ({ page }) => {
    await mockAiResponses(page)
    await loginAsTestUser(page)
  })

  test('navigates to dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('can enter a topic and see research results', async ({ page }) => {
    const topicInput = page.locator('[data-testid="topic-input"], input[placeholder*="topic" i], input[name="topic"]').first()
    await topicInput.fill('The future of AI content marketing')

    const startButton = page.locator('[data-testid="start-button"], button:has-text("Start"), button:has-text("Research")').first()
    await startButton.click()

    await expect(page.locator('text=Test research summary')).toBeVisible({ timeout: 10000 })
  })

  test('generates a blog article from topic', async ({ page }) => {
    const topicInput = page.locator('[data-testid="topic-input"], input[name="topic"]').first()
    await topicInput.fill('The future of AI content marketing')

    const blogButton = page.locator('button:has-text("Generate Blog"), button:has-text("Blog")').first()
    await blogButton.click()

    await expect(page.locator('text=Test Blog')).toBeVisible({ timeout: 15000 })
  })

  test('publish button is present after article generation', async ({ page }) => {
    const publishButton = page.locator('button:has-text("Publish"), [data-testid="publish-button"]')
    await expect(publishButton.first()).toBeVisible({ timeout: 5000 })
  })
})
