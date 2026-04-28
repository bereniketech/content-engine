// OWASP checklist: JWT auth required, middleware rate limits, paginated queries, generic errors.
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { computeTrend, estimateTrafficValue } from '@/lib/roi'

const PAGE_SIZE = 25

interface PerformanceRow {
  session_id: string
  clicks: number
  impressions: number
  avg_position: number | null
  measured_at: string
}

interface SessionRow {
  id: string
  input_data: Record<string, unknown> | null
  created_at: string
}

interface BlogAssetRow {
  session_id: string
  content: { title?: string } | null
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const offset = (page - 1) * PAGE_SIZE

    // Fetch paginated sessions for this user
    const { data: sessions, error: sessionsError, count } = await supabase
      .from('sessions')
      .select('id, input_data, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (sessionsError) {
      return NextResponse.json(
        { error: { code: 'query_error', message: 'Failed to fetch sessions' } },
        { status: 500 }
      )
    }

    const sessionRows = (sessions ?? []) as SessionRow[]
    const sessionIds = sessionRows.map((s) => s.id)

    if (sessionIds.length === 0) {
      return NextResponse.json({
        data: [],
        meta: { total: count ?? 0, page, pageSize: PAGE_SIZE },
      })
    }

    // Fetch 28-day performance data for these sessions
    const twentyEightDaysAgo = new Date(Date.now() - 28 * 86_400_000).toISOString()
    const { data: perfRows } = await supabase
      .from('content_performance')
      .select('session_id, clicks, impressions, avg_position, measured_at')
      .in('session_id', sessionIds)
      .gte('measured_at', twentyEightDaysAgo)

    // Fetch blog titles for these sessions
    const { data: blogAssets } = await supabase
      .from('content_assets')
      .select('session_id, content')
      .in('session_id', sessionIds)
      .eq('asset_type', 'blog')

    // Group performance rows by session
    const perfBySession = new Map<string, PerformanceRow[]>()
    for (const row of (perfRows ?? []) as PerformanceRow[]) {
      const existing = perfBySession.get(row.session_id) ?? []
      existing.push(row)
      perfBySession.set(row.session_id, existing)
    }

    // Map titles by session
    const titleBySession = new Map<string, string>()
    for (const asset of (blogAssets ?? []) as BlogAssetRow[]) {
      if (asset.content?.title) {
        titleBySession.set(asset.session_id, asset.content.title)
      }
    }

    const data = sessionRows.map((session) => {
      const rows = perfBySession.get(session.id) ?? []

      if (rows.length === 0) {
        return {
          sessionId: session.id,
          title: titleBySession.get(session.id) ?? null,
          publishedAt: null,
          organicClicks: null,
          impressions: null,
          avgPosition: null,
          trafficValue: null,
          trend: [],
          needsRefresh: false,
        }
      }

      const organicClicks = rows.reduce((sum, r) => sum + r.clicks, 0)
      const impressions = rows.reduce((sum, r) => sum + r.impressions, 0)
      const validPositions = rows.filter((r) => r.avg_position !== null)
      const avgPosition =
        validPositions.length > 0
          ? validPositions.reduce((sum, r) => sum + (r.avg_position ?? 0), 0) / validPositions.length
          : null

      const trend = computeTrend(rows)
      const trafficValue = estimateTrafficValue(organicClicks, avgPosition)
      const needsRefresh = avgPosition !== null && avgPosition > 20

      return {
        sessionId: session.id,
        title: titleBySession.get(session.id) ?? null,
        publishedAt: null,
        organicClicks,
        impressions,
        avgPosition: avgPosition !== null ? Math.round(avgPosition * 100) / 100 : null,
        trafficValue,
        trend,
        needsRefresh,
      }
    })

    return NextResponse.json({
      data,
      meta: { total: count ?? 0, page, pageSize: PAGE_SIZE },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'server_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
