import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const FIVE_MINUTES_MS = 5 * 60 * 1000

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Invalid JSON' } },
      { status: 400 }
    )
  }

  const { id } = params
  const updates: Record<string, unknown> = {}

  if (typeof body.publishAt === 'string') {
    const publishAtDate = new Date(body.publishAt)
    if (isNaN(publishAtDate.getTime())) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'publishAt must be a valid ISO 8601 date' } },
        { status: 400 }
      )
    }
    if (publishAtDate.getTime() < Date.now() + FIVE_MINUTES_MS) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'publish_at must be at least 5 minutes in the future' } },
        { status: 400 }
      )
    }
    updates.publish_at = publishAtDate.toISOString()
  }

  if (typeof body.status === 'string' && ['queued', 'cancelled'].includes(body.status)) {
    updates.status = body.status
  }

  if (typeof body.title === 'string') {
    updates.title = body.title.trim() || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'No valid fields to update' } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('scheduled_posts')
    .update(updates)
    .eq('id', id)
    .select('id, status, publish_at, title')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Scheduled post not found' } },
      { status: 404 }
    )
  }

  return NextResponse.json(
    { data: { id: data.id, status: data.status, publishAt: data.publish_at, title: data.title ?? null } },
    { status: 200 }
  )
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { id } = params

  const { data: existing, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('id, status, user_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Scheduled post not found' } },
      { status: 404 }
    )
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Not authorized' } },
      { status: 403 }
    )
  }

  if (existing.status !== 'queued') {
    return NextResponse.json(
      { error: { code: 'invalid_state', message: `Cannot cancel a post with status '${existing.status}'` } },
      { status: 409 }
    )
  }

  const { error: updateError } = await supabase
    .from('scheduled_posts')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to cancel post' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { id, status: 'cancelled' } }, { status: 200 })
}
