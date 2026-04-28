# Runbook: Abuse Spike (IP/Fingerprint)

**Trigger:** >50 signups from /24 subnet in 1 hour, or >10 accounts from 1 fingerprint in 24h.

## Detection
Alert fired by abuse-detector cron. Check `abuse_logs` for event_type='auto_block'.

## Steps
1. Query `user_ip_log` for the subnet:
   ```sql
   SELECT * FROM user_ip_log WHERE ip_address << '1.2.3.0/24' ORDER BY created_at DESC LIMIT 50;
   ```
2. Review accounts: check email patterns for disposable domains.
3. Bulk-block via `/api/admin/users/:id/block` for each abusive account.
4. Add IP to Vercel firewall if attack ongoing.
5. Add domains to blocklist via `/api/admin/blocklist/domains`.

## Escalation
If >200 accounts from single subnet: escalate to infrastructure team for Vercel WAF rule.
