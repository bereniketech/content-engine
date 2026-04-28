---
task: 008
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: [task-002]
---

# Task 008: Insert subscription row into database after Razorpay creation

## Objective
Add database insert to `createSubscription()` so webhook handlers have a row to update.

## Files
### Modify
| File | What to change |
|------|---------------|
| `lib/billing/razorpay.ts` | Lines 72–85: Add insert after Razorpay creation |

## Code Templates

**Before:**
```typescript
return { subscriptionId: sub.id, hostedUrl: ... };
// NO INSERT into subscriptions table!
```

**After:**
```typescript
// Insert into subscriptions table
const supabase = adminClient();
await supabase.from('subscriptions').insert({
  user_id: params.userId,
  plan_id: params.planId,
  razorpay_subscription_id: sub.id,
  status: 'pending',
  razorpay_plan_id: params.razorpayPlanId,
});

return {
  subscriptionId: sub.id,
  hostedUrl: ...,
};
```

## Acceptance Criteria
- [ ] Row inserted into subscriptions table after Razorpay creation
- [ ] Status set to 'pending'
- [ ] Test: Create subscription → check table has new row
- [ ] Webhook handler can UPDATE the row on activation
- [ ] `/verify` passes
