import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runDeltaForUser } from '@/lib/analytics/delta'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    verifyCronSecret(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message === 'Unauthorized' ? 401 : 500
    const code = status === 401 ? 'unauthorized' : 'config_error'
    const responseMessage = status === 401 ? 'Invalid cron secret' : 'Cron authentication unavailable'
    logger.error({ err: message }, 'analytics-delta cron auth error')
    return NextResponse.json(
      { error: { code, message: responseMessage } },
      { status }
    )
  }

  let supabase
  try {
    supabase = getServiceRoleClient()
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'analytics-delta service role error')
    return NextResponse.json(
      { error: { code: 'config_error', message: 'Service role client unavailable' } },
      { status: 500 }
    )
  }

  const { data: userRows, error: fetchError } = await supabase
    .from('analytics_snapshots')
    .select('user_id')
    .eq('source', 'search_console')

  if (fetchError) {
    logger.error({ err: fetchError.message }, 'analytics-delta: failed to fetch user ids')
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
      logger.error({ userId, err: err instanceof Error ? err.message : String(err) }, 'analytics-delta: error for user')
    }
  }

  return NextResponse.json({ data: { usersProcessed, triggersCreated } }, { status: 200 })
}
