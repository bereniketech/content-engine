import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { postTweet, postThread } from '@/lib/publish/twitter'
import { logger } from '@/lib/logger'
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
  try {
    verifyCronSecret(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message === 'Unauthorized' ? 401 : 500
    const code = status === 401 ? 'unauthorized' : 'config_error'
    const responseMessage = status === 401 ? 'Invalid cron secret' : 'Cron authentication unavailable'
    logger.error({ err: message }, 'schedule-worker cron auth error')
    return NextResponse.json(
      { error: { code, message: responseMessage } },
      { status }
    )
  }

  let supabase
  try {
    supabase = getServiceRoleClient()
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'schedule-worker service role error')
    return NextResponse.json(
      { error: { code: 'config_error', message: 'Service role client unavailable' } },
      { status: 500 }
    )
  }

  const { data: duePosts, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('id, session_id, user_id, platform, asset_type, content_snapshot, publish_at')
    .eq('status', 'queued')
    .lte('publish_at', new Date().toISOString())
    .order('publish_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchError) {
    logger.error({ err: fetchError.message }, 'schedule-worker fetch error')
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
      logger.error({ postId: post.id, platform: post.platform, err: errorDetails }, 'schedule-worker publish error')

      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error_details: errorDetails })
        .eq('id', post.id)

      failed++
    }
  }

  return NextResponse.json({ data: { processed, failed } }, { status: 200 })
}
