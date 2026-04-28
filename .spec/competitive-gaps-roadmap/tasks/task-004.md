---
task: "004"
feature: competitive-gaps-roadmap
rec: R6
title: "Unit tests for image pipeline auto-generation path"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: test-expert
depends_on: ["001", "002"]
---

## Skills
- `.kit/skills/testing-quality/tdd-workflow/SKILL.md`

## Agents
- `.kit/agents/software-company/qa/test-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Write Jest unit tests covering the auto-generation extension to `POST /api/images` and the `lib/fal-images.ts` helper.

## Files

### Create
- `D:/content-engine/lib/__tests__/fal-images.test.ts`
- `D:/content-engine/app/api/images/__tests__/route-autogenerate.test.ts`

## Dependencies
- TASK-001 complete
- TASK-002 complete
- Jest configured in `jest.config.js` with `ts-jest`

## Codebase Context

Jest config at `D:/content-engine/jest.config.js`. Tests use `jest.mock()` for external modules.

Pattern used in existing tests (e.g., `lib/data-driven-form.test.ts`):
```typescript
jest.mock('@/lib/ai', () => ({ createMessage: jest.fn() }))
```

Auth mock pattern:
```typescript
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-123' },
    supabase: mockSupabase
  })
}))
```

## Implementation Steps

### `lib/__tests__/fal-images.test.ts`

1. Mock `@fal-ai/client`:
```typescript
jest.mock('@fal-ai/client', () => ({
  config: jest.fn(),
  run: jest.fn()
}))
```

2. Test: successful `generateSocialCards` returns featured + portrait URLs
   - Mock `fal.run` to resolve with `{ images: [{ url: 'https://cdn.fal.ai/test.jpg' }] }`
   - Call `generateSocialCards('test prompt', 'session-123')`
   - Assert result has `featured` and `portrait` string properties
   - Assert `fal.run` called twice with correct `image_size` params

3. Test: `FAL_API_KEY` missing throws Error
   - Delete `process.env.FAL_API_KEY` before test, restore after
   - Call `generateSocialCards` → expect Error with message matching 'FAL_API_KEY'

4. Test: parallel execution (both sizes fetched concurrently)
   - Track call order; assert both `fal.run` calls are initiated before either resolves

### `app/api/images/__tests__/route-autogenerate.test.ts`

5. Test: POST with `autoGenerate: true` returns 201 with `generatedImage.imageUrl`
   - Mock `lib/gemini-image.generateImageFromPrompt` to return `'data:image/jpeg;base64,abc'`
   - Mock Supabase insert to return mock asset rows
   - POST to route handler with `{ topic, blog, autoGenerate: true }`
   - Assert response status 201
   - Assert `data.generatedImage.imageUrl` is the mock data URL

6. Test: fal.ai timeout/error returns `autoGenerateError` without crashing
   - Mock `lib/fal-images.generateSocialCards` to throw Error('fal timeout')
   - POST with `autoGenerate: true`
   - Assert response status still 201
   - Assert `data.autoGenerateError` equals 'fal timeout'

7. Test: `GEMINI_API_KEY` missing → `autoGenerateError` set, still 201
   - Delete `process.env.GEMINI_API_KEY` before test
   - POST with `autoGenerate: true`
   - Assert 201 with `autoGenerateError` present

## Test Cases
As defined in Implementation Steps items 2–7.

## Decision Rules
- Never make real network calls in unit tests — all external clients must be mocked.
- Each test must be independent (no shared state between tests).
- Use `beforeEach`/`afterEach` to reset env vars and mocks.

## Acceptance Criteria
- All 6 test cases pass with `npm test`.
- No real HTTP calls made during test run.
- Coverage for `lib/fal-images.ts` at 100% branch coverage.

Status: COMPLETE
Completed: 2026-04-28T07:16:57Z
