# Runbook: Email Delivery Failure

**Trigger:** Admin alert fired after 3 retry failures for email send.

## Detection
`email_log` rows with `status='failed'` and `attempts=3`.

## Steps
1. Check Resend Dashboard for delivery errors and bounce/spam reports.
2. Verify `RESEND_API_KEY` is valid and not rate-limited (Resend free tier: 100/day).
3. Check `RESEND_FROM_EMAIL` domain has valid SPF/DKIM records.
4. Re-queue failed sends by calling `/api/email/send` manually with the same template + data.

## Escalation
If Resend service outage: check status.resend.com. Consider fallback to direct SMTP.
