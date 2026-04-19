---
task: "008"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["001", "003"]
---

# Task 008: Newsletter Dispatch API (Mailchimp + SendGrid)

## Skills
- .kit/skills/integrations/mailchimp-automation/SKILL.md
- .kit/skills/integrations/sendgrid-automation/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `lib/publish/newsletter.ts` (Mailchimp campaign creation+send and SendGrid single email) and `app/api/publish/newsletter/route.ts` (routes to one of the two providers based on `provider` field).

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/publish/newsletter.ts` | Mailchimp and SendGrid dispatch functions |
| `app/api/publish/newsletter/route.ts` | POST handler for newsletter dispatch |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# No new packages needed (uses fetch).

# Env vars:
MAILCHIMP_API_KEY=
MAILCHIMP_AUDIENCE_ID=
SENDGRID_API_KEY=
```

---

## API Contracts

### POST /api/publish/newsletter
**Request:**
```json
{
  "sessionId": "uuid",
  "provider": "mailchimp",
  "subjectLine": "Your weekly digest is here",
  "body": "<html><body>Newsletter content</body></html>",
  "recipientEmail": "user@example.com"
}
```
`recipientEmail` is required for SendGrid; ignored for Mailchimp (uses audience).

**Response 201:** `{ "data": { "campaignId": "campaign_id_or_sendgrid_message_id", "logId": "uuid" } }`
**Response 400:** `{ "error": { "code": "validation_error", "message": "..." } }`
**Response 409:** `{ "error": { "code": "already_published", "message": "Already published to newsletter_mailchimp for this session." } }`
**Response 500:** `{ "error": { "code": "config_error", "message": "Missing configuration: MAILCHIMP_API_KEY" } }`

---

## Code Templates

### `lib/publish/newsletter.ts`

```typescript
import { getMailchimpSecrets, getSendGridSecrets } from './secrets'

function getMailchimpDataCenter(apiKey: string): string {
  // API key format: key-dcN (e.g. abc123-us6)
  const parts = apiKey.split('-')
  return parts[parts.length - 1] ?? 'us1'
}

export async function dispatchMailchimp(
  subjectLine: string,
  htmlBody: string,
): Promise<string> {
  const { apiKey, audienceId } = getMailchimpSecrets()
  const dc = getMailchimpDataCenter(apiKey)
  const base = `https://${dc}.api.mailchimp.com/3.0`
  const auth = `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`

  // Step 1: Create campaign
  const createResponse = await fetch(`${base}/campaigns`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'regular',
      recipients: { list_id: audienceId },
      settings: {
        subject_line: subjectLine,
        from_name: 'Content Engine',
        reply_to: 'noreply@contentengine.app',
        title: `CE: ${subjectLine.slice(0, 40)}`,
      },
    }),
  })

  if (!createResponse.ok) {
    const err = await createResponse.json() as { title?: string; detail?: string }
    throw new Error(`Mailchimp create campaign error: ${err.title ?? err.detail ?? createResponse.status}`)
  }

  const campaign = await createResponse.json() as { id: string }
  const campaignId = campaign.id

  // Step 2: Set campaign content
  const contentResponse = await fetch(`${base}/campaigns/${campaignId}/content`, {
    method: 'PUT',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ html: htmlBody }),
  })

  if (!contentResponse.ok) {
    const err = await contentResponse.json() as { title?: string }
    throw new Error(`Mailchimp set content error: ${err.title ?? contentResponse.status}`)
  }

  // Step 3: Send campaign
  const sendResponse = await fetch(`${base}/campaigns/${campaignId}/actions/send`, {
    method: 'POST',
    headers: { Authorization: auth },
  })

  if (!sendResponse.ok && sendResponse.status !== 204) {
    const errText = await sendResponse.text()
    throw new Error(`Mailchimp send error ${sendResponse.status}: ${errText}`)
  }

  return campaignId
}

export async function dispatchSendGrid(
  subjectLine: string,
  htmlBody: string,
  recipientEmail: string,
): Promise<string> {
  const { apiKey } = getSendGridSecrets()

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: recipientEmail }] }],
      from: { email: 'noreply@contentengine.app', name: 'Content Engine' },
      subject: subjectLine,
      content: [{ type: 'text/html', value: htmlBody }],
    }),
  })

  // SendGrid returns 202 on success with no body
  if (!response.ok && response.status !== 202) {
    const errBody = await response.text()
    throw new Error(`SendGrid error ${response.status}: ${errBody}`)
  }

  return `sg_${Date.now()}`
}
```

### `app/api/publish/newsletter/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '@/lib/publish/distribution-log'
import { dispatchMailchimp, dispatchSendGrid } from '@/lib/publish/newsletter'
import { ConfigError } from '@/lib/publish/secrets'

const VALID_PROVIDERS = ['mailchimp', 'sendgrid'] as const
type NewsletterProvider = typeof VALID_PROVIDERS[number]

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  const { user, supabase } = auth

  let body: { sessionId?: unknown; provider?: unknown; subjectLine?: unknown; body?: unknown; recipientEmail?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json', message: 'Invalid JSON' } }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const provider = typeof body.provider === 'string' && VALID_PROVIDERS.includes(body.provider as NewsletterProvider)
    ? (body.provider as NewsletterProvider)
    : null
  const subjectLine = typeof body.subjectLine === 'string' ? body.subjectLine.trim() : ''
  const htmlBody = typeof body.body === 'string' ? body.body.trim() : ''
  const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : ''

  const validationErrors: string[] = []
  if (!sessionId) validationErrors.push('sessionId is required')
  if (!provider) validationErrors.push('provider must be "mailchimp" or "sendgrid"')
  if (!subjectLine) validationErrors.push('subjectLine is required')
  if (!htmlBody) validationErrors.push('body is required')
  if (provider === 'sendgrid' && !recipientEmail) validationErrors.push('recipientEmail is required for SendGrid')

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: validationErrors.join('; ') } },
      { status: 400 }
    )
  }

  const platform = `newsletter_${provider!}` as 'newsletter_mailchimp' | 'newsletter_sendgrid'

  try {
    await checkAlreadyPublished(supabase, sessionId, platform)
  } catch (err) {
    if (err instanceof AlreadyPublishedError) {
      return NextResponse.json(
        { error: { code: 'already_published', message: err.message } },
        { status: 409 }
      )
    }
  }

  let campaignId: string
  try {
    if (provider === 'mailchimp') {
      campaignId = await dispatchMailchimp(subjectLine, htmlBody)
    } else {
      campaignId = await dispatchSendGrid(subjectLine, htmlBody, recipientEmail)
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('publish/newsletter error', { provider, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }

  let logId: string
  try {
    logId = await writeDistributionLog({
      supabase,
      sessionId,
      userId: user.id,
      platform,
      status: 'published',
      externalId: campaignId,
      metadata: { subjectLine, provider: provider! },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Sent but failed to log result' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { campaignId, logId } }, { status: 201 })
}
```

---

## Codebase Context

### Key Patterns in Use
- Mailchimp API key format: `<key>-<datacenter>` — parse DC from last segment after `-`
- Mailchimp auth: `Basic base64("anystring:<apiKey>")`
- SendGrid returns 202 Accepted on success (no body)
- `platform` stored in logs as `newsletter_mailchimp` or `newsletter_sendgrid` to allow separate idempotency

---

## Implementation Steps
1. Create `lib/publish/newsletter.ts` from Code Templates.
2. Create `app/api/publish/newsletter/route.ts` from Code Templates.

---

## Test Cases

```typescript
// lib/publish/__tests__/newsletter.test.ts
import { dispatchMailchimp, dispatchSendGrid } from '../newsletter'

const mockFetch = jest.spyOn(global, 'fetch')
beforeEach(() => {
  process.env.MAILCHIMP_API_KEY = 'testkey-us6'
  process.env.MAILCHIMP_AUDIENCE_ID = 'aud123'
  process.env.SENDGRID_API_KEY = 'sg-key'
  mockFetch.mockReset()
})

describe('dispatchMailchimp', () => {
  it('creates campaign, sets content, sends, returns campaignId', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'camp_001' }) } as any) // create
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as any) // content
      .mockResolvedValueOnce({ ok: true, status: 204 } as any) // send
    const id = await dispatchMailchimp('Subject', '<p>Body</p>')
    expect(id).toBe('camp_001')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})

describe('dispatchSendGrid', () => {
  it('sends email and returns sg_ prefixed id', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 202 } as any)
    const id = await dispatchSendGrid('Subject', '<p>Body</p>', 'test@example.com')
    expect(id).toMatch(/^sg_/)
  })
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `provider` is neither 'mailchimp' nor 'sendgrid' | Return 400 validation error |
| Mailchimp campaign creation succeeds but send fails | Throw error — route returns 500; no log written |
| SendGrid returns 202 | Treat as success; generate synthetic ID `sg_{timestamp}` |

---

## Acceptance Criteria
- [ ] WHEN POST with `provider='mailchimp'` and valid inputs, THEN Mailchimp campaign created + sent; returns 201
- [ ] WHEN POST with `provider='sendgrid'` and valid inputs, THEN SendGrid email dispatched; returns 201
- [ ] WHEN `provider='sendgrid'` and `recipientEmail` is missing, THEN returns 400
- [ ] WHEN `MAILCHIMP_API_KEY` not set, THEN returns 500 config_error
- [ ] WHEN already published (same session + newsletter_mailchimp), THEN returns 409

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-009 builds the shared PublishButton UI component that calls all these publish APIs
**Open questions:** _(fill via /task-handoff)_
