import type { SupabaseClient } from '@supabase/supabase-js'

const RANKING_DROP_THRESHOLD = 5

export interface RankingDrop {
  query: string
  oldRank: number
  newRank: number
}

interface SnapshotRow {
  data: {
    topQueries?: Array<{ query: string; position: number; clicks: number; impressions: number }>
    cachedAt?: string
  }
  fetched_at: string
}

export function detectRankingDrops(
  oldSnapshot: SnapshotRow,
  newSnapshot: SnapshotRow,
): RankingDrop[] {
  const oldQueries = oldSnapshot.data.topQueries ?? []
  const newQueries = newSnapshot.data.topQueries ?? []

  const oldPositionMap = new Map<string, number>()
  for (const q of oldQueries) {
    oldPositionMap.set(q.query, q.position)
  }

  const drops: RankingDrop[] = []
  for (const q of newQueries) {
    const oldPos = oldPositionMap.get(q.query)
    if (oldPos !== undefined && q.position - oldPos > RANKING_DROP_THRESHOLD) {
      drops.push({ query: q.query, oldRank: oldPos, newRank: q.position })
    }
  }

  return drops
}

export async function insertRefreshTrigger(
  supabase: SupabaseClient,
  params: {
    userId: string
    sessionId: string | null
    query: string
    oldRank: number
    newRank: number
  },
): Promise<boolean> {
  const { error } = await supabase.from('refresh_triggers').insert({
    user_id: params.userId,
    session_id: params.sessionId,
    query: params.query,
    old_rank: params.oldRank,
    new_rank: params.newRank,
    trigger_reason: 'ranking_drop',
    status: 'pending',
  })

  if (error) {
    if (error.code === '23505') {
      return false
    }
    throw new Error(`Failed to insert refresh trigger: ${error.message}`)
  }

  return true
}

export async function runDeltaForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data: snapshots, error } = await supabase
    .from('analytics_snapshots')
    .select('data, fetched_at')
    .eq('user_id', userId)
    .eq('source', 'search_console')
    .order('fetched_at', { ascending: false })
    .limit(2)

  if (error || !snapshots || snapshots.length < 2) {
    return 0
  }

  const [newSnapshot, oldSnapshot] = snapshots as SnapshotRow[]
  const drops = detectRankingDrops(oldSnapshot, newSnapshot)

  let triggersCreated = 0
  for (const drop of drops) {
    const inserted = await insertRefreshTrigger(supabase, {
      userId,
      sessionId: null,
      query: drop.query,
      oldRank: drop.oldRank,
      newRank: drop.newRank,
    })
    if (inserted) triggersCreated++
  }

  return triggersCreated
}
