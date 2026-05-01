import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

  const { id } = await params

  let body: { status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json', message: 'Invalid JSON' } }, { status: 400 })
  }

  if (body.status !== 'resolved') {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'Only status "resolved" is accepted' } },
      { status: 400 }
    )
  }

  const { data: existing, error: fetchError } = await supabase
    .from('refresh_triggers')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Refresh trigger not found' } },
      { status: 404 }
    )
  }

  if ((existing as Record<string, unknown>).user_id !== user.id) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Not authorized' } },
      { status: 403 }
    )
  }

  const { error: updateError } = await supabase
    .from('refresh_triggers')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to update trigger' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { id, status: 'resolved' } }, { status: 200 })
}
