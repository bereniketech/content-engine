import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '@/lib/publish/distribution-log'
import { postToLinkedIn, LinkedInAuthError } from '@/lib/publish/linkedin'
import { ConfigError } from '@/lib/publish/secrets'

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

  let body: { sessionId?: unknown; content?: unknown; contentType?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Invalid JSON' } },
      { status: 400 }
    )
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''

  if (!sessionId || !content) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId and content are required' } },
      { status: 400 }
    )
  }

  try {
    await checkAlreadyPublished(supabase, sessionId, 'linkedin')
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
    externalId = await postToLinkedIn(content)
  } catch (err) {
    if (err instanceof LinkedInAuthError) {
      return NextResponse.json(
        { error: { code: 'token_expired', message: err.message } },
        { status: 401 }
      )
    }
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('publish/linkedin error', { error: err instanceof Error ? err.message : String(err) })
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
      platform: 'linkedin',
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
