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

  let supabase
  try {
    supabase = getServiceRoleClient()
  } catch (err) {
    console.error('schedule-worker service role error', { error: err instanceof Error ? err.message : String(err) })
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
