# Security Findings — competitive-gaps-roadmap

## Task 038 — R6 Image Pipeline

All checks passed.

- **Auth:** `requireAuth` is called at the top of the `POST` handler in `app/api/images/route.ts` before any processing occurs.
- **Input sanitization:** `sanitizeInput` is applied to `topic` and `sanitizeUnknown` to `blog`; the derived `blogSummary` is also passed through `sanitizeInput`. Both `lib/gemini-image.ts` and `lib/fal-images.ts` receive already-sanitized prompts; `gemini-image.ts` additionally applies `sanitizeInput` internally on the prompt and style parameters.
- **API key exposure:** `GEMINI_API_KEY` and `FAL_API_KEY` are read from `process.env` in server-side lib files only (no `NEXT_PUBLIC_` prefix) and are never serialised into any response body.
- **Error safety:** All `catch` blocks in the route return structured generic messages (e.g. `'Internal server error'`, `'Failed to save image prompts'`). Raw exception details are not forwarded to the client.
- **OWASP comment:** Present on line 17 of `app/api/images/route.ts`: `// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.`

## Task 039 — URL Ingestion Pipeline

### HIGH — SSRF: private IP ranges not blocked before fetch (FIXED)

**File:** `lib/ingest/web-scraper.ts`
**Severity:** High
**Description:** `scrapeWebPage` fetched arbitrary http/https URLs without checking whether the hostname resolved to a private/loopback IP range, exposing the server to Server-Side Request Forgery (SSRF) attacks against internal services (e.g. `http://192.168.1.1`, `http://localhost:8080`).
**Remediation applied:** Added `isPrivateUrl(url)` function and a guard call immediately after the scheme check, before `fetch`. Private patterns blocked: `127.x`, `10.x`, `172.16-31.x`, `192.168.x`, `localhost`, `::1`. Invalid/unparseable URLs also return `true` (blocked).

### All other checks passed.

- **Scheme allowlist:** `detectUrlType` returns `'invalid'` for any URL that does not match `^https?:\/\/`, blocking `file://`, `ftp://`, `data://`, `javascript:` and other non-HTTP schemes.
- **Timeouts:** `web-scraper.ts` uses `AbortController` with a 15 s timeout (`FETCH_TIMEOUT_MS = 15_000`). `audio.ts` uses `Promise.race` with a 120 s timeout (`TRANSCRIPTION_TIMEOUT_MS = 120_000`).
- **Auth on ingest route:** `requireAuth` is called at the top of the `POST` handler in `app/api/ingest/route.ts` before any URL processing.
- **OWASP comment:** Present on line 1 of `app/api/ingest/route.ts`: `// OWASP checklist: JWT auth required, middleware rate limits, URL validated, generic errors.`
