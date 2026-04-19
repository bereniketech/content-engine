import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

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

  const { data, error } = await supabase
    .from('refresh_triggers')
    .select('id, query, old_rank, new_rank, session_id, status, created_at')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to fetch refresh triggers' } },
      { status: 500 }
    )
  }

  const triggers = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    query: row.query,
    oldRank: row.old_rank,
    newRank: row.new_rank,
    sessionId: row.session_id,
    status: row.status,
    createdAt: row.created_at,
  }))

  return NextResponse.json({ data: triggers }, { status: 200 })
}
