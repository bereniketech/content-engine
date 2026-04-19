import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

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
