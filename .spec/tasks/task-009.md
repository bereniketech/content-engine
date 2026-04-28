---
task: 009
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: [task-003]
---

# Task 009: Add error handling and alerting for credit refund failures

## Objective
Wrap `fn_refund_credits` RPC in try/catch, log errors, and queue Inngest retry job.

## Files
### Modify
| File | What to change |
|------|---------------|
| `lib/credits/generate.ts` | Line 55: Add try/catch around refund RPC |

## Code Templates

**Before:**
```typescript
catch (aiError) {
  await supabase.rpc('fn_refund_credits', { p_request_id: requestId });
  // No error handling — if refund fails, it's silent
  throw aiError;
}
```

**After:**
```typescript
catch (aiError) {
  try {
    await supabase.rpc('fn_refund_credits', { p_request_id: requestId });
  } catch (refundError) {
    logger.error('CRITICAL: credit refund failed', {
      userId,
      requestId,
      error: String(refundError),
    });
    await inngest.send({
      name: 'refund.retry',
      data: { requestId, userId },
    });
  }
  throw aiError;
}
```

## Acceptance Criteria
- [ ] Refund RPC wrapped in try/catch
- [ ] Error logged with critical severity
- [ ] Inngest retry job queued
- [ ] Test: Simulate refund RPC failure → verify error logged
- [ ] Financial data now tracked
- [ ] `/verify` passes
