import { scrapeWebPage } from './web-scraper'
import { IngestionError } from './errors'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('scrapeWebPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('strips nav/scripts/style and returns body text', async () => {
    const html = `
      <html>
        <head><style>body { color: red }</style></head>
        <body>
          <nav><a href="/">Home</a></nav>
          <script>console.log('hi')</script>
          <main><p>This is the article content. It has enough words to pass the minimum.</p></main>
          <footer>Footer text here</footer>
        </body>
      </html>
    `
    mockFetch.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(html),
    })

    const result = await scrapeWebPage('https://example.com/article')

    expect(result).toContain('article content')
    expect(result).not.toContain('console.log')
    expect(result).not.toContain('<nav>')
    expect(result).not.toContain('<footer>')
  })

  it('throws IngestionError on HTTP 404 response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 })

    await expect(scrapeWebPage('https://example.com/missing'))
      .rejects.toMatchObject({ source: 'web', message: expect.stringContaining('404') })
  })

  it('throws IngestionError for non-http URL', async () => {
    await expect(scrapeWebPage('ftp://example.com/file'))
      .rejects.toMatchObject({ source: 'web', message: expect.stringContaining('Invalid URL') })
  })

  it('throws IngestionError on timeout', async () => {
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 30_000))
    )

    const promise = scrapeWebPage('https://example.com/slow')
    jest.advanceTimersByTime(15_001)

    await expect(promise).rejects.toMatchObject({
      source: 'web',
      message: expect.stringContaining('timed out'),
    })
  })

  it('throws IngestionError when page has insufficient text content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<html><body><p>Short.</p></body></html>'),
    })

    await expect(scrapeWebPage('https://example.com/sparse'))
      .rejects.toMatchObject({ source: 'web', message: expect.stringContaining('insufficient') })
  })

  it('is instance of IngestionError on error', async () => {
    await expect(scrapeWebPage(''))
      .rejects.toBeInstanceOf(IngestionError)
  })
})
