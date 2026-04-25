---
task: 010
feature: code-review-remediation
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: []
---

# Task 010: Create `lib/api-client.ts` and remove `postJson` from page

## Skills
- .kit/skills/development/build-website-web-app/SKILL.md
- .kit/rules/common/coding-style.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

## Commands
- .kit/commands/development/verify.md

> Load the skills, agents, and commands listed above before reading anything else using their exact `.kit/` paths. Do not load any context not declared here. Do not load CLAUDE.md. Follow paths exactly — no shortcuts, no variable substitution, no @-imports.

---

## Objective

Create `lib/api-client.ts` exporting the `postJson` helper, then remove the local declaration from `app/dashboard/data-driven/page.tsx` and replace it with an import.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/api-client.ts` | Browser POST helper with typed response |

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/data-driven/page.tsx` | Remove local `postJson` function; add import from `@/lib/api-client` |

---

## Dependencies
_(none)_

---

## API Contracts
_(none — this is a browser-side helper, not an API endpoint)_

---

## Code Templates

### `lib/api-client.ts` (create this file exactly)
```typescript
export async function postJson<TResponse>(
  url: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let message: string
    try {
      const data = (await response.json()) as { error?: { message?: string } }
      message = data?.error?.message ?? response.statusText
    } catch {
      message = response.statusText
    }
    throw new Error(message)
  }

  return (await response.json()) as TResponse
}
```

### `app/dashboard/data-driven/page.tsx` — before → after
**Before (lines 164–178):**
```typescript
async function postJson<TResponse>(url: string, body: Record<string, unknown>): Promise<TResponse> {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}

	return (await response.json()) as TResponse;
}
```
**After:**
```typescript
import { postJson } from '@/lib/api-client'
```
(Remove the function declaration entirely. Add the import at the top of the file with the other imports.)

---

## Codebase Context

### Key Code Snippets
```typescript
// postJson in app/dashboard/data-driven/page.tsx:164–178
async function postJson<TResponse>(url: string, body: Record<string, unknown>): Promise<TResponse> {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}
	return (await response.json()) as TResponse;
}
```

```typescript
// parseErrorMessage used inside the current postJson — page.tsx:~130
async function parseErrorMessage(response: Response): Promise<string> {
  // parses JSON error body or falls back to statusText
}
```

### Key Patterns in Use
- **Error handling change:** The local `postJson` calls `parseErrorMessage(response)` — the new lib version uses its own inline error parsing. This is intentional — `lib/api-client.ts` must not import from `page.tsx`. The behaviour is equivalent.
- **`lib/` files use single quotes and no semicolons** — match existing style
- **`page.tsx` uses tabs and double quotes** — do not change the style of `page.tsx` when modifying it, only remove the function and add the import line

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.

**Files changed by previous task:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for this task:** _(fill via /task-handoff)_
**Open questions left:** _(fill via /task-handoff)_

---

## Implementation Steps
1. `lib/api-client.ts` — create file with exact content from Code Templates
2. `app/dashboard/data-driven/page.tsx` — delete the `postJson` function declaration (lines 164–178)
3. `app/dashboard/data-driven/page.tsx` — add `import { postJson } from '@/lib/api-client'` at the top of the file
4. Run: `npm run type-check` — zero errors (all call sites `postJson<Type>(url, body)` still work)
5. Run: `/verify`

_Requirements: 10.1, 10.2_

---

## Test Cases
_(no new tests required — `postJson` is a thin fetch wrapper; the existing integration is covered by manual test via `/verify`)_

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| TypeScript error: `postJson` not found after removing local declaration | Verify the import was added at the top and the `@/lib/api-client` path resolves |
| Other pages also declare a local `postJson` | Apply same extraction to each — add import from `@/lib/api-client`; remove local declaration |
| `parseErrorMessage` is still used after removing `postJson` | Leave it — other code in the page may still use it for non-postJson error handling |

---

## Acceptance Criteria
- [ ] WHEN `grep -n "function postJson" app/dashboard/data-driven/page.tsx` is run THEN it returns zero results
- [ ] WHEN `npm run type-check` is run THEN it reports zero errors
- [ ] All existing tests pass

---

## Handoff to Next Task
> This is the final task. After completing task-010, run `/wrapup` to close the spec.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(none — this is the last task)_
**Open questions:** _(fill via /task-handoff)_

Status: COMPLETE
Completed: 2026-04-25T00:00:00Z
