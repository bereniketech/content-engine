import { fetchGA4Data } from '../ga4'

jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({ getClient: jest.fn() })),
    },
    analyticsdata: jest.fn().mockReturnValue({
      properties: {
        runReport: jest.fn().mockResolvedValue({
          data: {
            rows: [
              {
                dimensionValues: [{ value: '/blog/test-post' }],
                metricValues: [{ value: '100' }, { value: '250' }],
              },
            ],
            totals: [{ metricValues: [{ value: '1200' }, { value: '3400' }] }],
          },
        }),
      },
    }),
  },
}))

beforeEach(() => {
  process.env.GA4_PROPERTY_ID = '123456789'
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    client_email: 'sa@project.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----\n',
  })
})

function makeFreshSupabase() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  } as any
}

function makeCachedSupabase(cachedData: unknown, fetchedAt: string) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({
                data: [{ data: cachedData, fetched_at: fetchedAt }],
                error: null,
              }),
            }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  } as any
}

describe('fetchGA4Data', () => {
  it('returns data from GA4 API when no cache exists', async () => {
    const supabase = makeFreshSupabase()
    const result = await fetchGA4Data('user-1', supabase, false)

    expect(result.fromCache).toBe(false)
    expect(result.sessions).toBe(1200)
    expect(result.pageViews).toBe(3400)
    expect(result.topPages).toHaveLength(1)
    expect(result.topPages[0].path).toBe('/blog/test-post')
  })

  it('returns cached data when snapshot is fresh (< 24h)', async () => {
    const { google } = require('googleapis')
    const cachedData = {
      period: 'last_30_days',
      sessions: 999,
      pageViews: 1999,
      topPages: [{ path: '/cached', views: 100 }],
      cachedAt: new Date().toISOString(),
    }
    const supabase = makeCachedSupabase(cachedData, new Date().toISOString())
    const result = await fetchGA4Data('user-1', supabase, false)

    expect(result.fromCache).toBe(true)
    expect(result.sessions).toBe(999)
    expect(google.analyticsdata().properties.runReport).not.toHaveBeenCalled()
  })

  it('bypasses cache when forceRefresh=true', async () => {
    const { google } = require('googleapis')
    google.analyticsdata().properties.runReport.mockClear()

    const cachedData = { sessions: 999, pageViews: 1999, topPages: [], cachedAt: new Date().toISOString() }
    const supabase = makeCachedSupabase(cachedData, new Date().toISOString())
    const result = await fetchGA4Data('user-1', supabase, true)

    expect(result.fromCache).toBe(false)
    expect(google.analyticsdata().properties.runReport).toHaveBeenCalledTimes(1)
  })

  it('fetches fresh data when cache is stale (> 24h)', async () => {
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const staleData = { sessions: 50, pageViews: 100, topPages: [], cachedAt: staleDate }
    const supabase = makeCachedSupabase(staleData, staleDate)
    const result = await fetchGA4Data('user-1', supabase, false)

    expect(result.fromCache).toBe(false)
    expect(result.sessions).toBe(1200)
  })
})
