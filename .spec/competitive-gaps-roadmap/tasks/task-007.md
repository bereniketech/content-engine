---
task: "007"
feature: competitive-gaps-roadmap
rec: R5
title: "Create lib/ingest/audio.ts — Whisper transcription via fal.ai"
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
Implement audio transcription using fal.ai's Whisper endpoint. Accept an audio URL, submit to Whisper, poll for completion, and return transcript text. Include 120-second timeout.

## Files

### Create
- `D:/content-engine/lib/ingest/audio.ts`

## Dependencies
- `@fal-ai/client` — already installed
- `FAL_API_KEY` env var
- `lib/ingest/errors.ts` (from TASK-006)

## API Contracts

```typescript
// lib/ingest/audio.ts
export async function transcribeAudio(url: string): Promise<string>
```

## Codebase Context

fal.ai client pattern (from lib/fal-images.ts created in TASK-002):
```typescript
import * as fal from '@fal-ai/client'
fal.config({ credentials: process.env.FAL_API_KEY })

const result = await fal.run('fal-ai/whisper', {
  input: { audio_url: url }
})
// result.text contains transcript
```

The fal.ai Whisper model (`fal-ai/whisper`) accepts `audio_url` and returns `{ text: string, chunks: [...] }`.

## Implementation Steps

1. Create `lib/ingest/audio.ts`:
   - Import `* as fal from '@fal-ai/client'` and `IngestionError` from `./errors`
   - Configure fal at module level
   - Implement `transcribeAudio(url)`:
     - Validate `FAL_API_KEY` present; throw `IngestionError('audio', 'FAL_API_KEY not configured')` if missing
     - Validate URL is non-empty; throw `IngestionError('audio', 'Invalid audio URL')` if not
     - Wrap `fal.run('fal-ai/whisper', { input: { audio_url: url } })` in `Promise.race` against a 120s timeout:
       ```typescript
       const timeoutPromise = new Promise<never>((_, reject) =>
         setTimeout(() => reject(new IngestionError('audio', 'Transcription timed out')), 120_000)
       )
       const result = await Promise.race([
         fal.run('fal-ai/whisper', { input: { audio_url: url } }),
         timeoutPromise
       ])
       ```
     - Extract `result.text`; throw `IngestionError('audio', 'Transcription returned no text')` if empty
     - Return clean text string

2. Create `lib/ingest/audio.test.ts`:
   - Mock `@fal-ai/client`
   - Test: valid URL → returns transcript string
   - Test: `FAL_API_KEY` missing → throws IngestionError with source='audio'
   - Test: fal.run throws → throws IngestionError with source='audio'
   - Test: timeout (use jest fake timers to advance 120001ms) → throws IngestionError('audio', 'Transcription timed out')

## Test Cases
4 test cases as listed in Implementation Steps item 2.

## Decision Rules
- Use `Promise.race` for timeout, not `setTimeout` with `AbortController` (simpler for fal.ai client).
- Always re-throw as `IngestionError` with source='audio' — never leak raw fal.ai errors.
- `fal.config()` called at module level once.

## Acceptance Criteria
- `transcribeAudio` exported and functional.
- 120-second timeout enforced via Promise.race.
- All 4 test cases pass.
- `IngestionError` thrown with `source = 'audio'` on all failure paths.

Status: COMPLETE
Completed: 2026-04-28T07:18:48Z
