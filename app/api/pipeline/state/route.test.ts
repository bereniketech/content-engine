const mockRequireAuth = jest.fn()

jest.mock('@/lib/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

jest.mock('@/lib/session-assets', () => ({
  SESSION_ID_UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
}))

import { GET } from './route'

const VALID_UUID = '12345678-1234-1234-1234-123456789abc'

function makeRequest(params?: Record<string, string>): Request {
  const url = new URL('http://localhost/api/pipeline/state')
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new Request(url.toString(), {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
  })
}

describe('GET /api/pipeline/state', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when requireAuth throws', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('unauthorized'))
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(401)
  })

  it('returns 400 when sessionId is missing', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'u1' }, supabase: {} })
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('missing_session_id')
  })

  it('returns 400 for invalid UUID', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'u1' }, supabase: {} })
    const res = await GET(makeRequest({ sessionId: 'not-a-uuid' }) as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('invalid_session_id')
  })

  it('returns 404 when session not found', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'u1' }, supabase: mockSupabase })
    const res = await GET(makeRequest({ sessionId: VALID_UUID }) as never)
    expect(res.status).toBe(404)
  })

  it('returns 200 with step map when session has assets', async () => {
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'sessions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: VALID_UUID }, error: null }),
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({
                data: [{ id: 'asset-1', asset_type: 'dd_assess' }],
                error: null,
              }),
            }),
          }),
        }
      },
    }
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'u1' }, supabase: mockSupabase })
    const res = await GET(makeRequest({ sessionId: VALID_UUID }) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.steps.assess).toEqual({ status: 'complete', assetId: 'asset-1' })
  })
})
