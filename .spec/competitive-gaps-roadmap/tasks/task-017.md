---
task: "017"
feature: competitive-gaps-roadmap
rec: R4
title: "Create Inngest function content/schedule.publish with cron trigger"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["016"]
---

## Skills
- `.kit/skills/development/code-writing-software-development/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Create an Inngest background function that runs every minute, picks up due `scheduled_posts` (status='queued', publish_at ≤ now), and publishes each via the appropriate platform route. Update status to 'published' or 'failed'.

## Files

### Create
- `D:/content-engine/lib/inngest/schedule-publish.ts`

### Modify
- `D:/content-engine/app/api/inngest/route.ts` (register new function)

## Dependencies
- Existing `lib/inngest/client.ts` (exports `inngest`)
- Existing `lib/inngest/data-driven-pipeline.ts` (shows function pattern)
- `SUPABASE_SERVICE_ROLE_KEY` env var (for server-side Supabase queries bypassing RLS)

## Codebase Context

Existing Inngest function pattern (from `lib/inngest/data-driven-pipeline.ts`, inferred from project structure):
```typescript
import { inngest } from './client'
import { createClient } from '@supabase/supabase-js'

export const scheduledPublish = inngest.createFunction(
  { id: 'scheduled-publish', name: 'Scheduled Post Publisher' },
  { cron: '* * * * *' },
  async ({ step }) => {
    // step functions for reliability
  }
)
```

Service role Supabase client (bypasses RLS — required for cron reading all users' posts):
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

Existing `app/api/publish/` routes handle platform publishing (one per platform). The cron should call them via internal fetch or direct lib function calls.

`app/api/inngest/route.ts` registers all functions via `serve()`.

## Implementation Steps

1. Create `lib/inngest/schedule-publish.ts`:

```typescript
import { inngest } from './client'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const scheduledPublish = inngest.createFunction(
  {
    id: 'scheduled-publish',
    name: 'Scheduled Post Publisher',
    concurrency: { limit: 5 },
  },
  { cron: '* * * * *' },
  async ({ step }) => {
    const duePosts = await step.run('fetch-due-posts', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'queued')
        .lte('publish_at', new Date().toISOString())
        .limit(20)
      return data ?? []
    })

    for (const post of duePosts) {
      await step.run(`publish-post-${post.id}`, async () => {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        try {
          // Mark as publishing
          await supabase.from('scheduled_posts')
            .update({ status: 'publishing' })
            .eq('id', post.id)

          // Call appropriate publish route
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          const res = await fetch(`${baseUrl}/api/publish/${post.platform}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-cron-auth': process.env.CRON_SECRET ?? '' },
            body: JSON.stringify({ sessionId: post.session_id, ...post.content_snapshot }),
          })

          if (res.ok) {
            await supabase.from('scheduled_posts')
              .update({ status: 'published', published_at: new Date().toISOString() })
              .eq('id', post.id)
          } else {
            const err = await res.text()
            await supabase.from('scheduled_posts')
              .update({ status: 'failed', error_details: err.slice(0, 500) })
              .eq('id', post.id)
          }
        } catch (err) {
          await supabase.from('scheduled_posts')
            .update({ status: 'failed', error_details: String(err).slice(0, 500) })
            .eq('id', post.id)
          logger.error({ err, postId: post.id }, 'Scheduled publish failed')
        }
      })
    }

    return { processed: duePosts.length }
  }
)
```

2. Register in `app/api/inngest/route.ts`:
   - Import `scheduledPublish` from `'@/lib/inngest/schedule-publish'`
   - Add to the `serve()` functions array

## Test Cases

- No due posts → returns `{ processed: 0 }`
- Due post with successful publish → status updated to 'published', published_at set
- Due post with platform API failure → status updated to 'failed', error_details stored
- Exception during publish → status updated to 'failed', no crash
- Limit of 20 posts per cron tick (prevent overload)

## Decision Rules
- Use service role key (not user JWT) for DB operations — cron runs without user context.
- Use `step.run()` for each post to enable Inngest retry semantics per post.
- Never process more than 20 posts per tick.
- Set status to 'publishing' before attempting to prevent double-processing.

## Acceptance Criteria
- `scheduledPublish` Inngest function registered with cron `"* * * * *"`.
- Processes all due `scheduled_posts` up to limit 20.
- Updates status to 'published' on success, 'failed' with error_details on failure.
- Function registered in `app/api/inngest/route.ts`.
- Uses service role key — does not require user JWT.

Status: COMPLETE
Completed: 2026-04-28T07:24:02Z
