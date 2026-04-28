import { IngestionError } from './errors'

const HTTP_PATTERN = /^https?:\/\//i
const MAX_TEXT_LENGTH = 50_000
const FETCH_TIMEOUT_MS = 15_000

function isPrivateUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    const privatePatterns = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^localhost$/i,
      /^::1$/,
    ]
    return privatePatterns.some(p => p.test(hostname))
  } catch {
    return true
  }
}

function stripHtmlTags(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()

  return stripped.slice(0, MAX_TEXT_LENGTH)
}

export async function scrapeWebPage(url: string): Promise<string> {
  if (!url || !HTTP_PATTERN.test(url)) {
    throw new IngestionError('web', 'Invalid URL: only http/https allowed')
  }

  if (isPrivateUrl(url)) {
    throw new IngestionError('web', 'URL resolves to a private network address')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let html: string
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ContentEngine/1.0 (web scraper)' },
    })
    if (!response.ok) {
      throw new IngestionError('web', `HTTP ${response.status} from ${url}`)
    }
    html = await response.text()
  } catch (err) {
    if (err instanceof IngestionError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new IngestionError('web', 'Web page fetch timed out')
    }
    throw new IngestionError('web', `Failed to fetch page: ${(err as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }

  const text = stripHtmlTags(html)
  if (!text || text.length < 50) {
    throw new IngestionError('web', 'Page returned insufficient text content')
  }

  return text
}
