---
task: 012
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 012: Migrate middleware logging from console.log to structured logger

## Objective
Replace raw `console.log()` with project logger (pino) for consistent structured logging.

## Files
### Modify
| File | What to change |
|------|---------------|
| `middleware.ts` | Lines 115–124: Replace console.log with logger.info |

## Code Templates

**Before:**
```typescript
console.log(JSON.stringify({ level: 'info', request_id: ... }));
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.info({
  request_id: requestId,
  user_id: user.id,
  method: req.method,
  pathname,
  ip,
  country,
});
```

## Acceptance Criteria
- [ ] `console.log` removed from middleware
- [ ] Project logger imported and used
- [ ] Logs appear in structured JSON format (pino)
- [ ] Test: make request → check logs in structured format
- [ ] Logging now consistent across app
- [ ] `/verify` passes
