const mockRequireAuth = jest.fn()

jest.mock('@/lib/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

jest.mock('@/lib/session-assets', () => ({
  SESSION_ID_UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  mapAssetRowToContentAsset: (row: Record<string, unknown>) => ({ ...row, mapped: true }),
}))

import { GET } from './route'

function makeRequest(params?: Record<string, string>): Request {
  const url = new URL('http://localhost/api/sessions')
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new Request(url.toString(), {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
  })
}

describe('GET /api/sessions', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when requireAuth throws', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('unauthorized'))
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('unauthorized')
  })

  it('returns 200 with sessions array for authenticated user', async () => {
    const mockData = [
      { id: 'abc', created_at: '2026-01-01', input_type: 'topic', input_data: {}, content_assets: [] },
    ]
    mockRequireAuth.mockResolvedValueOnce({
      user: { id: 'user-1' },
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      },
    })
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.sessions)).toBe(true)
    expect(body.sessions).toHaveLength(1)
  })

  it('returns 400 for invalid UUID id param', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: {} })
    const res = await GET(makeRequest({ id: 'not-a-uuid' }) as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('invalid_session_id')
  })
})
