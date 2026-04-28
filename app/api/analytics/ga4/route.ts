import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { fetchGA4Data } from '@/lib/analytics/ga4'
import { ConfigError } from '@/lib/publish/secrets'
import { logger } from '@/lib/logger'

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
  const { user, supabase } = auth

  const forceRefresh = request.nextUrl.searchParams.get('forceRefresh') === 'true'

  try {
    const data = await fetchGA4Data(user.id, supabase, forceRefresh)
    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'analytics/ga4 error')
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
