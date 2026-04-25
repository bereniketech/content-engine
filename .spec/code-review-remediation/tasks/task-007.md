---
task: 007
feature: code-review-remediation
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: []
---

# Task 007: Create `lib/validation.ts` and fix validation asymmetry

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/rules/common/security.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/development/verify.md

> Load the skills, agents, and commands listed above before reading anything else using their exact `.kit/` paths. Do not load any context not declared here. Do not load CLAUDE.md. Follow paths exactly — no shortcuts, no variable substitution, no @-imports.

---

## Objective

Create `lib/validation.ts` with shared validation constants, then update both the frontend form validator and the backend route validators to import from this single source so frontend and backend never diverge.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/validation.ts` | Shared validation constants for frontend and backend |
| `lib/__tests__/validation.test.ts` | Tests asserting constant values |

### Modify
| File | What to change |
|------|---------------|
| `lib/data-driven-form.ts` | Import `VALIDATION_CONSTANTS` from `lib/validation.ts`; use constant for source text minimum |
| `app/api/data-driven/assess/route.ts` | Replace `MIN_SOURCE_TEXT_LENGTH = 1` with import from `lib/validation.ts` |
| `app/api/improve/route.ts` | Replace `MIN_ARTICLE_LENGTH = 101` with import from `lib/validation.ts` |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `lib/validation.ts` (create this file exactly)
```typescript
export const VALIDATION_CONSTANTS = {
  MIN_SOURCE_TEXT_LENGTH: 10,
  MIN_ARTICLE_IMPROVE_LENGTH: 101,
  SCHEDULING_BUFFER_HOURS: 1,
  ALLOWED_FILE_EXTENSIONS: ['txt', 'md', 'pdf'] as const,
  ALLOWED_MIME_TYPES: ['text/plain', 'text/markdown', 'application/pdf'] as const,
} as const
```

### `lib/__tests__/validation.test.ts` (create this file exactly)
```typescript
import { VALIDATION_CONSTANTS } from '../validation'

describe('VALIDATION_CONSTANTS', () => {
  it('MIN_SOURCE_TEXT_LENGTH is a positive number', () => {
    expect(typeof VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH).toBe('number')
    expect(VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH).toBeGreaterThan(0)
  })

  it('MIN_ARTICLE_IMPROVE_LENGTH is 101', () => {
    expect(VALIDATION_CONSTANTS.MIN_ARTICLE_IMPROVE_LENGTH).toBe(101)
  })

  it('ALLOWED_FILE_EXTENSIONS includes txt, md, pdf', () => {
    expect(VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS).toContain('txt')
    expect(VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS).toContain('md')
    expect(VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS).toContain('pdf')
  })
})
```

### `lib/data-driven-form.ts` — before → after
**Before (line 14):**
```typescript
const TEXT_FILE_EXTENSIONS = new Set(["txt", "md"]);
```
**After:**
```typescript
import { VALIDATION_CONSTANTS } from '@/lib/validation'

const TEXT_FILE_EXTENSIONS = new Set(VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS.filter(
  (ext) => ext !== 'pdf'
) as string[])
```
Also update `getDataDrivenValidationError` to check `sourceText.length >= VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH` when mode is `"data"`.

Updated `getDataDrivenValidationError` function — before → after:
**Before:**
```typescript
export function getDataDrivenValidationError(input: DataDrivenDraftInput): string | null {
	const tone = input.tone.trim();
	const sourceText = input.sourceText.trim();
	const sourceFileName = input.sourceFileName.trim();
	const topic = input.topic.trim();

	if (!tone) {
		return "Add tone guidance before creating the session.";
	}

	if (input.mode === "topic") {
		return topic ? null : "Enter a topic before creating the session.";
	}

	return sourceText || sourceFileName
		? null
		: "Add source text or select a file before creating the session.";
}
```
**After:**
```typescript
export function getDataDrivenValidationError(input: DataDrivenDraftInput): string | null {
	const tone = input.tone.trim();
	const sourceText = input.sourceText.trim();
	const sourceFileName = input.sourceFileName.trim();
	const topic = input.topic.trim();

	if (!tone) {
		return "Add tone guidance before creating the session.";
	}

	if (input.mode === "topic") {
		return topic ? null : "Enter a topic before creating the session.";
	}

	if (!sourceText && !sourceFileName) {
		return "Add source text or select a file before creating the session.";
	}

	if (sourceText && sourceText.length < VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH) {
		return `Source text must be at least ${VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH} characters.`;
	}

	return null;
}
```

### `app/api/data-driven/assess/route.ts` — before → after
**Before (line 13):**
```typescript
const MIN_SOURCE_TEXT_LENGTH = 1
```
**After:**
```typescript
import { VALIDATION_CONSTANTS } from '@/lib/validation'
```
Then replace all usages of `MIN_SOURCE_TEXT_LENGTH` in that file with `VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH`.

### `app/api/improve/route.ts` — before → after
**Before (line 15):**
```typescript
const MIN_ARTICLE_LENGTH = 101
```
**After:**
```typescript
import { VALIDATION_CONSTANTS } from '@/lib/validation'
```
Then replace all usages of `MIN_ARTICLE_LENGTH` with `VALIDATION_CONSTANTS.MIN_ARTICLE_IMPROVE_LENGTH`.

---

## Codebase Context

### Key Code Snippets
```typescript
// app/api/data-driven/assess/route.ts:13
const MIN_SOURCE_TEXT_LENGTH = 1
// Usage at line 140:
if (sourceText.length < MIN_SOURCE_TEXT_LENGTH) {
```

```typescript
// app/api/improve/route.ts:15
const MIN_ARTICLE_LENGTH = 101
// Usage at line 79:
if (article.length < MIN_ARTICLE_LENGTH) {
```

```typescript
// lib/data-driven-form.ts:14 — current TEXT_FILE_EXTENSIONS
const TEXT_FILE_EXTENSIONS = new Set(["txt", "md"]);
const PDF_FILE_EXTENSION = "pdf";
```

### Key Patterns in Use
- **Backend uses single quotes, no semicolons** — match existing style in `assess/route.ts` and `improve/route.ts`
- **Frontend uses double quotes, semicolons** — match existing style in `data-driven-form.ts`
- **MIN_SOURCE_TEXT_LENGTH changing from 1 → 10** — this is intentional; the old value of 1 meant even a single character passed backend validation while the frontend required a meaningful topic

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.

**Files changed by previous task:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for this task:** _(fill via /task-handoff)_
**Open questions left:** _(fill via /task-handoff)_

---

## Implementation Steps
1. `lib/validation.ts` — create file with exact content from Code Templates
2. `lib/__tests__/validation.test.ts` — create test file
3. Run: `npx jest lib/__tests__/validation.test.ts` — must pass (3 tests)
4. `app/api/data-driven/assess/route.ts` — remove `const MIN_SOURCE_TEXT_LENGTH = 1`; add import; replace usage
5. `app/api/improve/route.ts` — remove `const MIN_ARTICLE_LENGTH = 101`; add import; replace usage
6. `lib/data-driven-form.ts` — add import; update `getDataDrivenValidationError` as shown above; update `TEXT_FILE_EXTENSIONS`
7. Run: `npm run type-check` — zero errors
8. Run: `/verify`

_Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

---

## Test Cases

### File: `lib/__tests__/validation.test.ts`
```typescript
import { VALIDATION_CONSTANTS } from '../validation'

describe('VALIDATION_CONSTANTS', () => {
  it('MIN_SOURCE_TEXT_LENGTH is positive', () => {
    expect(VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH).toBeGreaterThan(0)
  })
  it('MIN_ARTICLE_IMPROVE_LENGTH is 101', () => {
    expect(VALIDATION_CONSTANTS.MIN_ARTICLE_IMPROVE_LENGTH).toBe(101)
  })
  it('ALLOWED_FILE_EXTENSIONS has txt, md, pdf', () => {
    const exts = VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS
    expect(exts).toContain('txt')
    expect(exts).toContain('md')
    expect(exts).toContain('pdf')
  })
})
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Changing `MIN_SOURCE_TEXT_LENGTH` from 1 to 10 breaks existing tests | Update the test to match the new threshold — the old value was a known defect |
| `data-driven-form.ts` test suite tests the old validation message | Update the expected message string to match the new validation message |

---

## Acceptance Criteria
- [ ] WHEN `lib/validation.ts` is read THEN it exports `VALIDATION_CONSTANTS` with all 5 keys
- [ ] WHEN `grep -n "MIN_SOURCE_TEXT_LENGTH\s*=" app/` is run THEN it returns zero results
- [ ] WHEN `grep -n "MIN_ARTICLE_LENGTH\s*=" app/` is run THEN it returns zero results
- [ ] WHEN `npx jest lib/__tests__/validation.test.ts` is run THEN all 3 tests pass
- [ ] WHEN `npm run type-check` is run THEN it reports zero errors
- [ ] All existing tests pass (update broken tests to new threshold values)

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_

Status: COMPLETE
Completed: 2026-04-25T00:00:00Z
