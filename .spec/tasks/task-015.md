---
task: 015
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 015: Extract auth cookie name to shared constant

## Objective
Create `SUPABASE_AUTH_COOKIE` constant to prevent drift between middleware and auth code.

## Files
### Create
| File | Purpose |
|------|---------|
| `lib/auth.ts` | Add shared constant (create file if missing) |

### Modify
| File | What to change |
|------|---------------|
| `middleware.ts` | Line 71: Import and use constant |

## Code Templates

**lib/auth.ts (new or add to existing):**
```typescript
export const SUPABASE_AUTH_COOKIE = '__Secure-sb-access';
```

**middleware.ts:**
```typescript
import { SUPABASE_AUTH_COOKIE } from '@/lib/auth';

const token = req.cookies.get(SUPABASE_AUTH_COOKIE)?.value ?? ...;
```

## Acceptance Criteria
- [ ] Constant defined in `lib/auth.ts`
- [ ] Both middleware and other auth code use constant
- [ ] No hardcoded cookie names in multiple files
- [ ] Grep confirms cookie name only in definition and tests
- [ ] `/verify` passes
