---
task: "005"
feature: competitive-gaps-roadmap
rec: R5
title: "Create lib/ingest/detect-url-type.ts for URL classification"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: []
---

## Skills
- `.kit/skills/development/code-writing-software-development/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Create a URL type classifier that categorizes incoming URLs as `youtube`, `audio`, `web`, or `invalid` before any network call is made.

## Files

### Create
- `D:/content-engine/lib/ingest/detect-url-type.ts`
- `D:/content-engine/lib/ingest/detect-url-type.test.ts`

## Dependencies
- No external dependencies — pure string logic

## API Contracts

```typescript
export type UrlType = 'youtube' | 'audio' | 'web' | 'invalid'

export function detectUrlType(url: string): UrlType
```

## Implementation Steps

1. Create `lib/ingest/` directory.

2. Implement `detectUrlType`:
```typescript
const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?v=/,
  /youtu\.be\//,
  /youtube\.com\/shorts\//,
]
const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|ogg|aac|flac)(\?.*)?$/i
const HTTP_PATTERN = /^https?:\/\//

export function detectUrlType(url: string): UrlType {
  if (!url || !HTTP_PATTERN.test(url)) return 'invalid'
  if (YOUTUBE_PATTERNS.some(p => p.test(url))) return 'youtube'
  if (AUDIO_EXTENSIONS.test(url)) return 'audio'
  return 'web'
}
```

3. In test file, cover:
   - `https://youtube.com/watch?v=abc123` → `'youtube'`
   - `https://youtu.be/abc123` → `'youtube'`
   - `https://example.com/podcast.mp3` → `'audio'`
   - `https://example.com/audio.wav?t=123` → `'audio'`
   - `https://example.com/article` → `'web'`
   - `not-a-url` → `'invalid'`
   - `ftp://example.com` → `'invalid'`
   - empty string → `'invalid'`

## Test Cases
8 test cases as listed in Implementation Steps item 3.

## Decision Rules
- YouTube detection must come before audio extension check.
- `invalid` returned for any non-http/https scheme.
- No network calls in this function — pure string pattern matching.

## Acceptance Criteria
- `detectUrlType` exported from `lib/ingest/detect-url-type.ts`.
- All 8 test cases pass with `npm test`.
- Function is a pure function (no side effects, no imports of external modules).

Status: COMPLETE
Completed: 2026-04-28T07:17:33Z
