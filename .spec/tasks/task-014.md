---
task: 014
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 014: Fix IP signup limit race condition using atomic Upstash rate limiter

## Objective
Replace manual Redis INCR/EXPIRE with `Ratelimit.slidingWindow()` for atomic operations.

## Files
### Modify
| File | What to change |
|------|---------------|
| `lib/abuse/ipControl.ts` | Lines 18–19: Replace manual Redis logic |

## Code Templates

**Before:**
```typescript
export async function checkIpSignupLimit(ip: string) {
  const key = `signup:ip:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 86400);
  if (count > 3) { ... }
  return { allowed: count <= 3, count };
}
```

**After:**
```typescript
const signupLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '24 h'),
  prefix: 'signup:ip',
});

export async function checkIpSignupLimit(ip: string) {
  const { success, remaining } = await signupLimit.limit(ip);
  return { allowed: success, count: 3 - remaining };
}
```

## Acceptance Criteria
- [ ] Manual INCR/EXPIRE replaced with Upstash.slidingWindow
- [ ] Operations now atomic
- [ ] Test: 3 signups succeed, 4th blocked
- [ ] Test: After 24h, 5th succeeds
- [ ] No permanent IP block risk
- [ ] `/verify` passes
