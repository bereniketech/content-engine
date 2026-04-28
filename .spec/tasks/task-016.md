---
task: 016
feature: stability-roadmap
status: COMPLETE
timestamp: 2026-04-28T17:46:00Z
model: haiku
supervisor: software-cto
agent: database-architect
depends_on: []
---

# Task 016: Verify or implement safe negative credit handling for refunds

## Objective
Document that `fn_credit_topup()` handles negative amounts safely, or create dedicated RPC for deduction.

## Files
### Modify
| File | What to change |
|------|---------------|
| `lib/billing/webhookHandlers.ts` | Lines 186–191: Use safe credit deduction |

## Code Templates

**Option 1 (if fn_credit_topup is safe):**
```typescript
// Document: fn_credit_topup uses GREATEST(balance + amount, 0) to prevent underflow
if (credits > 0) {
  const wallet = await getWallet(userId, supabase);
  if (wallet) {
    await supabase.rpc('fn_credit_topup', {
      p_wallet_id: wallet.id,
      p_amount: -credits,  // negative amount; fn_credit_topup handles safely
      p_payment_id: refund.id,
    });
  }
}
```

**Option 2 (create dedicated RPC):**
```sql
CREATE FUNCTION fn_credit_deduct_refund(
  p_wallet_id UUID,
  p_amount INT,
  p_refund_id TEXT
) RETURNS INT AS $$
  UPDATE credit_wallets
  SET balance = GREATEST(balance - p_amount, 0)
  WHERE id = p_wallet_id
  RETURNING balance;
$$ LANGUAGE SQL;
```

Then use:
```typescript
await supabase.rpc('fn_credit_deduct_refund', {
  p_wallet_id: wallet.id,
  p_amount: credits,
  p_refund_id: refund.id,
});
```

## Acceptance Criteria
- [ ] `fn_credit_topup` behavior inspected and documented, OR
- [ ] New `fn_credit_deduct_refund` RPC created
- [ ] Test: Refund decreases balance correctly
- [ ] Test: Refund larger than balance → balance doesn't go below 0
- [ ] Refund logic explicit and safe
- [ ] `/verify` passes
