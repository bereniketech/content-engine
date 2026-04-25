import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, SESSION_ID_UUID_REGEX } from '@/lib/session-assets'

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 },
    )
  }

  const { user, supabase } = auth
  const { searchParams } = new URL(request.url)
  const idParam = searchParams.get('id')

  if (idParam !== null && !SESSION_ID_UUID_REGEX.test(idParam)) {
    return NextResponse.json(
      { error: { code: 'invalid_session_id', message: 'id must be a valid UUID' } },
      { status: 400 },
    )
  }

  try {
    let query = supabase
      .from('sessions')
      .select(`
        id,
        created_at,
        input_type,
        input_data,
        content_assets (
          id,
          session_id,
          asset_type,
          content,
          version,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (idParam !== null) {
      query = query.eq('id', idParam)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'internal', message: error.message } },
        { status: 500 },
      )
    }

    const sessions = (data ?? []).map((row) => ({
      id: row.id as string,
      created_at: row.created_at as string,
      input_type: row.input_type as string,
      input_data: row.input_data,
      assets: ((row.content_assets ?? []) as Parameters<typeof mapAssetRowToContentAsset>[0][]).map(
        mapAssetRowToContentAsset,
      ),
    }))

    return NextResponse.json({ sessions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: 'internal', message } },
      { status: 500 },
    )
  }
}
