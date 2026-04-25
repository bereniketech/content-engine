---
task: 001
feature: code-review-remediation
status: pending
model: haiku
supervisor: software-cto
agent: refactor-cleaner
depends_on: []
---

# Task 001: Extract `extractJsonPayload` to `lib/extract-json.ts`

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

Create `lib/extract-json.ts` with a single `extractJsonPayload` function, write tests, then remove the 10 local copies from API route files and replace with imports.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/extract-json.ts` | Single canonical `extractJsonPayload` export |
| `lib/__tests__/extract-json.test.ts` | Unit tests for the extractor |

### Modify
| File | What to change |
|------|---------------|
| `app/api/data-driven/assess/route.ts` | Remove `function extractJsonPayload` declaration (lines 27–66); add import |
| `app/api/data-driven/multi-format/route.ts` | Remove `function extractJsonPayload` declaration; add import |
| `app/api/data-driven/research/route.ts` | Remove `function extractJsonPayload` declaration; add import |
| `app/api/data-driven/seo-geo/route.ts` | Remove `function extractJsonPayload` declaration; add import |
| `app/api/data-driven/threads-campaign/route.ts` | Remove `function extractJsonPayload` declaration; add import |
| `app/api/data-driven/x-campaign/route.ts` | Remove `function extractJsonPayload` declaration; add import |
| `app/api/distribute/route.ts` | Remove `function extractJsonPayload` declaration; add import |
| `app/api/flywheel/route.ts` | Remove `function extractJsonPayload` declaration; add import |
| `app/api/images/route.ts` | Remove `function extractJsonPayload` declaration; add import |
| `app/api/improve/route.ts` | Remove `function extractJsonPayload` declaration; add import |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `lib/extract-json.ts` (create this file exactly)
```typescript
export function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const fencedJsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fencedJsonMatch) {
      return JSON.parse(fencedJsonMatch[1])
    }

    const objectStart = trimmed.indexOf('{')
    if (objectStart >= 0) {
      let depth = 0
      let inString = false
      let isEscaped = false

      for (let index = objectStart; index < trimmed.length; index += 1) {
        const char = trimmed[index]

        if (char === '"' && !isEscaped) {
          inString = !inString
        }

        if (!inString && char === '{') {
          depth += 1
        }

        if (!inString && char === '}') {
          depth -= 1
          if (depth === 0) {
            return JSON.parse(trimmed.slice(objectStart, index + 1))
          }
        }

        isEscaped = char === '\\' && !isEscaped
      }
    }

    throw new Error('Response did not contain valid JSON')
  }
}
```

### `lib/__tests__/extract-json.test.ts` (create this file exactly)
```typescript
import { extractJsonPayload } from '../extract-json'

describe('extractJsonPayload', () => {
  it('parses a plain JSON string', () => {
    expect(extractJsonPayload('{"key":"value"}')).toEqual({ key: 'value' })
  })

  it('parses a fenced JSON block', () => {
    const raw = '```json\n{"key":"value"}\n```'
    expect(extractJsonPayload(raw)).toEqual({ key: 'value' })
  })

  it('extracts an object embedded in prose', () => {
    const raw = 'Here is the result: {"score":42} and that is it.'
    expect(extractJsonPayload(raw)).toEqual({ score: 42 })
  })

  it('throws on unparseable input', () => {
    expect(() => extractJsonPayload('not json at all')).toThrow(
      'Response did not contain valid JSON',
    )
  })
})
```

### Each affected route — before → after (same pattern for all 10)
**Before (example from `app/api/data-driven/assess/route.ts`):**
```typescript
function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim()
  // ... full body (lines 27–66 in the file)
}
```
**After:**
```typescript
import { extractJsonPayload } from '@/lib/extract-json'
```
Add this import line at the top of each route file alongside its other imports.

---

## Codebase Context

### Key Code Snippets
```typescript
// Existing function to replace — app/api/data-driven/assess/route.ts:27–66
function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fencedJsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fencedJsonMatch) {
      return JSON.parse(fencedJsonMatch[1])
    }
    const objectStart = trimmed.indexOf('{')
    if (objectStart >= 0) {
      let depth = 0
      let inString = false
      let isEscaped = false
      for (let index = objectStart; index < trimmed.length; index += 1) {
        const char = trimmed[index]
        if (char === '"' && !isEscaped) { inString = !inString }
        if (!inString && char === '{') { depth += 1 }
        if (!inString && char === '}') {
          depth -= 1
          if (depth === 0) { return JSON.parse(trimmed.slice(objectStart, index + 1)) }
        }
        isEscaped = char === '\\' && !isEscaped
      }
    }
    throw new Error('Assessment response did not contain valid JSON')
  }
}
```

### Key Patterns in Use
- **Import alias:** All imports use `@/lib/...` (configured in `tsconfig.json` paths)
- **Test runner:** Jest with `jest.config.js` at project root — test files in `lib/__tests__/`
- **No default exports:** Project uses named exports throughout

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-001.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. `lib/extract-json.ts` — create file with the exact content from Code Templates above
2. `lib/__tests__/extract-json.test.ts` — create test file with the exact content above
3. Run: `npx jest lib/__tests__/extract-json.test.ts` — must pass
4. `app/api/data-driven/assess/route.ts` — delete lines containing `function extractJsonPayload` through the closing `}` of its body; add `import { extractJsonPayload } from '@/lib/extract-json'` at top
5. `app/api/data-driven/multi-format/route.ts` — same removal + import
6. `app/api/data-driven/research/route.ts` — same removal + import
7. `app/api/data-driven/seo-geo/route.ts` — same removal + import
8. `app/api/data-driven/threads-campaign/route.ts` — same removal + import
9. `app/api/data-driven/x-campaign/route.ts` — same removal + import
10. `app/api/distribute/route.ts` — same removal + import
11. `app/api/flywheel/route.ts` — same removal + import
12. `app/api/images/route.ts` — same removal + import
13. `app/api/improve/route.ts` — same removal + import
14. Run: `npm run type-check` — zero TypeScript errors
15. Run: `/verify`

_Requirements: 3.1, 3.2, 3.3_
_Skills: .kit/skills/development/code-writing-software-development/SKILL.md_

---

## Test Cases

### File: `lib/__tests__/extract-json.test.ts`
```typescript
import { extractJsonPayload } from '../extract-json'

describe('extractJsonPayload', () => {
  it('parses plain JSON', () => {
    expect(extractJsonPayload('{"key":"value"}')).toEqual({ key: 'value' })
  })

  it('parses fenced JSON block', () => {
    expect(extractJsonPayload('```json\n{"key":"value"}\n```')).toEqual({ key: 'value' })
  })

  it('extracts object from prose', () => {
    expect(extractJsonPayload('result: {"score":42}')).toEqual({ score: 42 })
  })

  it('throws on unparseable input', () => {
    expect(() => extractJsonPayload('not json')).toThrow('Response did not contain valid JSON')
  })
})
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Route file has multiple `extractJsonPayload` calls | Import once at top; all call sites automatically use the imported version |
| `improve/route.ts` has `extractJsonPayload` typed as `ImproveResponse` | Change the return type to `unknown` — the caller already calls a normalize function |
| TypeScript error after removal | Check that the import path `@/lib/extract-json` resolves — verify `tsconfig.json` has `"@/*": ["./*"]` in paths |

---

## Acceptance Criteria
- [ ] WHEN `grep -r "function extractJsonPayload" app/` is run THEN it returns zero results
- [ ] WHEN `npx jest lib/__tests__/extract-json.test.ts` is run THEN all 4 tests pass
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
