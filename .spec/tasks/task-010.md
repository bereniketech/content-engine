---
task: 010
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 010: Soften multi-account penalty for shared devices

## Objective
Only penalize new user on multi-account device; raise auto-block threshold to 10+.

## Files
### Modify
| File | What to change |
|------|---------------|
| `lib/abuse/ipControl.ts` | Lines 72–75: Change penalty logic |

## Code Templates

**Before:**
```typescript
if (accountCount >= 2) {
  for (const uid of uniqueUsers) {
    await applyTrustEvent(uid, 'multi_account_device'); // penalizes ALL users
  }
  await applyTrustEvent(newUserId, 'multi_account_device');
}
```

**After:**
```typescript
if (accountCount >= 2) {
  // Only penalize the NEW user, not existing ones
  await applyTrustEvent(newUserId, 'multi_account_device');
}

// Auto-escalate (block) only on extreme counts
if (accountCount >= 10) {
  for (const uid of uniqueUsers) {
    await supabase.from('users').update({ account_status: 'blocked' }).eq('id', uid);
  }
  await fireAdminAlert({ kind: 'device_fingerprint_abuse', fpHash, accountCount });
}
```

## Acceptance Criteria
- [ ] Only NEW user penalized on multi-account device
- [ ] Existing users NOT penalized
- [ ] Auto-block threshold raised to 10+
- [ ] Test: 3 users on same device → only 3rd penalized
- [ ] Admin alert fired on 10+ accounts
- [ ] Family users no longer silently throttled
- [ ] `/verify` passes
