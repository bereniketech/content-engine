---
task: 002
feature: code-review-remediation
status: pending
model: haiku
supervisor: software-cto
agent: refactor-cleaner
depends_on: [001]
---

# Task 002: Create `lib/type-guards.ts` (`isRecord`, `asStringArray`)

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

Create `lib/type-guards.ts` that re-exports `isRecord` from `lib/session-assets.ts` and declares `asStringArray`, write tests, then remove all local copies from route files.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/type-guards.ts` | Barrel exporting `isRecord` (from session-assets) and `asStringArray` |
| `lib/__tests__/type-guards.test.ts` | Unit tests |

### Modify
| File | What to change |
|------|---------------|
| `app/api/data-driven/assess/route.ts` | Remove `function asStringArray` declaration (lines 16–25); add import from `@/lib/type-guards` |
| `app/api/data-driven/multi-format/route.ts` | Remove `function isRecord` declaration; add import from `@/lib/type-guards` |
| `app/api/data-driven/research/route.ts` | Remove `function isRecord` and `function asStringArray` declarations; add import |
| `app/api/social/regenerate/route.ts` | Remove `function asStringArray` if locally declared; add import |

---

## Dependencies
_(none — task-001 ran first but this task has no compile dependency on it)_

---

## API Contracts
_(none)_

---

## Code Templates

### `lib/type-guards.ts` (create this file exactly)
```typescript
export { isRecord } from '@/lib/session-assets'

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}
```

### `lib/__tests__/type-guards.test.ts` (create this file exactly)
```typescript
import { isRecord, asStringArray } from '../type-guards'

describe('isRecord', () => {
  it('returns true for a plain object', () => {
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false)
  })

  it('returns false for an array', () => {
    expect(isRecord([1, 2, 3])).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isRecord('hello')).toBe(false)
  })
})

describe('asStringArray', () => {
  it('returns strings from a mixed array', () => {
    expect(asStringArray(['a', 1, 'b', null])).toEqual(['a', 'b'])
  })

  it('returns empty array for non-array input', () => {
    expect(asStringArray(null)).toEqual([])
    expect(asStringArray(42)).toEqual([])
  })

  it('trims and filters empty strings', () => {
    expect(asStringArray(['  hello  ', '', '  '])).toEqual(['hello'])
  })
})
```

### `app/api/data-driven/assess/route.ts` — before → after
**Before:**
```typescript
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}
```
**After:**
```typescript
import { asStringArray } from '@/lib/type-guards'
```
(Remove the function declaration; add the import line at top of file.)

### `app/api/data-driven/multi-format/route.ts` — before → after
**Before:**
```typescript
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
```
**After:**
```typescript
import { isRecord } from '@/lib/type-guards'
```

### `app/api/data-driven/research/route.ts` — before → after
**Before:**
```typescript
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) { return [] }
  return value.filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim()).filter((item) => item.length > 0)
}
```
**After:**
```typescript
import { isRecord, asStringArray } from '@/lib/type-guards'
```

---

## Codebase Context

### Key Code Snippets
```typescript
// Existing isRecord in lib/session-assets.ts:41–43
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
```

```typescript
// asStringArray in app/api/data-driven/assess/route.ts:16–25
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}
```

### Key Patterns in Use
- **Import alias:** `@/lib/...` resolves to `lib/...` from project root
- **Re-export from session-assets:** `isRecord` stays in `session-assets.ts` as source of truth; `type-guards.ts` just re-exports it
- **isRecord does not exclude arrays:** The existing `session-assets.ts` implementation returns `true` for arrays. Do not change the implementation — match it exactly.

---

## Handoff from Previous Task
> Populated by /task-handoff after task-001 completes.

**Files changed by previous task:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for this task:** _(fill via /task-handoff)_
**Open questions left:** _(fill via /task-handoff)_

---

## Implementation Steps
1. `lib/type-guards.ts` — create file with exact content from Code Templates
2. `lib/__tests__/type-guards.test.ts` — create test file with exact content above
3. Run: `npx jest lib/__tests__/type-guards.test.ts` — must pass
4. `app/api/data-driven/assess/route.ts` — remove local `asStringArray` function; add `import { asStringArray } from '@/lib/type-guards'`
5. `app/api/data-driven/multi-format/route.ts` — remove local `isRecord` function; add `import { isRecord } from '@/lib/type-guards'`
6. `app/api/data-driven/research/route.ts` — remove local `isRecord` and `asStringArray`; add `import { isRecord, asStringArray } from '@/lib/type-guards'`
7. Check `app/api/social/regenerate/route.ts` — if it has a local `asStringArray` declaration, remove it and add import
8. Run: `npm run type-check` — zero errors
9. Run: `/verify`

_Requirements: 4.1, 4.2, 4.3_

---

## Test Cases

### File: `lib/__tests__/type-guards.test.ts`
```typescript
import { isRecord, asStringArray } from '../type-guards'

describe('isRecord', () => {
  it('returns true for plain object', () => { expect(isRecord({ a: 1 })).toBe(true) })
  it('returns false for null', () => { expect(isRecord(null)).toBe(false) })
  it('returns false for array', () => { expect(isRecord([1, 2])).toBe(false) })
  it('returns false for string', () => { expect(isRecord('x')).toBe(false) })
})

describe('asStringArray', () => {
  it('filters to strings only', () => { expect(asStringArray(['a', 1, 'b'])).toEqual(['a', 'b']) })
  it('returns empty for non-array', () => { expect(asStringArray(null)).toEqual([]) })
  it('trims and removes empty strings', () => { expect(asStringArray(['  a  ', ''])).toEqual(['a']) })
})
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| `isRecord` in `multi-format` excludes arrays (stricter than session-assets) | Re-export from session-assets as-is — do not create two versions; callers that needed the stricter version should add an explicit `Array.isArray` check after calling `isRecord` |
| TypeScript complains about re-export syntax | Use `export { isRecord } from '@/lib/session-assets'` — not `import then export` |

---

## Acceptance Criteria
- [ ] WHEN `grep -r "function isRecord\|function asStringArray" app/` is run THEN it returns zero results
- [ ] WHEN `npx jest lib/__tests__/type-guards.test.ts` is run THEN all 7 tests pass
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
