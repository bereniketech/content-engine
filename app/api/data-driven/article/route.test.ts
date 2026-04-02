const mockStreamMessage = jest.fn()
const mockRequireAuth = jest.fn()
const mockParsePdf = jest.fn()
const mockGetDataDrivenArticlePrompt = jest.fn()
const mockResolveSessionId = jest.fn()
const mockMapAssetRowToContentAsset = jest.fn()

jest.mock('@/lib/ai', () => ({
  streamMessage: (...args: unknown[]) => mockStreamMessage(...args),
}))

jest.mock('@/lib/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

jest.mock('@/lib/pdf-parse', () => ({
  parsePdf: (...args: unknown[]) => mockParsePdf(...args),
}))

jest.mock('@/lib/prompts/data-driven-article', () => ({
  getDataDrivenArticlePrompt: (...args: unknown[]) => mockGetDataDrivenArticlePrompt(...args),
}))

jest.mock('@/lib/session-assets', () => ({
  resolveSessionId: (...args: unknown[]) => mockResolveSessionId(...args),
  mapAssetRowToContentAsset: (...args: unknown[]) => mockMapAssetRowToContentAsset(...args),
}))

import { POST } from './route'

interface SupabaseInsertResult {
  data: Record<string, unknown> | null
  error: { message: string } | null
}

function createJsonRequest(body: Record<string, unknown> | string): Request {
  return new Request('http://localhost/api/data-driven/article', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function createMultipartRequest(formData: FormData): Request {
  return new Request('http://localhost/api/data-driven/article', {
    method: 'POST',
    body: formData,
  })
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function parseSseEvents(body: string): Array<Record<string, unknown>> {
  return body
    .split('\n\n')
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame) => {
      const payload = frame
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6))
        .join('')

      return JSON.parse(payload) as Record<string, unknown>
    })
}

function createChunkStream(chunks: string[]): AsyncGenerator<string> {
  async function* generator(): AsyncGenerator<string> {
    for (const chunk of chunks) {
      yield chunk
    }
  }

  return generator()
}

function createSupabaseMock(result: SupabaseInsertResult) {
  const single = jest.fn().mockResolvedValue(result)
  const select = jest.fn().mockReturnValue({ single })
  const insert = jest.fn().mockReturnValue({ select })
  const from = jest.fn().mockReturnValue({ insert })

  return {
    client: { from },
    from,
    insert,
    select,
    single,
  }
}

describe('POST /api/data-driven/article', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMapAssetRowToContentAsset.mockImplementation((row: Record<string, unknown>) => ({
      id: row.id,
      assetType: row.asset_type,
      content: row.content,
      version: row.version,
      createdAt: row.created_at,
    }))
  })

  it('returns 401 when authentication fails', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('Authentication required'))

    const response = await POST(createJsonRequest({ sourceText: 'Source data' }) as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' },
    })
  })

  it('returns 400 for invalid JSON payloads', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })

    const response = await POST(createJsonRequest('{invalid-json') as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'invalid_json', message: 'Invalid JSON in request body' },
    })
  })

  it('returns 400 when no article inputs are provided', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })

    const response = await POST(createJsonRequest({}) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: [
          {
            field: 'sourceText',
            message: 'Provide sourceText, researchData, or a PDF file upload',
          },
        ],
      },
    })
  })

  it('returns 404 when the provided session does not exist for the user', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockRejectedValueOnce(new Error('Session not found'))

    const response = await POST(
      createJsonRequest({ sourceText: 'Source data', sessionId: 'missing-session' }) as never
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'session_not_found', message: 'Session not found' },
    })
  })

  it('returns 400 with a specific message when PDF parsing fails', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    const formData = new FormData()
    formData.append('file', new File(['pdf-data'], 'source.pdf', { type: 'application/pdf' }))

    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockParsePdf.mockRejectedValueOnce(
      new Error('This PDF appears to contain only images. Please paste the text content directly.')
    )

    const response = await POST(createMultipartRequest(formData) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'invalid_pdf',
        message: 'This PDF appears to contain only images. Please paste the text content directly.',
      },
    })
  })

  it('streams SSE chunks and saves the completed article for JSON input', async () => {
    const savedRow = {
      id: 'asset-1',
      asset_type: 'dd_article',
      content: {},
      version: 1,
      created_at: '2026-04-02T12:00:00.000Z',
    }
    const supabase = createSupabaseMock({ data: savedRow, error: null })
    const chunks = ['# Thesis\n\nAlpha beta', ' gamma delta']
    const markdown = chunks.join('')

    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-1')
    mockGetDataDrivenArticlePrompt.mockReturnValueOnce('prompt-body')
    mockStreamMessage.mockReturnValueOnce(createChunkStream(chunks))

    const response = await POST(
      createJsonRequest({
        sourceText: 'Primary source',
        researchData: { finding: 'External evidence' },
        sessionId: 'session-1',
      }) as never
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    expect(mockResolveSessionId).toHaveBeenCalledWith({
      supabase: supabase.client,
      userId: 'user-1',
      providedSessionId: 'session-1',
      fallbackInputType: 'data-driven',
      fallbackInputData: {
        sourceText: 'Primary source',
        researchData: '{"finding":"External evidence"}',
      },
    })
    expect(mockGetDataDrivenArticlePrompt).toHaveBeenCalledWith(
      'Primary source',
      '{"finding":"External evidence"}'
    )
    expect(mockStreamMessage).toHaveBeenCalledWith({
      maxTokens: 8000,
      messages: [{ role: 'user', content: 'prompt-body' }],
    })

    const body = await response.text()
    const events = parseSseEvents(body)
    const finalEvent = events.at(-1)

    expect(body).toContain('data: {"text":"# Thesis\\n\\nAlpha beta"}')
    expect(body).toContain('data: {"text":" gamma delta"}')
    expect(finalEvent).toEqual({
      done: true,
      wordCount: countWords(markdown),
      asset: {
        id: 'asset-1',
        assetType: 'dd_article',
        content: {},
        version: 1,
        createdAt: '2026-04-02T12:00:00.000Z',
      },
    })
    expect(supabase.from).toHaveBeenCalledWith('content_assets')
    expect(supabase.insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      asset_type: 'dd_article',
      content: {
        markdown,
        wordCount: countWords(markdown),
      },
    })
  })

  it('uses parsed PDF text as source input for multipart uploads', async () => {
    const savedRow = {
      id: 'asset-2',
      asset_type: 'dd_article',
      content: {},
      version: 1,
      created_at: '2026-04-02T12:05:00.000Z',
    }
    const supabase = createSupabaseMock({ data: savedRow, error: null })
    const formData = new FormData()
    const parsedSourceText = 'PDF-derived source text'

    formData.append('file', new File(['pdf-data'], 'source.pdf', { type: 'application/pdf' }))
    formData.append('researchData', 'Secondary research')

    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockParsePdf.mockResolvedValueOnce({
      text: parsedSourceText,
      pageCount: 2,
      wasTruncated: true,
    })
    mockResolveSessionId.mockResolvedValueOnce('session-2')
    mockGetDataDrivenArticlePrompt.mockReturnValueOnce('prompt-body')
    mockStreamMessage.mockReturnValueOnce(createChunkStream(['# Article']))

    const response = await POST(createMultipartRequest(formData) as never)
    const events = parseSseEvents(await response.text())

    expect(response.status).toBe(200)
    expect(mockParsePdf).toHaveBeenCalledTimes(1)
    expect(mockGetDataDrivenArticlePrompt).toHaveBeenCalledWith(
      `${parsedSourceText}\n\n[Note: PDF text was truncated due to length limits.]`,
      'Secondary research'
    )
    expect(events.at(-1)).toEqual({
      done: true,
      wordCount: 2,
      asset: {
        id: 'asset-2',
        assetType: 'dd_article',
        content: {},
        version: 1,
        createdAt: '2026-04-02T12:05:00.000Z',
      },
    })
  })
})