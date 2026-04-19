import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '@/lib/publish/distribution-log'
import { postTweet, postThread, TwitterRateLimitError } from '@/lib/publish/twitter'
import { ConfigError } from '@/lib/publish/secrets'

type PublishXBody = {
  sessionId?: unknown
  content?: unknown
  contentType?: unknown
}

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

  let body: PublishXBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
      { status: 400 }
    )
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const contentType = typeof body.contentType === 'string' ? body.contentType : 'tweet'

  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId is required' } },
      { status: 400 }
    )
  }

  if (!body.content) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'content is required' } },
      { status: 400 }
    )
  }

  try {
    await checkAlreadyPublished(supabase, sessionId, 'x')
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
    if (contentType === 'thread' && Array.isArray(body.content)) {
      externalId = await postThread(body.content as string[])
    } else {
      const text = typeof body.content === 'string' ? body.content : String(body.content)
      externalId = await postTweet(text)
    }
  } catch (err) {
    if (err instanceof TwitterRateLimitError) {
      return NextResponse.json(
        { error: { code: 'rate_limited', message: err.message } },
        { status: 429 }
      )
    }
    if (err instanceof ConfigError) {
      console.error('publish/x config error', { varName: err.varName })
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('publish/x error', { error: err instanceof Error ? err.message : String(err) })
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
      platform: 'x',
      status: 'published',
      externalId,
    })
  } catch (err) {
    console.error('publish/x log write error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Published but failed to log result' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { externalId, logId } }, { status: 201 })
}
