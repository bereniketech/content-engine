import { detectRankingDrops, insertRefreshTrigger, runDeltaForUser } from '../delta'

function makeSnapshot(queries: Array<{ query: string; position: number }>) {
  return {
    data: {
      topQueries: queries.map(q => ({ ...q, clicks: 10, impressions: 100 })),
      cachedAt: new Date().toISOString(),
    },
    fetched_at: new Date().toISOString(),
  }
}

describe('detectRankingDrops', () => {
  it('detects drop strictly > 5 positions', () => {
    const old = makeSnapshot([{ query: 'ai content', position: 3 }])
    const newer = makeSnapshot([{ query: 'ai content', position: 10 }])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(1)
    expect(drops[0]).toEqual({ query: 'ai content', oldRank: 3, newRank: 10 })
  })

  it('does NOT detect drop of exactly 5 positions (threshold is strict >5)', () => {
    const old = makeSnapshot([{ query: 'seo tool', position: 2 }])
    const newer = makeSnapshot([{ query: 'seo tool', position: 7 }])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(0)
  })

  it('does NOT detect improvement (position decreasing)', () => {
    const old = makeSnapshot([{ query: 'test', position: 15 }])
    const newer = makeSnapshot([{ query: 'test', position: 1 }])
    expect(detectRankingDrops(old, newer)).toHaveLength(0)
  })

  it('ignores queries only in new snapshot (no old baseline)', () => {
    const old = makeSnapshot([])
    const newer = makeSnapshot([{ query: 'new query', position: 20 }])
    expect(detectRankingDrops(old, newer)).toHaveLength(0)
  })

  it('handles multiple queries with mixed outcomes', () => {
    const old = makeSnapshot([
      { query: 'query-a', position: 1 },
      { query: 'query-b', position: 5 },
      { query: 'query-c', position: 3 },
    ])
    const newer = makeSnapshot([
      { query: 'query-a', position: 8 },
      { query: 'query-b', position: 6 },
      { query: 'query-c', position: 1 },
    ])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(1)
    expect(drops[0].query).toBe('query-a')
  })
})

describe('insertRefreshTrigger', () => {
  it('returns true on successful insert', async () => {
    const supabase = {
      from: () => ({ insert: () => Promise.resolve({ error: null }) }),
    } as any
    const result = await insertRefreshTrigger(supabase, {
      userId: 'u1', sessionId: null, query: 'test query', oldRank: 3, newRank: 12,
    })
    expect(result).toBe(true)
  })

  it('returns false on unique constraint violation (error code 23505)', async () => {
    const supabase = {
      from: () => ({ insert: () => Promise.resolve({ error: { code: '23505', message: 'unique constraint' } }) }),
    } as any
    const result = await insertRefreshTrigger(supabase, {
      userId: 'u1', sessionId: null, query: 'duplicate', oldRank: 3, newRank: 12,
    })
    expect(result).toBe(false)
  })

  it('throws on non-unique DB errors', async () => {
    const supabase = {
      from: () => ({ insert: () => Promise.resolve({ error: { code: '42501', message: 'permission denied' } }) }),
    } as any
    await expect(insertRefreshTrigger(supabase, {
      userId: 'u1', sessionId: null, query: 'q', oldRank: 1, newRank: 10,
    })).rejects.toThrow('Failed to insert refresh trigger')
  })
})

describe('runDeltaForUser', () => {
  it('returns 0 when fewer than 2 snapshots exist', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [{ data: {}, fetched_at: new Date().toISOString() }], error: null }),
              }),
            }),
          }),
        }),
      }),
    } as any
    const count = await runDeltaForUser(supabase, 'user-1')
    expect(count).toBe(0)
  })

  it('returns 0 when no drops detected', async () => {
    const now = new Date().toISOString()
    const snapshot1 = { data: { topQueries: [{ query: 'q', position: 3, clicks: 10, impressions: 100 }] }, fetched_at: now }
    const snapshot2 = { data: { topQueries: [{ query: 'q', position: 4, clicks: 9, impressions: 90 }] }, fetched_at: now }

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [snapshot1, snapshot2], error: null }),
              }),
            }),
          }),
        }),
        insert: () => Promise.resolve({ error: null }),
      }),
    } as any
    const count = await runDeltaForUser(supabase, 'user-1')
    expect(count).toBe(0)
  })
})
