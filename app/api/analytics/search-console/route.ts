import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { fetchSearchConsoleData } from '@/lib/analytics/search-console'
import { ConfigError } from '@/lib/publish/secrets'

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
    const data = await fetchSearchConsoleData(user.id, supabase, forceRefresh)
    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('analytics/search-console error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
