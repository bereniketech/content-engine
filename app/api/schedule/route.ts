import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { VALIDATION_CONSTANTS } from '@/lib/validation'
import { SCHEDULABLE_PLATFORMS } from '@/lib/platform-config'
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

  let body: {
    sessionId?: unknown
    platform?: unknown
    publishAt?: unknown
    assetType?: unknown
    contentSnapshot?: unknown
    title?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json', message: 'Invalid JSON' } }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const platform = typeof body.platform === 'string' ? body.platform.trim() : ''
  const publishAtRaw = typeof body.publishAt === 'string' ? body.publishAt.trim() : ''
  const assetType = typeof body.assetType === 'string' ? body.assetType.trim() : ''
  const contentSnapshot = typeof body.contentSnapshot === 'object' && body.contentSnapshot !== null
    ? body.contentSnapshot
    : {}
  const title = typeof body.title === 'string' ? body.title.trim() || null : null

  const errors: string[] = []
  if (!sessionId) errors.push('sessionId is required')
  if (!platform || !SCHEDULABLE_PLATFORMS.includes(platform as typeof SCHEDULABLE_PLATFORMS[number])) {
    errors.push(`platform must be one of: ${SCHEDULABLE_PLATFORMS.join(', ')}`)
  }
  if (!assetType) errors.push('assetType is required')
  if (!publishAtRaw) errors.push('publishAt is required')

  if (errors.length > 0) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: errors.join('; ') } },
      { status: 400 }
    )
  }

  const publishAt = new Date(publishAtRaw)
  if (isNaN(publishAt.getTime())) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'publishAt must be a valid ISO 8601 date string' } },
      { status: 400 }
    )
  }

  if (publishAt.getTime() < Date.now() + VALIDATION_CONSTANTS.SCHEDULING_BUFFER_MS) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'publishAt must be at least 5 minutes in the future' } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      platform,
      asset_type: assetType,
      content_snapshot: contentSnapshot,
      status: 'queued',
      publish_at: publishAt.toISOString(),
      ...(title !== null ? { title } : {}),
    })
    .select('id, status, publish_at')
    .single()

  if (error || !data) {
    logger.error({ err: error?.message }, 'schedule/post insert error')
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to schedule post' } },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: { id: data.id, status: data.status, publishAt: data.publish_at } },
    { status: 201 }
  )
}

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  const { supabase } = auth

  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId query param is required' } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('id, platform, status, publish_at, asset_type, published_at, external_id')
    .eq('session_id', sessionId)
    .order('publish_at', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to fetch scheduled posts' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: data ?? [] }, { status: 200 })
}
