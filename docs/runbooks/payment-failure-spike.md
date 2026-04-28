# Runbook: Payment Failure Spike

**Trigger:** >20 failed payments in 5 minutes.

## Detection
Alert fired by abuse-detector cron. Also visible in `/admin/payments` filtered by status=failed.

## Steps
1. Check if failures share country_code — may indicate regional payment issues.
2. Check Razorpay Dashboard for gateway errors.
3. If India users: check INR transaction limits.
4. Send `payment_failed` emails if not already sent (check email_log).
5. If systemic: post status page update + email affected users.

## Escalation
Razorpay support if gateway error persists >15 min.
