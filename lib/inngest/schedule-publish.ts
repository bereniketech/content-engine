import { createClient } from '@supabase/supabase-js'
import { inngest } from './client'
import { logger } from '@/lib/logger'

const MAX_POSTS_PER_TICK = 20

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
        .limit(MAX_POSTS_PER_TICK)
      return data ?? []
    })

    for (const post of duePosts) {
      await step.run(`publish-post-${post.id}`, async () => {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        try {
          // Mark as publishing to prevent double-processing
          await supabase
            .from('scheduled_posts')
            .update({ status: 'publishing' })
            .eq('id', post.id)

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          const res = await fetch(`${baseUrl}/api/publish/${post.platform}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-cron-auth': process.env.CRON_SECRET ?? '',
            },
            body: JSON.stringify({
              sessionId: post.session_id,
              ...post.content_snapshot,
            }),
          })

          if (res.ok) {
            await supabase
              .from('scheduled_posts')
              .update({ status: 'published', published_at: new Date().toISOString() })
              .eq('id', post.id)
          } else {
            const errText = await res.text()
            await supabase
              .from('scheduled_posts')
              .update({ status: 'failed', error_details: errText.slice(0, 500) })
              .eq('id', post.id)
          }
        } catch (err) {
          logger.error({ err, postId: post.id }, 'Scheduled publish failed')
          await supabase
            .from('scheduled_posts')
            .update({ status: 'failed', error_details: String(err).slice(0, 500) })
            .eq('id', post.id)
        }
      })
    }

    return { processed: duePosts.length }
  }
)
