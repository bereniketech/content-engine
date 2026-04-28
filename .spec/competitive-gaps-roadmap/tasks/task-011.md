---
task: "011"
feature: competitive-gaps-roadmap
rec: R5
title: "Unit tests for URL ingestion lib modules"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: test-expert
depends_on: ["005", "006", "007", "008", "009"]
---

## Skills
- `.kit/skills/testing-quality/tdd-workflow/SKILL.md`

## Agents
- `.kit/agents/software-company/qa/test-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Write comprehensive Jest unit tests for all URL ingestion lib modules ensuring all branches, timeout behavior, and error paths are covered.

## Files

### Create (if not created alongside lib files)
- `D:/content-engine/lib/ingest/youtube.test.ts`
- `D:/content-engine/lib/ingest/audio.test.ts`
- `D:/content-engine/lib/ingest/web-scraper.test.ts`
- `D:/content-engine/app/api/ingest/route.test.ts`

## Dependencies
- All of TASK-005 through TASK-009 complete
- Jest with `ts-jest` configured in `jest.config.js`

## Codebase Context

Jest fake timers pattern:
```typescript
jest.useFakeTimers()
// ... in test:
jest.advanceTimersByTime(120_001)
await Promise.resolve() // flush microtasks
```

Fetch mock pattern (existing tests use `jest-fetch-mock` or manual mock):
```typescript
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  text: () => Promise.resolve('<html><body>content</body></html>'),
  status: 200
})
```

## Implementation Steps

### youtube.test.ts (if not done in TASK-006)
1. Mock `googleapis`:
```typescript
jest.mock('googleapis', () => ({
  google: {
    youtube: jest.fn().mockReturnValue({
      captions: {
        list: jest.fn().mockResolvedValue({ data: { items: [{ id: 'cap-1' }] } }),
        download: jest.fn().mockResolvedValue({ data: '<transcript>hello world</transcript>' })
      }
    })
  }
}))
```
2. Test: valid URL → clean transcript string (no XML tags)
3. Test: empty captions list → IngestionError with source='youtube'
4. Test: missing `GOOGLE_SEARCH_API_KEY` → IngestionError
5. Test: invalid URL (not YouTube) → IngestionError

### audio.test.ts (if not done in TASK-007)
1. Mock `@fal-ai/client`
2. Test: valid URL → transcript text returned
3. Test: fal.run throws → IngestionError with source='audio'
4. Test: `FAL_API_KEY` missing → IngestionError
5. Test: timeout (120001ms via fake timers) → IngestionError('audio', 'Transcription timed out')

### web-scraper.test.ts (if not done in TASK-008)
1. Mock `global.fetch`
2. Test: HTML with nav/script/footer → stripped clean text returned
3. Test: HTTP 404 → IngestionError with 'HTTP 404'
4. Test: fetch timeout (15001ms) → IngestionError
5. Test: ftp:// URL → IngestionError('web', 'Invalid URL...')
6. Test: near-empty body → IngestionError

### route.test.ts
1. Mock auth, all 3 ingest libs, supabase insert
2. Test: youtube URL → dispatches fetchYouTubeTranscript → 200
3. Test: audio URL → dispatches transcribeAudio → 200
4. Test: web URL → dispatches scrapeWebPage → 200
5. Test: missing url → 400
6. Test: IngestionError thrown → 422 with source field
7. Test: unauthenticated → 401

## Test Cases
Total: 20 test cases across 4 test files.

## Decision Rules
- All external calls (googleapis, fal, fetch) must be mocked — no real network.
- Use `jest.useFakeTimers()` for timeout tests; restore with `jest.useRealTimers()` in afterEach.
- Each test file has independent mock setup in `beforeEach`.

## Acceptance Criteria
- All 20 test cases pass with `npm test`.
- Fake timer tests correctly exercise timeout paths.
- `IngestionError.source` property verified in all error cases.
- Zero real network calls during test run.

Status: COMPLETE
Completed: 2026-04-28T07:20:36Z
