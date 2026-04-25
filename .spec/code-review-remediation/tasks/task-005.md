---
task: 005
feature: code-review-remediation
status: pending
model: haiku
supervisor: software-cto
agent: refactor-cleaner
depends_on: []
---

# Task 005: Export `SESSION_ID_UUID_REGEX` from `lib/session-assets.ts`

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

Add `SESSION_ID_UUID_REGEX` export to `lib/session-assets.ts` then remove the 4+ local declarations from data-driven API routes and replace with imports.

---

## Files

### Create
_(none)_

### Modify
| File | What to change |
|------|---------------|
| `lib/session-assets.ts` | Add `export const SESSION_ID_UUID_REGEX` |
| `app/api/data-driven/multi-format/route.ts` | Remove local `SESSION_ID_UUID_REGEX`; add import |
| `app/api/data-driven/seo-geo/route.ts` | Remove local `SESSION_ID_UUID_REGEX`; add import |
| `app/api/data-driven/threads-campaign/route.ts` | Remove local `SESSION_ID_UUID_REGEX`; add import |
| `app/api/data-driven/x-campaign/route.ts` | Remove local `SESSION_ID_UUID_REGEX`; add import |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `lib/session-assets.ts` — before → after
**Before (first few lines — the imports area, before the first function):**
```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
// ... other imports
```
**After (add this constant before the first function definition):**
```typescript
export const SESSION_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```

### `app/api/data-driven/multi-format/route.ts` — before → after
**Before:**
```typescript
const SESSION_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```
**After:**
```typescript
import { SESSION_ID_UUID_REGEX } from '@/lib/session-assets'
```

### `app/api/data-driven/seo-geo/route.ts` — before → after
**Before:**
```typescript
const SESSION_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```
**After:**
```typescript
import { SESSION_ID_UUID_REGEX } from '@/lib/session-assets'
```

### `app/api/data-driven/threads-campaign/route.ts` — before → after
**Before:**
```typescript
const SESSION_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```
**After:**
```typescript
import { SESSION_ID_UUID_REGEX } from '@/lib/session-assets'
```

### `app/api/data-driven/x-campaign/route.ts` — before → after
**Before:**
```typescript
const SESSION_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```
**After:**
```typescript
import { SESSION_ID_UUID_REGEX } from '@/lib/session-assets'
```

---

## Codebase Context

### Key Code Snippets
```typescript
// Local constant in app/api/data-driven/multi-format/route.ts:34–35
const SESSION_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```

```typescript
// lib/session-assets.ts — top of file (imports area)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
```

### Key Patterns in Use
- **`session-assets.ts` already imports from** `@supabase/supabase-js` and `next/server` — add the constant before the first `export function`
- **Regex is identical** across all 4 copies — safe to extract

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.

**Files changed by previous task:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for this task:** _(fill via /task-handoff)_
**Open questions left:** _(fill via /task-handoff)_

---

## Implementation Steps
1. Read `lib/session-assets.ts` — find the position before the first `export function`
2. `lib/session-assets.ts` — add `export const SESSION_ID_UUID_REGEX` before the first function
3. `app/api/data-driven/multi-format/route.ts` — remove local constant; add import from `@/lib/session-assets`
4. `app/api/data-driven/seo-geo/route.ts` — remove local constant; add import
5. `app/api/data-driven/threads-campaign/route.ts` — remove local constant; add import
6. `app/api/data-driven/x-campaign/route.ts` — remove local constant; add import
7. Run: `grep -rn "SESSION_ID_UUID_REGEX\s*=" app/` — must return zero results
8. Run: `npm run type-check` — zero errors
9. Run: `/verify`

_Requirements: 7.1, 7.2, 7.3_

---

## Test Cases
_(no new tests needed — pure constant extraction; TypeScript compile verifies correctness)_

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Other route files (beyond the 4 listed) also declare `SESSION_ID_UUID_REGEX` | Remove all local copies; add import to all — do not leave any behind |
| The `session-assets.ts` import already contains `SESSION_ID_UUID_REGEX` as a non-exported const | Remove the `const` and add `export const` in its place |

---

## Acceptance Criteria
- [ ] WHEN `grep -rn "SESSION_ID_UUID_REGEX\s*=" app/` is run THEN it returns zero results
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
