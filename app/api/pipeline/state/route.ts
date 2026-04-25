import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { SESSION_ID_UUID_REGEX } from '@/lib/session-assets'

const ASSET_TYPE_TO_STEP: Record<string, string> = {
  dd_assess: 'assess',
  dd_research: 'research',
  dd_article: 'article',
  dd_seo_geo: 'seoGeo',
  dd_multi_format: 'distribution',
}

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
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'missing_session_id', message: 'sessionId query parameter is required' } },
      { status: 400 },
    )
  }

  if (!SESSION_ID_UUID_REGEX.test(sessionId)) {
    return NextResponse.json(
      { error: { code: 'invalid_session_id', message: 'sessionId must be a valid UUID' } },
      { status: 400 },
    )
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (sessionError) {
    return NextResponse.json(
      { error: { code: 'internal', message: sessionError.message } },
      { status: 500 },
    )
  }

  if (!session) {
    return NextResponse.json(
      { error: { code: 'session_not_found', message: 'Session not found' } },
      { status: 404 },
    )
  }

  const { data: assets, error: assetsError } = await supabase
    .from('content_assets')
    .select('id, asset_type')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (assetsError) {
    return NextResponse.json(
      { error: { code: 'internal', message: assetsError.message } },
      { status: 500 },
    )
  }

  const steps: Record<string, { status: 'complete'; assetId: string }> = {}

  for (const asset of assets ?? []) {
    const stepKey = ASSET_TYPE_TO_STEP[asset.asset_type as string]
    if (stepKey) {
      steps[stepKey] = { status: 'complete', assetId: asset.id as string }
    }
  }

  return NextResponse.json({ sessionId, steps })
}
