---
task: "011"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["001", "003", "004", "005", "006", "007", "008", "010"]
---

# Task 011: Schedule Worker — Process Queued Posts

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `app/api/cron/schedule-worker/route.ts` — a Next.js route handler protected by `CRON_SECRET` that processes up to 50 `scheduled_posts` whose `publish_at <= now()` and `status='queued'`, calling the appropriate publish lib function for each.

---

## Files
### Create
| File | Purpose |
|---|---|
| `app/api/cron/schedule-worker/route.ts` | Cron handler: process due queued posts |

### Modify
| File | What to change |
|---|---|
| `next.config.ts` | Add `vercel.json`-style cron config comment (informational) |

---

## Dependencies
```bash
# No new packages.

# Env vars:
CRON_SECRET=
# Also needs all platform publish env vars (TWITTER_API_KEY, etc.) — set in prior tasks
```

---

## API Contracts

### POST /api/cron/schedule-worker
**Headers required:**
```
Authorization: Bearer {CRON_SECRET}
```
**Response 200 (no due posts):** `{ "data": { "processed": 0 } }`
**Response 200 (processed):** `{ "data": { "processed": 3, "failed": 1 } }`
**Response 401:** `{ "error": { "code": "unauthorized", "message": "Invalid cron secret" } }`

---

## Code Templates

### `app/api/cron/schedule-worker/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { postTweet, postThread } from '@/lib/publish/twitter'
import { postToLinkedIn } from '@/lib/publish/linkedin'
import { publishToInstagram } from '@/lib/publish/instagram'
import { getRedditAccessToken, submitRedditPost } from '@/lib/publish/reddit'
import { dispatchMailchimp, dispatchSendGrid } from '@/lib/publish/newsletter'

const BATCH_SIZE = 50

interface ScheduledPostRow {
  id: string
  session_id: string
  user_id: string
  platform: string
  asset_type: string
  content_snapshot: Record<string, unknown>
  publish_at: string
}

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function publishPost(post: ScheduledPostRow): Promise<string> {
  const snap = post.content_snapshot

  switch (post.platform) {
    case 'x': {
      const contentType = typeof snap.contentType === 'string' ? snap.contentType : 'tweet'
      if (contentType === 'thread' && Array.isArray(snap.content)) {
        return await postThread(snap.content as string[])
      }
      const text = typeof snap.content === 'string' ? snap.content : ''
      return await postTweet(text)
    }
    case 'linkedin': {
      const content = typeof snap.content === 'string' ? snap.content : ''
      return await postToLinkedIn(content)
    }
    case 'instagram': {
      const caption = typeof snap.caption === 'string' ? snap.caption : ''
      const imageUrl = typeof snap.imageUrl === 'string' ? snap.imageUrl : ''
      return await publishToInstagram(caption, imageUrl)
    }
    case 'reddit': {
      const subreddit = typeof snap.subreddit === 'string' ? snap.subreddit : ''
      const title = typeof snap.title === 'string' ? snap.title : ''
      const body = typeof snap.body === 'string' ? snap.body : ''
      const accessToken = await getRedditAccessToken()
      return await submitRedditPost(subreddit, title, body, accessToken)
    }
    case 'newsletter_mailchimp': {
      const subjectLine = typeof snap.subjectLine === 'string' ? snap.subjectLine : ''
      const htmlBody = typeof snap.htmlBody === 'string' ? snap.htmlBody : ''
      return await dispatchMailchimp(subjectLine, htmlBody)
    }
    case 'newsletter_sendgrid': {
      const subjectLine = typeof snap.subjectLine === 'string' ? snap.subjectLine : ''
      const htmlBody = typeof snap.htmlBody === 'string' ? snap.htmlBody : ''
      const recipientEmail = typeof snap.recipientEmail === 'string' ? snap.recipientEmail : ''
      return await dispatchSendGrid(subjectLine, htmlBody, recipientEmail)
    }
    default:
      throw new Error(`Unknown platform: ${post.platform}`)
  }
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Invalid cron secret' } },
      { status: 401 }
    )
  }

  const supabase = getServiceRoleClient()

  const { data: duePosts, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('id, session_id, user_id, platform, asset_type, content_snapshot, publish_at')
    .eq('status', 'queued')
    .lte('publish_at', new Date().toISOString())
    .order('publish_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchError) {
    console.error('schedule-worker fetch error', { error: fetchError.message })
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to fetch queued posts' } },
      { status: 500 }
    )
  }

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ data: { processed: 0 } }, { status: 200 })
  }

  let processed = 0
  let failed = 0

  for (const post of duePosts as ScheduledPostRow[]) {
    try {
      const externalId = await publishPost(post)

      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          external_id: externalId,
        })
        .eq('id', post.id)

      // Also write to distribution_logs
      await supabase.from('distribution_logs').insert({
        session_id: post.session_id,
        user_id: post.user_id,
        platform: post.platform,
        status: 'published',
        external_id: externalId,
        metadata: { source: 'scheduler' },
      })

      processed++
    } catch (err) {
      const errorDetails = err instanceof Error ? err.message : String(err)
      console.error('schedule-worker publish error', { postId: post.id, platform: post.platform, error: errorDetails })

      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error_details: errorDetails })
        .eq('id', post.id)

      failed++
    }
  }

  return NextResponse.json({ data: { processed, failed } }, { status: 200 })
}
```

---

## Codebase Context

### Key Code Snippets

Service role client pattern (not used elsewhere in codebase yet — first usage):
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
```
Use `SUPABASE_SERVICE_ROLE_KEY` env var (server-side only, never exposed to browser).

Publish lib functions imported from tasks 004-008:
- `postTweet(text)` → `string` (tweet id) — from `lib/publish/twitter.ts`
- `postThread(tweets)` → `string` — from `lib/publish/twitter.ts`
- `postToLinkedIn(content)` → `string` — from `lib/publish/linkedin.ts`
- `publishToInstagram(caption, imageUrl)` → `string` — from `lib/publish/instagram.ts`
- `getRedditAccessToken()` + `submitRedditPost(sr, title, body, token)` — from `lib/publish/reddit.ts`
- `dispatchMailchimp(subject, html)` → `string` — from `lib/publish/newsletter.ts`
- `dispatchSendGrid(subject, html, email)` → `string` — from `lib/publish/newsletter.ts`

### Key Patterns in Use
- Cron endpoints protected with `CRON_SECRET` Bearer token check
- Service role client bypasses RLS — needed to process any user's scheduled posts
- Each post processed independently — failure of one does not stop others
- Both `scheduled_posts` and `distribution_logs` updated on success

---

## Implementation Steps
1. Create directory `app/api/cron/schedule-worker/`.
2. Create `app/api/cron/schedule-worker/route.ts` — paste full code from Code Templates.
3. Add `CRON_SECRET=` and `SUPABASE_SERVICE_ROLE_KEY=` to `.env` (values to be filled by project).

---

## Test Cases

```typescript
// Manual test steps:
// 1. Insert a scheduled_post with publish_at = past timestamp, status='queued'
// 2. POST /api/cron/schedule-worker with Authorization: Bearer {CRON_SECRET}
// 3. Verify scheduled_posts row has status='published' and external_id set
// 4. Verify distribution_logs row inserted for same session

// Unit test key logic:
// - Without CRON_SECRET header → 401
// - With wrong CRON_SECRET → 401
// - With no due posts → { processed: 0 }
// - With mock supabase returning 1 due post + mock publishPost succeeding → { processed: 1, failed: 0 }
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `publishPost` throws for one post | Mark that post failed; continue to next post |
| `SUPABASE_SERVICE_ROLE_KEY` not set | Throw in `getServiceRoleClient()` → route returns 500 |
| Post `platform` not in switch | Throw "Unknown platform" → post marked failed |
| Vercel Cron configuration | Add `vercel.json` with `{ "crons": [{ "path": "/api/cron/schedule-worker", "schedule": "*/5 * * * *" }] }` |

---

## Acceptance Criteria
- [ ] WHEN POST without valid `CRON_SECRET`, THEN returns 401
- [ ] WHEN no queued posts are due, THEN returns 200 with `{ processed: 0 }`
- [ ] WHEN due queued post exists and publish succeeds, THEN `scheduled_posts.status='published'` and `distribution_logs` row inserted
- [ ] WHEN publish fails for one post, THEN `scheduled_posts.status='failed'` with error_details; other posts still processed
- [ ] WHEN `SUPABASE_SERVICE_ROLE_KEY` missing, THEN returns 500

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-012 builds ScheduleModal UI and extends CalendarPanel to show scheduled post badges
**Open questions:** _(fill via /task-handoff)_
