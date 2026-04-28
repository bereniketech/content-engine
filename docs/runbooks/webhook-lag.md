# Runbook: Webhook Processing Lag

**Trigger:** `webhook_events` rows with `processed_at IS NULL` older than 5 minutes.

## Detection
```sql
SELECT id, event_type, created_at FROM webhook_events
WHERE processed_at IS NULL AND created_at < now() - INTERVAL '5 minutes';
```

## Steps
1. Check Vercel function logs for errors in `/api/webhooks/razorpay`.
2. Check Supabase DB for RPC errors (fn_credit_topup, fn_deduct_credits).
3. Manually re-trigger Razorpay webhook from Dashboard (Test → Resend).
4. If RPC failing: check credit_wallets balance constraints.

## Escalation
If unprocessed for >30 min and retry fails: contact Razorpay support with event IDs.
