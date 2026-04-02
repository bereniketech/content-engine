---
task: 002
feature: data-driven-pipeline
status: pending
depends_on: [1]
---

# Task 002: PDF Parsing Utility

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /tdd
Commands: /verify, /task-handoff

---

## Objective

Install `pdf-parse` and create a utility module `lib/pdf-parse.ts` that extracts text from a PDF buffer. Enforce an 80,000 character limit with truncation flag, validate minimum text length (reject image-only PDFs), and return structured output. Write unit tests first (TDD).

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [Existing utility pattern — from lib/sanitize.ts (representative)]
// Utilities export pure functions, no side effects, no external state.
```

```json
// [Current dependencies — from package.json:7-27 (relevant section)]
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0",
    "next": "16.2.1",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-markdown": "^10.1.0"
  }
}
```

### Key Patterns in Use
- **Pure utility modules:** `lib/*.ts` files export pure functions. No classes, no singletons.
- **Error handling:** Functions throw descriptive `Error` instances. Callers use try/catch.

### Architecture Decisions Affecting This Task
- ADR-3: Use `pdf-parse` (MIT, lightweight). Image-only PDFs are rejected with a helpful error message.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-002.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Install dependency: `npm install pdf-parse` and `npm install -D @types/pdf-parse` (if types exist, otherwise create a local declaration).
2. Write unit tests first in `lib/__tests__/pdf-parse.test.ts`:
   - Test: valid PDF buffer returns `{ text, pageCount, wasTruncated: false }`.
   - Test: PDF with text > 80,000 chars returns `{ text (truncated), pageCount, wasTruncated: true }`.
   - Test: PDF with empty/whitespace-only text throws error with message guiding user to paste text manually.
   - Test: non-PDF buffer throws error.
3. Create `lib/pdf-parse.ts`:
   - Export `parsePdf(buffer: Buffer): Promise<{ text: string; pageCount: number; wasTruncated: boolean }>`.
   - Use `pdf-parse` to extract text.
   - Trim result. If text is empty or whitespace-only, throw: `"This PDF appears to contain only images. Please paste the text content directly."`.
   - If text.length > 80,000, truncate and set `wasTruncated: true`.
   - Return structured result.
4. Run tests — all should pass.

_Requirements: 1.3_
_Skills: /tdd — write tests first, /code-writing-software-development — utility module_

---

## Acceptance Criteria
- [ ] `pdf-parse` is in `package.json` dependencies
- [ ] `lib/pdf-parse.ts` exports `parsePdf` function
- [ ] Function returns `{ text: string, pageCount: number, wasTruncated: boolean }`
- [ ] Text > 80,000 chars is truncated with `wasTruncated: true`
- [ ] Image-only PDFs (empty text) throw descriptive error
- [ ] Unit tests exist and pass for all three cases
- [ ] All existing tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
