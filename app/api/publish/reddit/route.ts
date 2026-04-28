import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '@/lib/publish/distribution-log'
import { getRedditAccessToken, submitRedditPost, RedditForbiddenError } from '@/lib/publish/reddit'
import { ConfigError } from '@/lib/publish/secrets'
import { logger } from '@/lib/logger'

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

  let body: { sessionId?: unknown; title?: unknown; body?: unknown; subreddit?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json', message: 'Invalid JSON' } }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const postBody = typeof body.body === 'string' ? body.body.trim() : ''
  const subreddit = typeof body.subreddit === 'string' ? body.subreddit.trim().replace(/^r\//, '') : ''

  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId is required' } },
      { status: 400 }
    )
  }
  if (!subreddit) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'subreddit is required' } },
      { status: 400 }
    )
  }
  if (!title) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'title is required' } },
      { status: 400 }
    )
  }

  try {
    await checkAlreadyPublished(supabase, sessionId, 'reddit')
  } catch (err) {
    if (err instanceof AlreadyPublishedError) {
      return NextResponse.json(
        { error: { code: 'already_published', message: err.message } },
        { status: 409 }
      )
    }
  }

  let externalId: string
  try {
    const accessToken = await getRedditAccessToken()
    externalId = await submitRedditPost(subreddit, title, postBody, accessToken)
  } catch (err) {
    if (err instanceof RedditForbiddenError) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: err.message } },
        { status: 403 }
      )
    }
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'publish/reddit error')
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
      platform: 'reddit',
      status: 'published',
      externalId,
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Published but failed to log result' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { externalId, logId } }, { status: 201 })
}
