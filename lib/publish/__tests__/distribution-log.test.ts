import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '../distribution-log'

function makeSupabase(rows: unknown[]) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: rows, error: null }),
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'log-id-123' }, error: null }),
        }),
      }),
    }),
  } as any
}

describe('checkAlreadyPublished', () => {
  it('throws AlreadyPublishedError when published log exists', async () => {
    const supabase = makeSupabase([{ id: 'existing-log' }])
    await expect(checkAlreadyPublished(supabase, 'session-1', 'x'))
      .rejects.toThrow(AlreadyPublishedError)
  })

  it('does not throw when no published log exists', async () => {
    const supabase = makeSupabase([])
    await expect(checkAlreadyPublished(supabase, 'session-1', 'x')).resolves.toBeUndefined()
  })
})

describe('writeDistributionLog', () => {
  it('returns log id on success', async () => {
    const supabase = makeSupabase([])
    const id = await writeDistributionLog({
      supabase,
      sessionId: 'session-1',
      userId: 'user-1',
      platform: 'x',
      status: 'published',
      externalId: 'tweet-123',
    })
    expect(id).toBe('log-id-123')
  })
})
