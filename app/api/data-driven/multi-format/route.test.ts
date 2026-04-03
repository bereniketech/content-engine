const mockCreateMessage = jest.fn()
const mockRequireAuth = jest.fn()
const mockResolveSessionId = jest.fn()

jest.mock('@/lib/ai', () => ({
  createMessage: (...args: unknown[]) => mockCreateMessage(...args),
}))

jest.mock('@/lib/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

jest.mock('@/lib/session-assets', () => ({
  resolveSessionId: (...args: unknown[]) => mockResolveSessionId(...args),
  mapAssetRowToContentAsset: (row: {
    id: string
    asset_type: string
    content: Record<string, unknown>
    version: number
    created_at: string
  }) => ({
    id: row.id,
    assetType: row.asset_type,
    content: row.content,
    version: row.version,
    createdAt: row.created_at,
  }),
}))

import { POST } from './route'

interface SupabaseInsertResult {
  data: Array<Record<string, unknown>> | null
  error: { message: string } | null
}

function createJsonRequest(body: Record<string, unknown> | string): Request {
  return new Request('http://localhost/api/data-driven/multi-format', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function createSupabaseMock(result: SupabaseInsertResult) {
  const select = jest.fn().mockResolvedValue(result)
  const insert = jest.fn().mockReturnValue({ select })
  const from = jest.fn().mockReturnValue({ insert })

  return {
    client: { from },
    from,
    insert,
  }
}

describe('POST /api/data-driven/multi-format', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when authentication fails', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('Authentication required'))

    const response = await POST(createJsonRequest({}) as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' },
    })
  })

  it('returns 400 when required fields are missing', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })

    const response = await POST(createJsonRequest({ seoGeo: {}, tone: '', sessionId: '' }) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: [
          { field: 'article', message: 'article is required' },
          { field: 'tone', message: 'tone is required' },
          { field: 'sessionId', message: 'sessionId is required' },
        ],
      },
    })
  })

  it('returns 400 when body is valid JSON but not an object', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })

    const response = await POST(createJsonRequest('null') as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: [{ field: 'body', message: 'Request body must be a JSON object' }],
      },
    })
  })

  it('returns 400 when seoGeo does not match required shape', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })

    const response = await POST(
      createJsonRequest({
        article: '# Article',
        seoGeo: '{"seo":{}}',
        tone: 'Direct and practical.',
        sessionId: '3f2a3c14-9557-422f-8e50-bf51a99f27ca',
      }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: [
          {
            field: 'seoGeo',
            message: 'seoGeo must be a JSON object with seo and geo fields',
          },
        ],
      },
    })
  })

  it('returns 400 when seoGeo has array values for seo/geo', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })

    const response = await POST(
      createJsonRequest({
        article: '# Article',
        seoGeo: { seo: [], geo: [] },
        tone: 'Direct and practical.',
        sessionId: 'bf60f959-7ebd-4138-bec0-2e95bbf8352f',
      }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: [
          {
            field: 'seoGeo',
            message: 'seoGeo must be a JSON object with seo and geo fields',
          },
        ],
      },
    })
  })

  it('returns 201 and saves four assets on success', async () => {
    const aiOutput = {
      blog: '# Blog version',
      linkedin: 'LinkedIn version',
      medium: {
        article: 'Medium article body',
        subtitle: 'Medium subtitle',
      },
      newsletter: {
        subjectLine: 'Subject line',
        previewText: 'Preview text',
        body: 'Newsletter body',
        plainText: 'Newsletter plain text',
      },
    }

    const savedRows = [
      {
        id: 'a-1',
        session_id: 'session-1',
        asset_type: 'dd_blog',
        content: { markdown: '# Blog version', wordCount: 3 },
        version: 1,
        created_at: '2026-04-02T12:00:00.000Z',
      },
      {
        id: 'a-2',
        session_id: 'session-1',
        asset_type: 'dd_linkedin',
        content: { article: 'LinkedIn version' },
        version: 1,
        created_at: '2026-04-02T12:00:01.000Z',
      },
      {
        id: 'a-3',
        session_id: 'session-1',
        asset_type: 'dd_medium',
        content: { article: 'Medium article body', subtitle: 'Medium subtitle' },
        version: 1,
        created_at: '2026-04-02T12:00:02.000Z',
      },
      {
        id: 'a-4',
        session_id: 'session-1',
        asset_type: 'dd_newsletter',
        content: {
          subjectLine: 'Subject line',
          previewText: 'Preview text',
          body: 'Newsletter body',
          plainText: 'Newsletter plain text',
        },
        version: 1,
        created_at: '2026-04-02T12:00:03.000Z',
      },
    ]

    const supabase = createSupabaseMock({ data: savedRows, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-1')
    mockCreateMessage.mockResolvedValueOnce(JSON.stringify(aiOutput))

    const response = await POST(
      createJsonRequest({
        article: '# Source article',
        seoGeo: { seo: { title: 'Title' }, geo: { sourceAttribution: 'Source' } },
        tone: 'Confident and strategic with concise paragraphs.',
        sessionId: 'f41a9625-ddaf-46da-8890-fd1d81a88cdb',
      }) as never
    )

    expect(response.status).toBe(201)
    expect(mockCreateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: 8000,
      })
    )

    await expect(response.json()).resolves.toEqual({
      data: {
        sessionId: 'session-1',
        blog: {
          id: 'a-1',
          assetType: 'dd_blog',
          content: { markdown: '# Blog version', wordCount: 3 },
          version: 1,
          createdAt: '2026-04-02T12:00:00.000Z',
        },
        linkedin: {
          id: 'a-2',
          assetType: 'dd_linkedin',
          content: { article: 'LinkedIn version' },
          version: 1,
          createdAt: '2026-04-02T12:00:01.000Z',
        },
        medium: {
          id: 'a-3',
          assetType: 'dd_medium',
          content: { article: 'Medium article body', subtitle: 'Medium subtitle' },
          version: 1,
          createdAt: '2026-04-02T12:00:02.000Z',
        },
        newsletter: {
          id: 'a-4',
          assetType: 'dd_newsletter',
          content: {
            subjectLine: 'Subject line',
            previewText: 'Preview text',
            body: 'Newsletter body',
            plainText: 'Newsletter plain text',
          },
          version: 1,
          createdAt: '2026-04-02T12:00:03.000Z',
        },
      },
    })

    expect(supabase.from).toHaveBeenCalledWith('content_assets')
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ asset_type: 'dd_blog' }),
        expect.objectContaining({ asset_type: 'dd_linkedin' }),
        expect.objectContaining({ asset_type: 'dd_medium' }),
        expect.objectContaining({ asset_type: 'dd_newsletter' }),
      ])
    )
  })
})
