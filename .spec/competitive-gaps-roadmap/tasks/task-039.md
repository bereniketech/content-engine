---
task: "039"
feature: competitive-gaps-roadmap
rec: R5
title: "Security review of URL ingestion pipeline"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: security-reviewer
depends_on: ["009", "010", "011"]
---

## Skills
- `.kit/skills/testing-quality/security-review/SKILL.md`

## Agents
- `.kit/agents/software-company/qa/security-reviewer.md`

## Commands
- `.kit/commands/development/code-review.md`

---

## Objective
Security review of the URL ingestion pipeline with focus on SSRF (Server-Side Request Forgery) prevention and content injection risks.

## Files

### Review
- `D:/content-engine/lib/ingest/detect-url-type.ts`
- `D:/content-engine/lib/ingest/web-scraper.ts`
- `D:/content-engine/lib/ingest/youtube.ts`
- `D:/content-engine/lib/ingest/audio.ts`
- `D:/content-engine/app/api/ingest/route.ts`

## Security Checklist

1. **SSRF Prevention (Critical):**
   - `web-scraper.ts` fetches arbitrary URLs — must block private IP ranges
   - Block: `127.0.0.1`, `localhost`, `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, `::1`, `fd00::/8`
   - Verify URL validation happens BEFORE any fetch call
   - `detectUrlType` returns 'invalid' for non-http/https

2. **Scheme Allowlist:**
   - Only `https://` and `http://` schemes allowed
   - No `file://`, `ftp://`, `data://`, `javascript:` URIs

3. **DNS Rebinding:**
   - After URL resolution, check if resolved IP is private (advanced — document as known limitation for MVP)

4. **Content Injection:**
   - Web scraper returns plain text — HTML stripped
   - Transcript text stored in content_assets (not executed anywhere)
   - No XSS surface from stored transcripts (rendered in read-only panels)

5. **API Key Handling:**
   - `GOOGLE_SEARCH_API_KEY` and `FAL_API_KEY` server-side only
   - Error messages don't reveal key names in production

6. **Rate Limiting:**
   - `/api/ingest` behind existing rate limiter
   - Per-user rate limit prevents abuse (crawling many URLs)

7. **Timeouts:**
   - 15s for web scraper (verify AbortController works)
   - 120s for audio (verify Promise.race timeout)
   - Neither timeout allows indefinite hanging

## SSRF Remediation (Required if not implemented)

Add to `lib/ingest/web-scraper.ts` before fetch:
```typescript
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
    return true // invalid URL = block
  }
}
```

## Acceptance Criteria
- SSRF: private IP ranges blocked before fetch (High severity if missing — must fix).
- Scheme allowlist: non-http/https rejected (High severity if missing — must fix).
- Timeouts verified to actually abort connections.
- Any findings documented with severity and remediation.

Status: COMPLETE
Completed: 2026-04-28T10:25:00Z