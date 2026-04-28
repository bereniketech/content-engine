---
task: 004
feature: stability-roadmap
status: COMPLETE
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
completed_at: 2026-04-28T00:00:00Z
---

# Task 004: Replace module-level Supabase singleton in admin/auth.ts

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/security-defensive/secrets-management/SKILL.md

## Objective
Convert `lib/admin/auth.ts` from module-level singleton to factory function.

## Files
### Modify
| File | What to change |
|------|---------------|
| `lib/admin/auth.ts` | Lines 4–7: Replace singleton with `adminClient()` factory |

## Code Templates

**Before:**
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

export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const supabase = adminClient();
  // ... rest of function ...
}
```

## Acceptance Criteria
- [x] Singleton replaced with factory
- [x] `requireAdmin` uses factory on demand
- [x] User account type lookup still works
- [x] Admin authorization checks function correctly
- [x] `/verify` passes
