---
task: 006
feature: code-review-remediation
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: []
---

# Task 006: Create `lib/sse-parser.ts` and consolidate SSE parsing

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/rules/common/coding-style.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

## Commands
- .kit/commands/development/verify.md

> Load the skills, agents, and commands listed above before reading anything else using their exact `.kit/` paths. Do not load any context not declared here. Do not load CLAUDE.md. Follow paths exactly — no shortcuts, no variable substitution, no @-imports.

---

## Objective

Create `lib/sse-parser.ts` exporting `parseSseChunk`, write unit tests, then remove the duplicate inline SSE parsing from `app/dashboard/data-driven/page.tsx` and any other consumer.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/sse-parser.ts` | Single canonical SSE chunk parser export |
| `lib/__tests__/sse-parser.test.ts` | Unit tests |

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/data-driven/page.tsx` | Remove local `parseSseChunk`; add import from `@/lib/sse-parser` |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `lib/sse-parser.ts` (create this file exactly)
```typescript
export interface SseStreamEvent {
  text?: string
  done?: boolean
  error?: string
  wordCount?: number
  asset?: unknown
}

export function parseSseChunk(rawChunk: string): SseStreamEvent[] {
  const events: SseStreamEvent[] = []
  const rawEvents = rawChunk.split('\n\n')

  for (const rawEvent of rawEvents) {
    const lines = rawEvent.split('\n').filter((line) => line.startsWith('data: '))
    if (lines.length === 0) {
      continue
    }

    const payload = lines.map((line) => line.slice(6)).join('')
    try {
      events.push(JSON.parse(payload) as SseStreamEvent)
    } catch {
      // Ignore partial event chunks until complete payload arrives.
    }
  }

  return events
}
```

### `lib/__tests__/sse-parser.test.ts` (create this file exactly)
```typescript
import { parseSseChunk } from '../sse-parser'

describe('parseSseChunk', () => {
  it('parses a single SSE event', () => {
    const chunk = 'data: {"text":"hello"}\n\n'
    expect(parseSseChunk(chunk)).toEqual([{ text: 'hello' }])
  })

  it('parses multiple SSE events in one chunk', () => {
    const chunk = 'data: {"text":"a"}\n\ndata: {"text":"b"}\n\n'
    expect(parseSseChunk(chunk)).toEqual([{ text: 'a' }, { text: 'b' }])
  })

  it('ignores partial/unparseable events', () => {
    const chunk = 'data: {incomplete\n\ndata: {"done":true}\n\n'
    expect(parseSseChunk(chunk)).toEqual([{ done: true }])
  })

  it('returns empty array for empty input', () => {
    expect(parseSseChunk('')).toEqual([])
  })
})
```

### `app/dashboard/data-driven/page.tsx` — before → after
**Before:**
```typescript
function parseSseChunk(rawChunk: string): StreamEvent[] {
	const events: StreamEvent[] = [];
	const rawEvents = rawChunk.split("\n\n");

	for (const rawEvent of rawEvents) {
		const lines = rawEvent.split("\n").filter((line) => line.startsWith("data: "));
		if (lines.length === 0) {
			continue;
		}

		const payload = lines.map((line) => line.slice(6)).join("");
		try {
			events.push(JSON.parse(payload) as StreamEvent);
		} catch {
			// Ignore partial event chunks until complete payload arrives.
		}
	}

	return events;
}
```
**After:**
```typescript
import { parseSseChunk, type SseStreamEvent as StreamEvent } from '@/lib/sse-parser'
```
(Remove the function declaration; add the import. The local `StreamEvent` interface can be removed or kept — if kept, remove the `as StreamEvent` alias from the import.)

---

## Codebase Context

### Key Code Snippets
```typescript
// parseSseChunk in app/dashboard/data-driven/page.tsx:143–162
function parseSseChunk(rawChunk: string): StreamEvent[] {
	const events: StreamEvent[] = [];
	const rawEvents = rawChunk.split("\n\n");
	for (const rawEvent of rawEvents) {
		const lines = rawEvent.split("\n").filter((line) => line.startsWith("data: "));
		if (lines.length === 0) { continue; }
		const payload = lines.map((line) => line.slice(6)).join("");
		try { events.push(JSON.parse(payload) as StreamEvent); } catch { /* ignore partial */ }
	}
	return events;
}
```

```typescript
// StreamEvent interface in app/dashboard/data-driven/page.tsx:67–74
interface StreamEvent {
	text?: string;
	done?: boolean;
	error?: string;
	wordCount?: number;
	asset?: ContentAsset;
}
```

### Key Patterns in Use
- **`lib/sse-parser.ts` uses single quotes:** Match `lib/` style (single quotes, no trailing commas)
- **`page.tsx` uses tabs and double quotes:** Keep existing page.tsx style when modifying it
- **`asset` field type:** `page.tsx` types `asset` as `ContentAsset`; `lib/sse-parser.ts` types it as `unknown` to avoid circular dependency — the caller casts as needed

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.

**Files changed by previous task:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for this task:** _(fill via /task-handoff)_
**Open questions left:** _(fill via /task-handoff)_

---

## Implementation Steps
1. `lib/sse-parser.ts` — create file with exact content from Code Templates
2. `lib/__tests__/sse-parser.test.ts` — create test file with exact content above
3. Run: `npx jest lib/__tests__/sse-parser.test.ts` — must pass (4 tests)
4. `app/dashboard/data-driven/page.tsx` — delete the local `parseSseChunk` function declaration; add import at top of file
5. Check all call sites in `page.tsx` — they call `parseSseChunk(chunk)` — these work unchanged since the export name is identical
6. Run: `npm run type-check` — zero errors
7. Run: `/verify`

_Requirements: 8.1, 8.2_

---

## Test Cases

### File: `lib/__tests__/sse-parser.test.ts`
```typescript
import { parseSseChunk } from '../sse-parser'

describe('parseSseChunk', () => {
  it('parses single event', () => {
    expect(parseSseChunk('data: {"text":"hello"}\n\n')).toEqual([{ text: 'hello' }])
  })
  it('parses multiple events', () => {
    expect(parseSseChunk('data: {"text":"a"}\n\ndata: {"text":"b"}\n\n')).toEqual([{ text: 'a' }, { text: 'b' }])
  })
  it('ignores partial events', () => {
    expect(parseSseChunk('data: {bad\n\ndata: {"done":true}\n\n')).toEqual([{ done: true }])
  })
  it('returns empty for empty input', () => {
    expect(parseSseChunk('')).toEqual([])
  })
})
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| TypeScript error because `SseStreamEvent.asset` is `unknown` but page.tsx `StreamEvent.asset` is `ContentAsset` | Keep the local `StreamEvent` interface in `page.tsx`; do not import `SseStreamEvent` — only import `parseSseChunk` |
| Second consumer file with inline SSE parsing discovered | Apply same extraction — import `parseSseChunk` from `@/lib/sse-parser` |

---

## Acceptance Criteria
- [ ] WHEN `npx jest lib/__tests__/sse-parser.test.ts` is run THEN all 4 tests pass
- [ ] WHEN `grep -n "function parseSseChunk" app/dashboard/data-driven/page.tsx` is run THEN it returns zero results
- [ ] WHEN `npm run type-check` is run THEN it reports zero errors
- [ ] All existing tests pass

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_

Status: COMPLETE
Completed: 2026-04-25T00:00:00Z
