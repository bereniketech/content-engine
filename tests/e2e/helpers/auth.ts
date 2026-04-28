import { type Page } from '@playwright/test'

export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login')
  await page.fill('[data-testid="email-input"], input[type="email"]', process.env.E2E_TEST_EMAIL ?? 'test@example.com')
  await page.fill('[data-testid="password-input"], input[type="password"]', process.env.E2E_TEST_PASSWORD ?? 'testpassword')
  await page.click('[data-testid="login-button"], button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 10000 })
}

export async function mockAiResponses(page: Page): Promise<void> {
  await page.route('**/api/research', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'asset-research-1',
          sessionId: 'sess-test',
          assetType: 'research',
          content: {
            summary: 'Test research summary',
            keywords: ['test', 'keyword'],
            keyFindings: ['Finding 1', 'Finding 2'],
          },
          createdAt: new Date().toISOString(),
        },
      }),
    })
  })

  await page.route('**/api/seo', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'asset-seo-1',
          sessionId: 'sess-test',
          assetType: 'seo',
          content: {
            title: 'Test SEO Title',
            slug: 'test-seo-title',
            primaryKeyword: 'test',
            metaDescription: 'Test description',
          },
          createdAt: new Date().toISOString(),
        },
      }),
    })
  })

  await page.route('**/api/blog', async (route) => {
    const chunks = [
      `data: ${JSON.stringify({ text: '# Test Blog\n\n' })}\n\n`,
      `data: ${JSON.stringify({ text: 'This is a test blog article.' })}\n\n`,
      `data: ${JSON.stringify({ done: true, wordCount: 8, asset: { id: 'asset-blog-1', assetType: 'blog', content: { markdown: '# Test Blog\n\nThis is a test blog article.' } } })}\n\n`,
    ]
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: chunks.join(''),
    })
  })
}
