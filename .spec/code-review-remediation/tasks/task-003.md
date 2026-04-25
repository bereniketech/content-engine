---
task: 003
feature: code-review-remediation
status: pending
model: haiku
supervisor: software-cto
agent: refactor-cleaner
depends_on: []
---

# Task 003: Move `SeoResult` interface to `types/index.ts`

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

Move the `SeoResult` interface from `app/api/seo/route.ts` into `types/index.ts` so all consumers import from one shared location.

---

## Files

### Create
_(none)_

### Modify
| File | What to change |
|------|---------------|
| `types/index.ts` | Add `SeoResult` interface |
| `app/api/seo/route.ts` | Remove `export interface SeoResult`; add `import type { SeoResult } from '@/types'` |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `types/index.ts` — before → after
**Before (end of file — append after last export):**
```typescript
// (existing types — do not touch)
```
**After (add at end of file):**
```typescript
export interface SeoResult {
  title: string
  metaDescription: string
  slug: string
  primaryKeyword: string
  secondaryKeywords: string[]
  snippetAnswer: string
  headingStructure: {
    h1: string
    h2: string[]
    h3: string[]
  }
  faqSchema: Array<{ question: string; answer: string }>
  articleSchema: {
    headline: string
    description: string
    author: string
    datePublished: string
  }
  seoScore: number
  keywordScore: number
  rankingPotential: 'Low' | 'Medium' | 'High'
}
```

### `app/api/seo/route.ts` — before → after
**Before:**
```typescript
export interface SeoResult {
  title: string
  metaDescription: string
  slug: string
  primaryKeyword: string
  secondaryKeywords: string[]
  snippetAnswer: string
  headingStructure: {
    h1: string
    h2: string[]
    h3: string[]
  }
  faqSchema: Array<{ question: string; answer: string }>
  articleSchema: {
    headline: string
    description: string
    author: string
    datePublished: string
  }
  seoScore: number
  keywordScore: number
  rankingPotential: 'Low' | 'Medium' | 'High'
}
```
**After:**
```typescript
import type { SeoResult } from '@/types'
```
(Remove the interface declaration and add this import to the top of the file.)

---

## Codebase Context

### Key Code Snippets
```typescript
// SeoResult in app/api/seo/route.ts:10–30
export interface SeoResult {
  title: string
  metaDescription: string
  slug: string
  primaryKeyword: string
  secondaryKeywords: string[]
  snippetAnswer: string
  headingStructure: { h1: string; h2: string[]; h3: string[] }
  faqSchema: Array<{ question: string; answer: string }>
  articleSchema: { headline: string; description: string; author: string; datePublished: string }
  seoScore: number
  keywordScore: number
  rankingPotential: 'Low' | 'Medium' | 'High'
}
```

```typescript
// types/index.ts:1–5 — existing type exports
export type SessionInputType = "topic" | "upload" | "data-driven";
export type TopicTone = "authority" | "casual" | "storytelling";
const TOPIC_TONES: TopicTone[] = ["authority", "casual", "storytelling"];
export interface TopicInputData { ... }
```

### Key Patterns in Use
- **`types/index.ts` uses double-quote strings:** Match existing style (double quotes, no semicolons on interfaces)
- **Search for consumers:** Run `grep -r "SeoResult\|from.*api/seo/route"` before finishing to catch any component imports

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.

**Files changed by previous task:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for this task:** _(fill via /task-handoff)_
**Open questions left:** _(fill via /task-handoff)_

---

## Implementation Steps
1. `types/index.ts` — append the `SeoResult` interface at the end of the file using exact content from Code Templates
2. `app/api/seo/route.ts` — delete the `export interface SeoResult { ... }` block; add `import type { SeoResult } from '@/types'` at top
3. Run: `grep -r "from.*app/api/seo/route" app/ components/` — if any results, update those imports to `@/types`
4. Run: `npm run type-check` — zero errors
5. Run: `/verify`

_Requirements: 5.1, 5.2, 5.3_

---

## Test Cases
_(no new tests needed — this is a pure type move; TypeScript compile verifies correctness)_

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| A component currently imports `SeoResult` from `app/api/seo/route.ts` | Update the import to `import type { SeoResult } from '@/types'` — do not leave the old import |
| `rankingPotential` union type differs in any copy | Use the exact string union from `app/api/seo/route.ts`: `'Low' \| 'Medium' \| 'High'` |

---

## Acceptance Criteria
- [ ] WHEN `grep -r "interface SeoResult" app/` is run THEN it returns zero results
- [ ] WHEN `grep -r "from.*app/api/seo/route" components/ app/dashboard/` is run THEN it returns zero results
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
