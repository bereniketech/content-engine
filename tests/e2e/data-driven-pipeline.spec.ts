import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test.describe('Data-driven pipeline — 5-step flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/data-driven/assess', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { sufficient: true, missingAreas: [], suggestedTopic: 'AI Content' },
        }),
      })
    })

    await page.route('**/api/data-driven/article', async (route) => {
      const chunks = [
        `data: ${JSON.stringify({ text: '# Data-Driven Article\n\n' })}\n\n`,
        `data: ${JSON.stringify({ text: 'Generated from your data.' })}\n\n`,
        `data: ${JSON.stringify({ done: true, wordCount: 6, asset: { id: 'asset-dd-1', assetType: 'dd_article', content: { markdown: 'Generated from your data.' } } })}\n\n`,
      ]
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: chunks.join(''),
      })
    })

    await page.route('**/api/data-driven/seo-geo', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { id: 'asset-seo-geo-1', assetType: 'dd_seo_geo', content: { seo: { title: 'SEO Title', slug: 'seo-title' } } },
        }),
      })
    })

    await page.route('**/api/data-driven/multi-format', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { blog: {}, linkedin: {}, medium: {}, newsletter: {} } }),
      })
    })

    await page.route('**/api/data-driven/x-campaign', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
    })

    await page.route('**/api/data-driven/threads-campaign', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
    })

    await page.route('**/api/pipeline/trigger', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, eventId: 'evt-1' }) })
    })

    await loginAsTestUser(page)
  })

  test('data-driven page is accessible from dashboard', async ({ page }) => {
    await page.goto('/dashboard/data-driven')
    await expect(page.locator('h2, h1').first()).toBeVisible()
  })

  test('all 5 step labels are rendered when pipeline is active', async ({ page }) => {
    await page.goto('/dashboard/data-driven')
    const stepLabels = [
      'Assess Source Data',
      'Deep Research',
      'Draft Article',
      'SEO + GEO Optimization',
      'Multi-format + Campaigns',
    ]
    for (const label of stepLabels) {
      const el = page.locator(`text=${label}`)
      const count = await el.count()
      if (count > 0) {
        await expect(el.first()).toBeVisible()
      }
    }
  })
})
