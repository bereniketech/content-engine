---
task: 020
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 6, 7]
---

# Task 020: Email Notification System — Resend + 14 Templates

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Build a centralized email sender with Resend, retry logic (3× exponential backoff), `email_log` persistence, and all 14 required templates. Expose an internal `POST /api/email/send` endpoint called fire-and-forget by other routes.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/email/sender.ts` | Resend wrapper with retry + email_log |
| `lib/email/templates.ts` | All 14 HTML/text template builders |
| `app/api/email/send/route.ts` | Internal endpoint — validate template, call sender |

### Modify
_(none)_

---

## Dependencies
```bash
npm install resend

# ENV vars:
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ADMIN_ALERT_WEBHOOK_URL=   # Slack/Discord/custom webhook for admin alerts
```

---

## API Contracts
```
POST /api/email/send   (internal — not rate limited by user, only callable server-side)
  Body: {
    template: TemplateId;
    userId?: string;
    email: string;
    [templateData: string]: unknown;
  }
  200 → { ok: true; message_id?: string }
  400 → { error: 'Unknown template.' }
  500 → { error: 'Email failed after retries.' }
```

---

## Code Templates

### `lib/email/templates.ts`
```typescript
export type TemplateId =
  | 'magic_link'
  | 'signup_verify_otp'
  | 'signup_verify_resend'
  | 'welcome'
  | 'payment_captured'
  | 'payment_failed'
  | 'subscription_activated'
  | 'subscription_renewed'
  | 'subscription_past_due'
  | 'subscription_cancelled'
  | 'low_credits_alert'
  | 'team_invite'
  | 'team_member_removed'
  | 'account_blocked';

export type TemplateData = Record<string, unknown>;

export function buildEmail(
  template: TemplateId,
  data: TemplateData
): { subject: string; html: string; text: string } {
  switch (template) {
    case 'magic_link':
      return {
        subject: 'Your login link',
        html: `<p>Click to log in: <a href="${data.magicUrl}">Log in</a>. Expires in 15 minutes.</p>`,
        text: `Log in here: ${data.magicUrl}\nExpires in 15 minutes.`,
      };
    case 'signup_verify_otp':
      return {
        subject: 'Verify your email',
        html: `<p>Your verification code: <strong>${data.otp}</strong>. Valid for 10 minutes.</p>`,
        text: `Your verification code: ${data.otp}. Valid for 10 minutes.`,
      };
    case 'signup_verify_resend':
      return {
        subject: 'New verification code',
        html: `<p>Your new code: <strong>${data.otp}</strong>. Valid for 10 minutes.</p>`,
        text: `Your new code: ${data.otp}. Valid for 10 minutes.`,
      };
    case 'welcome':
      return {
        subject: 'Welcome to Content Engine',
        html: `<p>Hi ${data.email}, your account is ready. You have ${data.credits} free credits to get started.</p>`,
        text: `Welcome! You have ${data.credits} free credits to get started.`,
      };
    case 'payment_captured':
      return {
        subject: 'Payment confirmed',
        html: `<p>Payment of ${data.currency} ${data.amount} confirmed. Your credits have been updated.</p>`,
        text: `Payment of ${data.currency} ${data.amount} confirmed.`,
      };
    case 'payment_failed':
      return {
        subject: 'Payment failed',
        html: `<p>Your payment of ${data.currency} ${data.amount} failed. Please try again.</p>`,
        text: `Payment of ${data.currency} ${data.amount} failed.`,
      };
    case 'subscription_activated':
      return {
        subject: 'Subscription activated',
        html: `<p>Your ${data.planName} subscription is now active. ${data.credits} credits added.</p>`,
        text: `Subscription active: ${data.planName}. ${data.credits} credits added.`,
      };
    case 'subscription_renewed':
      return {
        subject: 'Subscription renewed',
        html: `<p>Your ${data.planName} plan has renewed. ${data.credits} credits added for the new period.</p>`,
        text: `Subscription renewed: ${data.planName}. ${data.credits} credits added.`,
      };
    case 'subscription_past_due':
      return {
        subject: 'Action required: Payment failed',
        html: `<p>Your subscription payment failed. Please update your payment method to avoid service interruption.</p>`,
        text: `Subscription payment failed. Update your payment method.`,
      };
    case 'subscription_cancelled':
      return {
        subject: 'Subscription cancelled',
        html: `<p>Your ${data.planName} subscription has been cancelled. Access continues until ${data.periodEnd}.</p>`,
        text: `Subscription cancelled. Access continues until ${data.periodEnd}.`,
      };
    case 'low_credits_alert':
      return {
        subject: 'Low credit balance',
        html: `<p>Your credit balance is low (${data.balance} credits remaining). <a href="${data.topupUrl}">Top up now</a>.</p>`,
        text: `Low credits: ${data.balance} remaining. Top up at ${data.topupUrl}`,
      };
    case 'team_invite':
      return {
        subject: `You're invited to join ${data.teamName}`,
        html: `<p>You've been invited to ${data.teamName}. <a href="${data.acceptUrl}">Accept invite</a>. Expires in 48 hours.</p>`,
        text: `Accept invite to ${data.teamName}: ${data.acceptUrl}`,
      };
    case 'team_member_removed':
      return {
        subject: `Removed from ${data.teamName}`,
        html: `<p>You have been removed from the team ${data.teamName}.</p>`,
        text: `You have been removed from ${data.teamName}.`,
      };
    case 'account_blocked':
      return {
        subject: 'Account suspended',
        html: `<p>Your account has been suspended. Contact support if you believe this is an error.</p>`,
        text: `Your account has been suspended. Contact support if you believe this is an error.`,
      };
    default:
      throw new Error(`Unknown template: ${template}`);
  }
}
```

### `lib/email/sender.ts`
```typescript
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { buildEmail, TemplateId, TemplateData } from './templates';

const resend = new Resend(process.env.RESEND_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DELAYS_MS = [1000, 4000, 16000];

export async function sendEmail(opts: {
  template: TemplateId;
  to: string;
  userId?: string;
  data: TemplateData;
}): Promise<{ ok: boolean; message_id?: string }> {
  const { subject, html, text } = buildEmail(opts.template, opts.data);

  // Create log row
  const { data: logRow } = await supabase
    .from('email_log')
    .insert({
      user_id: opts.userId ?? null,
      template_id: opts.template,
      recipient: opts.to,
      status: 'pending',
    })
    .select('id')
    .single();

  const logId = logRow?.id;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: opts.to,
        subject,
        html,
        text,
      });

      if (error) throw new Error(error.message);

      await supabase
        .from('email_log')
        .update({
          status: 'sent',
          provider_id: data?.id,
          sent_at: new Date().toISOString(),
          attempts: attempt + 1,
        })
        .eq('id', logId);

      return { ok: true, message_id: data?.id };
    } catch (err) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, DELAYS_MS[attempt]));
      } else {
        // All retries failed
        await supabase
          .from('email_log')
          .update({ status: 'failed', attempts: 3 })
          .eq('id', logId);

        // Alert admin
        fetch(process.env.ADMIN_ALERT_WEBHOOK_URL!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'email_delivery_failure',
            template: opts.template,
            to: opts.to,
            error: String(err),
          }),
        }).catch(() => {});

        return { ok: false };
      }
    }
  }

  return { ok: false };
}
```

### `app/api/email/send/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/sender';
import { TemplateId } from '@/lib/email/templates';

const VALID_TEMPLATES: TemplateId[] = [
  'magic_link', 'signup_verify_otp', 'signup_verify_resend', 'welcome',
  'payment_captured', 'payment_failed', 'subscription_activated',
  'subscription_renewed', 'subscription_past_due', 'subscription_cancelled',
  'low_credits_alert', 'team_invite', 'team_member_removed', 'account_blocked',
];

export async function POST(req: NextRequest) {
  // Internal only — validate this is a server-side call
  const callerKey = req.headers.get('x-internal-key');
  if (callerKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await req.json();
  const { template, email, userId, ...data } = body;

  if (!VALID_TEMPLATES.includes(template as TemplateId)) {
    return NextResponse.json({ error: 'Unknown template.' }, { status: 400 });
  }

  const result = await sendEmail({ template: template as TemplateId, to: email, userId, data });

  if (!result.ok) {
    return NextResponse.json({ error: 'Email failed after retries.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message_id: result.message_id });
}
```

---

## Codebase Context

### Key Patterns in Use
- **Fire-and-forget pattern:** caller routes use `fetch('/api/email/send', ...).catch(()=>{})` — email failure never blocks the main flow.
- **Retry 3× backoff:** 1s → 4s → 16s; after final failure writes `status='failed'` + admin webhook.
- **Internal endpoint protection:** `x-internal-key` header prevents public access; set `INTERNAL_API_KEY` in env.
- **email_log:** every attempt writes a log row; `status` transitions: `pending → sent | failed`.

### ENV to add to `.env.local`
```
INTERNAL_API_KEY=<random-secret>
```
All internal `fetch` calls to `/api/email/send` must include `x-internal-key: <INTERNAL_API_KEY>`.

---

## Handoff from Previous Task
**Files changed by task 1:** `email_log` table exists (partitioned).
**Context for this task:** tasks 6, 15, 16, 17, 18, 21 all call fire-and-forget email sends.

---

## Implementation Steps
1. `lib/email/templates.ts` — all 14 templates.
2. `lib/email/sender.ts` — Resend + retry + logging.
3. `app/api/email/send/route.ts` — internal endpoint.
4. Add `INTERNAL_API_KEY` to env.
5. Update all existing fire-and-forget email calls (tasks 6, etc.) to include `x-internal-key` header.
6. `npx tsc --noEmit`
7. Run: `/verify`

_Requirements: 25, 28_

---

## Test Cases

### `lib/email/templates.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { buildEmail } from './templates';

describe('buildEmail', () => {
  it('builds magic_link email', () => {
    const { subject, html } = buildEmail('magic_link', { magicUrl: 'https://example.com/link' });
    expect(subject).toBe('Your login link');
    expect(html).toContain('https://example.com/link');
  });
  it('builds signup_verify_otp with code', () => {
    const { html } = buildEmail('signup_verify_otp', { otp: '123456' });
    expect(html).toContain('123456');
  });
  it('throws on unknown template', () => {
    expect(() => buildEmail('unknown' as any, {})).toThrow('Unknown template');
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Resend call fails | Retry up to 3× with exponential backoff |
| All 3 retries fail | Log `status=failed` + POST to `ADMIN_ALERT_WEBHOOK_URL` |
| Unknown template | Return 400 immediately |
| `ADMIN_ALERT_WEBHOOK_URL` not set | Skip admin alert silently |
| Email delivery caller is not internal | Return 403 |

---

## Acceptance Criteria
- [ ] All 14 templates render (subject + html + text) without errors
- [ ] `sendEmail` retries 3× on failure with 1/4/16s delays
- [ ] 3 failures → `email_log.status='failed'` + admin alert webhook triggered
- [ ] Each send writes `email_log` row with correct status
- [ ] Unknown template → 400
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
