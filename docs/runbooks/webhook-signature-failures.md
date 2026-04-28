# Runbook: Webhook Signature Failures

**Trigger:** >5 signature failures/minute from Razorpay webhook endpoint.

## Detection
- Abuse log event_type = 'webhook_signature_fail'
- Vercel log: `x-razorpay-signature validation failed`

## Steps
1. Check `webhook_events` table for recent rows with `processed_at IS NULL` and no matching entry.
2. Verify `RAZORPAY_WEBHOOK_SECRET` env var matches what Razorpay Dashboard shows.
3. If env var correct → possible replay attack. Block source IP via Vercel firewall.
4. If env var wrong → rotate secret in Razorpay Dashboard, update Vercel env, redeploy.

## Escalation
If failures continue >30 min after env rotation: engage Razorpay support.
