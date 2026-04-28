import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test.describe('URL Ingestion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('paste YouTube URL → transcript preview appears', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="url-tab"]')
    await page.fill('[data-testid="url-input"]', 'https://youtube.com/watch?v=dQw4w9WgXcQ')
    await page.click('button:has-text("Process URL")')
    await expect(page.locator('[data-testid="url-preview"]')).toBeVisible({ timeout: 30_000 })
  })

  test('web page URL → preview appears', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="url-tab"]')
    await page.fill('[data-testid="url-input"]', 'https://example.com')
    await page.click('button:has-text("Process URL")')
    await expect(page.locator('[data-testid="url-preview"]')).toBeVisible({ timeout: 20_000 })
  })

  test('invalid URL shows validation error', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="url-tab"]')
    await page.fill('[data-testid="url-input"]', 'not-a-url')
    await page.click('button:has-text("Process URL")')
    await expect(page.locator('text=Invalid URL')).toBeVisible({ timeout: 5_000 })
  })

  test('empty URL submit shows validation error', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="url-tab"]')
    await page.click('button:has-text("Process URL")')
    await expect(page.locator('[data-testid="url-error"]')).toBeVisible({ timeout: 5_000 })
  })
})
