// OWASP checklist: JWT auth required, ownership verified via session→user_id, input sanitized, generic error responses.
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const assetId = params.id

    if (!assetId) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'Asset ID is required' } },
        { status: 400 }
      )
    }

    let body: { content?: Record<string, unknown> }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    if (!body.content || typeof body.content !== 'object') {
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'content field is required and must be an object' } },
        { status: 400 }
      )
    }

    // Verify ownership: asset must belong to a session owned by this user
    const { data: existing, error: fetchError } = await supabase
      .from('content_assets')
      .select('id, session_id, content_sessions!inner(user_id)')
      .eq('id', assetId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Asset not found' } },
        { status: 404 }
      )
    }

    const sessionOwner = (existing as unknown as { content_sessions: { user_id: string } }).content_sessions?.user_id
    if (sessionOwner !== user.id) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: 'Access denied' } },
        { status: 403 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('content_assets')
      .update({
        content: body.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)
      .select('id, updated_at')
      .single()

    if (updateError) {
      logger.error({ err: updateError }, 'Error updating content asset')
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save asset' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    logger.error({ err: error }, 'Error in content-assets PATCH')
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
