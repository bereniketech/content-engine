---
task: 005
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 005: Fix IP extraction in middleware

## Objective
Extract only the first IP from `x-forwarded-for` header to prevent rate limit bypass.

## Files
### Modify
| File | What to change |
|------|---------------|
| `middleware.ts` | Line 31: Use `.split(',')[0].trim()` to extract first IP |

## Code Templates

**Before:**
```typescript
const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
```

**After:**
```typescript
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
```

## Acceptance Criteria
- [ ] IP extraction uses `.split(',')[0].trim()` pattern
- [ ] When x-forwarded-for is '1.2.3.4, 5.6.7.8', extracts '1.2.3.4'
- [ ] x-client-ip header is set to only the first IP
- [ ] Rate limit keys use cleaned IP, not proxy chain
- [ ] `/verify` passes
