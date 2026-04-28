---
task: 025
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 7, 12, 13, 15, 20, 21]
---

# Task 025: Alerting & Observability — Abuse Spikes + System Health

## Skills
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/development/systematic-debugging/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Implement 5-minute cron-triggered abuse spike detector (IP subnet, fingerprint count, payment failure spike), auto-block on threshold, admin alerting via webhook + email, structured request logging, and runbooks for all 5 critical incidents.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/api/cron/abuse-detector/route.ts` | 5-min cron: scans for spikes, alerts, auto-blocks |
| `lib/alerts/notify.ts` | Admin alert dispatcher: webhook + email |
| `docs/runbooks/webhook-signature-failures.md` | Runbook |
| `docs/runbooks/webhook-lag.md` | Runbook |
| `docs/runbooks/payment-failure-spike.md` | Runbook |
| `docs/runbooks/abuse-spike.md` | Runbook |
| `docs/runbooks/email-delivery-failure.md` | Runbook |

### Modify
| File | What to change |
|------|---------------|
| `middleware.ts` (task 7) | Add structured request logging (request_id, user_id, latency_ms, status) |

---

## Dependencies
```bash
# No new packages
# ENV:
ADMIN_ALERT_WEBHOOK_URL=  # Slack/Discord/custom webhook
ADMIN_NOTIFICATION_EMAIL=
CRON_SECRET=
```

---

## Code Templates

### `lib/alerts/notify.ts`
```typescript
export type AlertPayload = {
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'critical';
};

export async function notifyAdmin(payload: AlertPayload): Promise<void> {
  const promises: Promise<unknown>[] = [];

  // Webhook (Slack/Discord/custom)
  if (process.env.ADMIN_ALERT_WEBHOOK_URL) {
    promises.push(
      fetch(process.env.ADMIN_ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[${payload.severity?.toUpperCase() ?? 'ALERT'}] ${payload.type}: ${payload.message}`,
          ...payload.metadata,
        }),
      }).catch((e) => console.error('Alert webhook failed:', e))
    );
  }

  // Email
  if (process.env.ADMIN_NOTIFICATION_EMAIL && process.env.NEXT_PUBLIC_APP_URL) {
    promises.push(
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY!,
        },
        body: JSON.stringify({
          template: 'account_blocked', // reuse generic template
          email: process.env.ADMIN_NOTIFICATION_EMAIL,
          message: `${payload.type}: ${payload.message}`,
        }),
      }).catch((e) => console.error('Alert email failed:', e))
    );
  }

  await Promise.allSettled(promises);
}
```

### `app/api/cron/abuse-detector/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAdmin } from '@/lib/alerts/notify';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const alerts: string[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 1. IP subnet spike: >50 new signups from same /24 in 1 hour
  const { data: recentSignups } = await supabase
    .from('user_ip_log')
    .select('ip_address, user_id')
    .eq('event_type', 'signup')
    .gte('created_at', oneHourAgo);

  const subnetMap: Record<string, Set<string>> = {};
  for (const row of recentSignups ?? []) {
    if (!row.ip_address) continue;
    const parts = row.ip_address.split('.');
    if (parts.length < 4) continue;
    const subnet = parts.slice(0, 3).join('.');
    if (!subnetMap[subnet]) subnetMap[subnet] = new Set();
    subnetMap[subnet].add(row.user_id);
  }
  for (const [subnet, users] of Object.entries(subnetMap)) {
    if (users.size > 50) {
      alerts.push(`IP subnet spike: ${subnet}.0/24 — ${users.size} signups in 1h`);
      await notifyAdmin({
        type: 'abuse_spike',
        message: `${users.size} new accounts from subnet ${subnet}.0/24 in 1 hour`,
        severity: 'critical',
        metadata: { subnet, count: users.size },
      });
    }
  }

  // 2. Fingerprint spike: >10 users from same fingerprint in 24h
  const { data: fpRows } = await supabase
    .from('user_devices')
    .select('fingerprint_hash, user_id')
    .gte('created_at', oneDayAgo);

  const fpMap: Record<string, Set<string>> = {};
  for (const row of fpRows ?? []) {
    if (!row.fingerprint_hash) continue;
    if (!fpMap[row.fingerprint_hash]) fpMap[row.fingerprint_hash] = new Set();
    fpMap[row.fingerprint_hash].add(row.user_id);
  }
  for (const [fp, users] of Object.entries(fpMap)) {
    if (users.size > 10) {
      alerts.push(`Fingerprint spike: ${fp.slice(0, 8)}… — ${users.size} accounts in 24h`);

      // Auto-block new signups from this fingerprint (write to abuse_logs as signal)
      await supabase.from('abuse_logs').insert({
        fingerprint_hash: fp,
        event_type: 'auto_block',
        rule_triggered: 'fingerprint_spike_10plus',
        action_taken: 'blocked',
        metadata: { count: users.size, user_ids: [...users].slice(0, 10) },
      });

      await notifyAdmin({
        type: 'fingerprint_spike',
        message: `${users.size} accounts from fingerprint ${fp.slice(0, 8)}… in 24h. Auto-blocked.`,
        severity: 'critical',
        metadata: { fp: fp.slice(0, 8), count: users.size },
      });
    }
  }

  // 3. Payment failure spike: >20 failed payments in 5 min
  const { count: failedCount } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('created_at', fiveMinAgo);

  if ((failedCount ?? 0) > 20) {
    alerts.push(`Payment failure spike: ${failedCount} failures in 5 min`);
    await notifyAdmin({
      type: 'payment_failure_spike',
      message: `${failedCount} payment failures in 5 minutes`,
      severity: 'critical',
      metadata: { count: failedCount },
    });
  }

  return NextResponse.json({ ok: true, alerts_fired: alerts.length, alerts });
}
```

### Structured request logging addition to `middleware.ts`
```typescript
// Add inside middleware.ts, after JWT validation succeeds:
// Structured log for every authenticated request
const requestId = crypto.randomUUID();
const res = NextResponse.next();
res.headers.set('x-request-id', requestId);
res.headers.set('x-user-id', user.id);

// Log to console (picked up by Vercel log drains)
console.log(JSON.stringify({
  level: 'info',
  request_id: requestId,
  user_id: user.id,
  method: req.method,
  pathname,
  ip,
  country: req.headers.get('cf-ipcountry') ?? 'XX',
  ts: new Date().toISOString(),
}));
```

---

## Runbooks

### `docs/runbooks/webhook-signature-failures.md`
```markdown
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
```

### `docs/runbooks/webhook-lag.md`
```markdown
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
```

### `docs/runbooks/payment-failure-spike.md`
```markdown
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
```

### `docs/runbooks/abuse-spike.md`
```markdown
# Runbook: Abuse Spike (IP/Fingerprint)

**Trigger:** >50 signups from /24 subnet in 1 hour, or >10 accounts from 1 fingerprint in 24h.

## Detection
Alert fired by abuse-detector cron. Check `abuse_logs` for event_type='auto_block'.

## Steps
1. Query `user_ip_log` for the subnet: `SELECT * FROM user_ip_log WHERE ip_address << '1.2.3.0/24' ORDER BY created_at DESC LIMIT 50;`
2. Review accounts: check email patterns for disposable domains.
3. Bulk-block via `/api/admin/users/:id/block` for each abusive account.
4. Add IP to Vercel firewall if attack ongoing.
5. Add domains to blocklist via `/api/admin/blocklist/domains`.

## Escalation
If >200 accounts from single subnet: escalate to infrastructure team for Vercel WAF rule.
```

### `docs/runbooks/email-delivery-failure.md`
```markdown
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
```

---

## Codebase Context

### Key Patterns in Use
- **5-min cron:** `vercel.json` schedule `*/5 * * * *`; authenticated with `CRON_SECRET`.
- **Auto-block via abuse_logs:** fingerprint spike writes an `auto_block` abuse_log entry — `fn_grant_free_credits` checks this pattern.
- **notifyAdmin:** dispatches to webhook + email in parallel; failures logged but don't block cron completion.
- **Structured logging:** JSON lines to stdout, picked up by Vercel log drain for external observability (Datadog, etc.).

### `vercel.json` addition
```json
{
  "crons": [
    { "path": "/api/cron/abuse-detector", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/daily-credit-rollup", "schedule": "0 2 * * *" }
  ]
}
```

---

## Handoff from Previous Task
**Files changed by task 7:** `middleware.ts` — add structured logging here.
**Files changed by task 20:** `lib/email/sender.ts` — `notifyAdmin` reuses the email send infrastructure.
**Context for this task:** All tables (`user_ip_log`, `user_devices`, `payments`, `abuse_logs`) exist (task 1).

---

## Implementation Steps
1. `lib/alerts/notify.ts` — admin alert dispatcher.
2. `app/api/cron/abuse-detector/route.ts` — spike detector.
3. Modify `middleware.ts` — add structured JSON logging.
4. Add cron entry to `vercel.json`.
5. Create all 5 runbooks in `docs/runbooks/`.
6. `npx tsc --noEmit`
7. Run: `/verify`

_Requirements: 18, 21, 28_

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| IP subnet >50 signups/1h | Alert admin; log abuse entry |
| Fingerprint >10 accounts/24h | Auto-block + alert admin |
| Failed payments >20/5min | Alert admin with count |
| Cron missing CRON_SECRET | 401 |
| Alert webhook unavailable | Log error silently; don't fail cron |

---

## Acceptance Criteria
- [ ] Synthetic spike of 51 signups from /24 subnet in 1h → admin alert fires
- [ ] 11+ accounts from same fingerprint → auto_block `abuse_logs` entry + admin alert
- [ ] >20 failed payments in 5 min → admin alert with count
- [ ] Cron without correct secret → 401
- [ ] Structured JSON log present in middleware for authenticated requests
- [ ] All 5 runbooks present in `docs/runbooks/`
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
