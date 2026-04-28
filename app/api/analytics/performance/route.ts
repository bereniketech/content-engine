import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'

interface PerformanceRow {
  session_id: string
  asset_type: string
  platform?: string
  clicks: number
  impressions: number
  avg_position?: number
  measured_at?: string
}

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { supabase, user } = auth

  let body: { rows: PerformanceRow[] }
  try {
    body = await request.json() as { rows: PerformanceRow[] }
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json' } }, { status: 400 })
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'rows array required' } },
      { status: 400 }
    )
  }

  const sessionIds = [...new Set(body.rows.map((r) => r.session_id))]
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id')
    .in('id', sessionIds)
    .eq('user_id', user.id)

  if (sessionsError) {
    logger.error({ err: sessionsError, userId: user.id }, 'Failed to validate sessions for performance write')
    return NextResponse.json({ error: { code: 'storage_error' } }, { status: 500 })
  }

  const validSessionIds = new Set((sessions ?? []).map((s: { id: string }) => s.id))
  const validRows = body.rows.filter((r) => validSessionIds.has(r.session_id))

  if (validRows.length === 0) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'No valid sessions' } },
      { status: 403 }
    )
  }

  const { error: insertError } = await supabase
    .from('content_performance')
    .insert(
      validRows.map((r) => ({
        session_id: r.session_id,
        asset_type: r.asset_type,
        platform: r.platform ?? null,
        clicks: r.clicks,
        impressions: r.impressions,
        avg_position: r.avg_position ?? null,
        measured_at: r.measured_at ?? new Date().toISOString(),
      }))
    )

  if (insertError) {
    logger.error({ err: insertError, userId: user.id }, 'Failed to insert content_performance rows')
    return NextResponse.json({ error: { code: 'storage_error' } }, { status: 500 })
  }

  logger.info({ userId: user.id, rowCount: validRows.length }, 'Content performance rows written')

  return NextResponse.json({ ok: true, inserted: validRows.length })
}

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { supabase } = auth
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')

  const query = supabase
    .from('content_performance')
    .select('*')
    .order('measured_at', { ascending: false })
    .limit(100)

  if (sessionId) {
    query.eq('session_id', sessionId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: { code: 'storage_error' } }, { status: 500 })
  }

  return NextResponse.json({ data })
}
