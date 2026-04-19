import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runDeltaForUser } from '@/lib/analytics/delta'

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Invalid cron secret' } },
      { status: 401 }
    )
  }

  const supabase = getServiceRoleClient()

  const { data: userRows, error: fetchError } = await supabase
    .from('analytics_snapshots')
    .select('user_id')
    .eq('source', 'search_console')

  if (fetchError) {
    console.error('analytics-delta: failed to fetch user ids', { error: fetchError.message })
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to fetch user IDs' } },
      { status: 500 }
    )
  }

  if (!userRows || userRows.length === 0) {
    return NextResponse.json({ data: { usersProcessed: 0, triggersCreated: 0 } }, { status: 200 })
  }

  const uniqueUserIds = [...new Set((userRows as Array<{ user_id: string }>).map(r => r.user_id))]

  let usersProcessed = 0
  let triggersCreated = 0

  for (const userId of uniqueUserIds) {
    try {
      const count = await runDeltaForUser(supabase, userId)
      triggersCreated += count
      usersProcessed++
    } catch (err) {
      console.error('analytics-delta: error for user', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ data: { usersProcessed, triggersCreated } }, { status: 200 })
}
