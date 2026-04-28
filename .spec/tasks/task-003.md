---
task: 003
feature: stability-roadmap
status: complete
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
completed: 2026-04-28T17:11:00Z
---

# Task 003: Replace module-level Supabase singleton in generate.ts with factory pattern

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/security-defensive/secrets-management/SKILL.md

## Agents
- @software-developer-expert

## Commands
- /verify

---

## Objective
Convert `generate.ts` from module-level singleton to factory function following the pattern from `razorpay.ts`.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `lib/credits/generate.ts` | Lines 7–10: Replace module-level singleton with `adminClient()` factory function |

---

## Code Templates

### `lib/credits/generate.ts` — before → after

**Before (lines 7–10):**
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**After:**
```typescript
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

Then update `generateWithDeduction` and all functions:
```typescript
export async function generateWithDeduction(userId: string, actionType: string, prompt: string, options: Record<string, unknown>) {
  const supabase = adminClient();
  // ... rest of function uses supabase ...
}
```

---

## Acceptance Criteria
- [ ] Module-level singleton replaced with factory function
- [ ] `adminClient()` called within `generateWithDeduction` function
- [ ] No service-role key exposed at module level
- [ ] Credit deduction RPC calls still work
- [ ] Refund RPC calls still work
- [ ] All tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
_(fill via /task-handoff)_
