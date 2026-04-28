---
task: 013
feature: stability-roadmap
status: complete
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
completed_at: 2026-04-28T00:00:00Z
---

# Task 013: Add middleware sentinel for admin authorization re-validation

## Objective
Add `x-auth-verified` header from middleware to prevent header spoofing in admin routes.

## Files
### Modify
| File | What to change |
|------|---------------|
| `middleware.ts` | After auth succeeds: set sentinel header |
| `lib/admin/auth.ts` | Check sentinel header before trusting x-user-id |

## Code Templates

**middleware.ts:**
```typescript
// After successful auth
res.headers.set('x-auth-verified', 'true');
```

**lib/admin/auth.ts:**
```typescript
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  // Verify middleware ran
  if (req.headers.get('x-auth-verified') !== 'true') {
    return null; // request bypassed middleware
  }
  
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;

  const { data: user } = await supabase.from('users').select('account_type').eq('id', userId).single();
  if (user?.account_type !== 'admin') return null;
  return userId;
}
```

## Acceptance Criteria
- [x] Middleware sets `x-auth-verified='true'` after auth
- [x] `requireAdmin()` checks sentinel header
- [x] Test: Spoof x-user-id header → rejected
- [x] Admin routes protected from header spoofing
- [x] `/verify` passes
