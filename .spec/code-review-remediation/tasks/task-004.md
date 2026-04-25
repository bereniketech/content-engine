---
task: 004
feature: code-review-remediation
status: pending
model: haiku
supervisor: software-cto
agent: refactor-cleaner
depends_on: []
---

# Task 004: Export `getWordCount` from `lib/utils.ts`

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/rules/common/coding-style.md

## Agents
- .kit/agents/software-company/engineering/refactor-cleaner.md

## Commands
- .kit/commands/development/verify.md

> Load the skills, agents, and commands listed above before reading anything else using their exact `.kit/` paths. Do not load any context not declared here. Do not load CLAUDE.md. Follow paths exactly — no shortcuts, no variable substitution, no @-imports.

---

## Objective

Add `getWordCount` export to `lib/utils.ts`, write unit tests, then remove the 3 local copies from route files and replace with imports.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/__tests__/utils.test.ts` | Unit tests for `getWordCount` |

### Modify
| File | What to change |
|------|---------------|
| `lib/utils.ts` | Add `export function getWordCount` |
| `app/api/data-driven/article/route.ts` | Remove local `getWordCount`; add import from `@/lib/utils` |
| `app/api/data-driven/multi-format/route.ts` | Remove local `getWordCount`; add import from `@/lib/utils` |
| `app/api/blog/route.ts` | Replace inline `.trim().split(/\s+/).filter(Boolean).length` with `getWordCount(...)`; add import |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `lib/utils.ts` — before → after
**Before (end of file):**
```typescript
// (existing utils — do not touch)
```
**After (add at end of file):**
```typescript
export function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
```

### `lib/__tests__/utils.test.ts` (create this file exactly)
```typescript
import { getWordCount } from '../utils'

describe('getWordCount', () => {
  it('returns 0 for empty string', () => {
    expect(getWordCount('')).toBe(0)
  })

  it('returns 1 for a single word', () => {
    expect(getWordCount('hello')).toBe(1)
  })

  it('counts words in a normal sentence', () => {
    expect(getWordCount('the quick brown fox')).toBe(4)
  })

  it('handles leading, trailing, and multiple spaces', () => {
    expect(getWordCount('  hello   world  ')).toBe(2)
  })
})
```

### `app/api/data-driven/article/route.ts` — before → after
**Before:**
```typescript
function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
```
**After:**
```typescript
import { getWordCount } from '@/lib/utils'
```

### `app/api/data-driven/multi-format/route.ts` — before → after
**Before:**
```typescript
function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
```
**After:**
```typescript
import { getWordCount } from '@/lib/utils'
```

### `app/api/blog/route.ts` — before → after (lines 124 and 143)
**Before (line 124):**
```typescript
wordCount: fullMarkdown.trim().split(/\s+/).filter(Boolean).length,
```
**After:**
```typescript
wordCount: getWordCount(fullMarkdown),
```
**Before (line 143):**
```typescript
wordCount: fullMarkdown.trim().split(/\s+/).filter(Boolean).length,
```
**After:**
```typescript
wordCount: getWordCount(fullMarkdown),
```
Also add at top of `blog/route.ts`:
```typescript
import { getWordCount } from '@/lib/utils'
```

---

## Codebase Context

### Key Code Snippets
```typescript
// Local getWordCount in app/api/data-driven/article/route.ts:30–32
function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
```

```typescript
// Inline usage in app/api/blog/route.ts:124
wordCount: fullMarkdown.trim().split(/\s+/).filter(Boolean).length,
```

### Key Patterns in Use
- **`lib/utils.ts` already exists** — append to the end; do not rewrite the file
- **Existing `lib/utils.ts` exports** — check the file before appending to avoid name collision

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.

**Files changed by previous task:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for this task:** _(fill via /task-handoff)_
**Open questions left:** _(fill via /task-handoff)_

---

## Implementation Steps
1. Read `lib/utils.ts` — check existing exports to avoid name collision
2. `lib/utils.ts` — append `export function getWordCount` at end of file
3. `lib/__tests__/utils.test.ts` — create test file with exact content from Code Templates
4. Run: `npx jest lib/__tests__/utils.test.ts` — must pass (4 tests)
5. `app/api/data-driven/article/route.ts` — remove local `getWordCount`; add import
6. `app/api/data-driven/multi-format/route.ts` — remove local `getWordCount`; add import
7. `app/api/blog/route.ts` — replace 2 inline word-count expressions with `getWordCount(fullMarkdown)`; add import
8. Run: `npm run type-check` — zero errors
9. Run: `/verify`

_Requirements: 6.1, 6.2, 6.3_

---

## Test Cases

### File: `lib/__tests__/utils.test.ts`
```typescript
import { getWordCount } from '../utils'

describe('getWordCount', () => {
  it('returns 0 for empty string', () => { expect(getWordCount('')).toBe(0) })
  it('returns 1 for single word', () => { expect(getWordCount('hello')).toBe(1) })
  it('counts 4 words in sentence', () => { expect(getWordCount('the quick brown fox')).toBe(4) })
  it('handles extra whitespace', () => { expect(getWordCount('  hello   world  ')).toBe(2) })
})
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| `lib/utils.ts` already exports something named `getWordCount` | Read the file first; if it exists with same body, skip creation; if different, rename the existing one first |
| TypeScript error on `filter(Boolean)` | Replace with `.filter((s): s is string => Boolean(s))` |

---

## Acceptance Criteria
- [ ] WHEN `grep -rn "function getWordCount" app/` is run THEN it returns zero results
- [ ] WHEN `npx jest lib/__tests__/utils.test.ts` is run THEN all 4 tests pass
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
