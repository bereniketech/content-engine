---
task: "008"
feature: competitive-gaps-roadmap
rec: R5
title: "Create lib/ingest/web-scraper.ts — scrape web page body text"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["005", "006"]
---

## Skills
- `.kit/skills/development/code-writing-software-development/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Implement a web scraper that fetches a URL, strips navigation/scripts/style/footer elements, and returns clean body text. Include 15-second timeout and URL allowlist validation.

## Files

### Create
- `D:/content-engine/lib/ingest/web-scraper.ts`
- `D:/content-engine/lib/ingest/web-scraper.test.ts`

## Dependencies
- Node.js built-in `fetch` (available in Next.js 14 / Node 18+)
- `lib/ingest/errors.ts` (from TASK-006)
- No additional npm packages needed

## API Contracts

```typescript
export async function scrapeWebPage(url: string): Promise<string>
```

## Implementation Steps

1. Create `lib/ingest/web-scraper.ts`:

```typescript
import { IngestionError } from './errors'

const BLOCKED_SCHEMES = /^(?!https?:\/\/)/i
const MAX_TEXT_LENGTH = 50_000

function stripHtmlTags(html: string): string {
  // Remove script, style, nav, header, footer, aside blocks entirely
  const blocked = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
  // Strip remaining HTML tags
  const text = blocked.replace(/<[^>]+>/g, ' ')
  // Normalize whitespace
  return text.replace(/\s{2,}/g, ' ').trim().slice(0, MAX_TEXT_LENGTH)
}

export async function scrapeWebPage(url: string): Promise<string> {
  if (!url || BLOCKED_SCHEMES.test(url)) {
    throw new IngestionError('web', 'Invalid URL: only http/https allowed')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

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
```

2. Create `lib/ingest/web-scraper.test.ts` with mock fetch:
   - Valid HTML with nav/scripts → stripped text returned
   - Timeout (abort after 15001ms using fake timers) → IngestionError
   - HTTP 404 response → IngestionError with 'HTTP 404'
   - Non-http URL (ftp://) → IngestionError('web', 'Invalid URL...')
   - Empty body → IngestionError

## Test Cases
5 test cases as listed in Implementation Steps item 2.

## Decision Rules
- Never import additional HTML parsing libraries — regex is sufficient and avoids npm bloat.
- Truncate at 50,000 characters max (generous enough for articles, prevents memory issues).
- All errors re-thrown as `IngestionError` with `source = 'web'`.
- `AbortController` used for timeout — this is the standard Node.js fetch pattern.

## Acceptance Criteria
- `scrapeWebPage` exported and functional.
- `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<aside>` blocks completely removed.
- 15-second timeout enforced via AbortController.
- All 5 test cases pass.

Status: COMPLETE
Completed: 2026-04-28T07:18:48Z
