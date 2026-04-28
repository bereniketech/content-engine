---
task: 007
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 007: Reorder signup flow checks before creating auth user

## Objective
Move device fingerprint and VPN checks before `createUser()` to prevent orphaned Supabase auth users.

## Files
### Modify
| File | What to change |
|------|---------------|
| `app/api/auth/signup/route.ts` | Lines 32–78: Reorder all checks before auth creation |

## Code Templates

**Check Order (NEW):**
1. IP limit check
2. Email validation
3. Check existing account
4. **Device fingerprint check (BEFORE createUser)**
5. **VPN detection (BEFORE createUser)**
6. Create auth user
7. Create user row, wallet, logs

**Key change:** Move device/VPN checks from AFTER createUser to BEFORE.

## Acceptance Criteria
- [ ] Device fingerprint check happens BEFORE `createUser()`
- [ ] VPN detection happens BEFORE `createUser()`
- [ ] When device is blocked, no auth user is created
- [ ] Test: sign up with device that has 4+ accounts → 403 before auth user created
- [ ] No orphaned Supabase auth users
- [ ] All validation checks (IP, email, existing) happen first
- [ ] `/verify` passes
