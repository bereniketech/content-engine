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
}))

import { POST } from './route'

interface SupabaseInsertResult {
  data: Record<string, unknown> | null
  error: { message: string } | null
}

function createJsonRequest(body: Record<string, unknown> | string): Request {
  return new Request('http://localhost/api/data-driven/seo-geo', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
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
  }
}

describe('POST /api/data-driven/seo-geo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when authentication fails', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('Authentication required'))

    const response = await POST(createJsonRequest({ article: '# Test', sessionId: 's-1' }) as never)

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

  it('returns 400 when required fields are missing', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })

    const response = await POST(createJsonRequest({ article: '' }) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: [
          { field: 'article', message: 'article is required' },
          { field: 'sessionId', message: 'sessionId is required' },
        ],
      },
    })
  })

  it('returns 400 when sessionId is not a valid UUID', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })

    const response = await POST(
      createJsonRequest({ article: '# Article', sessionId: 'missing-session' }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: [{ field: 'sessionId', message: 'sessionId must be a valid UUID' }],
      },
    })
  })

  it('returns 404 when provided session does not exist', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockRejectedValueOnce(new Error('Session not found'))

    const response = await POST(
      createJsonRequest({ article: '# Article', sessionId: '1b79ad6f-7605-4026-bf7e-3f7528e3569d' }) as never
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'session_not_found', message: 'Session not found' },
    })
  })

  it('returns 500 when session resolution fails for storage reasons', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockRejectedValueOnce(new Error('db timeout'))

    const response = await POST(
      createJsonRequest({ article: '# Article', sessionId: '5b8572a1-0f05-41d0-84e0-c11ab262bc47' }) as never
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'storage_error', message: 'Failed to resolve session' },
    })
  })

  it('returns 400 when article exceeds max length', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    const oversizedArticle = 'a'.repeat(120001)

    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })

    const response = await POST(
      createJsonRequest({ article: oversizedArticle, sessionId: '72d34c43-9448-4898-9f84-e147c2feb568' }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: [{ field: 'article', message: 'article must be 120000 characters or fewer' }],
      },
    })
  })

  it('returns 500 when AI response cannot be normalized', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-1')
    mockCreateMessage.mockResolvedValueOnce('{"seo":{},"geo":{}}')

    const response = await POST(
      createJsonRequest({ article: '# Article content', sessionId: '6d19668c-efec-44ce-88d6-3e4f0f56ecf8' }) as never
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'seo_geo_error', message: 'Failed to generate SEO+GEO output' },
    })
  })

  it('returns 500 when AI generation request fails', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-1')
    mockCreateMessage.mockRejectedValueOnce(new Error('provider timeout'))

    const response = await POST(
      createJsonRequest({ article: '# Article content', sessionId: 'e6940134-dd53-4654-b2d1-d8de148f88cf' }) as never
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'seo_geo_error', message: 'Failed to generate SEO+GEO output' },
    })
  })

  it('accepts fenced JSON responses from the AI provider', async () => {
    const seoGeoResult = {
      seo: {
        title: 'Data pipeline benchmark guide',
        metaDescription: 'Compare data pipelines with clear benchmarks and practical guidance.',
        slug: 'data-pipeline-benchmark-guide',
        primaryKeyword: 'data pipeline benchmark',
        secondaryKeywords: [
          'pipeline performance',
          'etl benchmark',
          'data throughput',
          'data reliability',
          'pipeline optimization',
        ],
        headingStructure: {
          h2: ['Benchmark goals', 'Test setup', 'Results and tradeoffs'],
          h3: ['Latency', 'Throughput', 'Reliability'],
        },
        faqSchema: [
          { question: 'How to benchmark?', answer: 'Define KPIs and baseline data.' },
          { question: 'Which metrics matter most?', answer: 'Latency and throughput first.' },
          { question: 'How often to run tests?', answer: 'Run after major changes.' },
        ],
        seoScore: 84,
      },
      geo: {
        citationOptimization: ['A 20% latency reduction was observed in controlled tests.'],
        entityMarking: [{ entity: 'Apache Kafka', description: 'Streaming platform for ingestion.' }],
        conciseAnswers: [{ question: 'What is ETL?', answer: 'ETL moves and transforms data.' }],
        structuredClaims: ['Kafka handles high-throughput ingestion with partitioning.'],
        sourceAttribution: 'Source: Internal benchmark suite, 2026.',
      },
    }

    const savedRow = {
      id: 'asset-fenced',
      session_id: 'session-fenced',
      asset_type: 'dd_seo_geo',
      content: seoGeoResult,
      version: 1,
      created_at: '2026-04-02T12:01:00.000Z',
    }

    const supabase = createSupabaseMock({ data: savedRow, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-fenced')
    mockCreateMessage.mockResolvedValueOnce(
      '```json\n' + JSON.stringify(seoGeoResult) + '\n```'
    )

    const response = await POST(
      createJsonRequest({ article: '# Article content', sessionId: '9fdf350e-e8ca-4312-a5aa-e82bc829247f' }) as never
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 'asset-fenced',
        sessionId: 'session-fenced',
        assetType: 'dd_seo_geo',
        content: seoGeoResult,
        version: 1,
        createdAt: '2026-04-02T12:01:00.000Z',
      },
    })
  })

  it('returns 500 when asset save fails', async () => {
    const seoGeoResult = {
      seo: {
        title: 'Data pipeline benchmark guide',
        metaDescription: 'Compare data pipelines with clear benchmarks and practical guidance.',
        slug: 'data-pipeline-benchmark-guide',
        primaryKeyword: 'data pipeline benchmark',
        secondaryKeywords: [
          'pipeline performance',
          'etl benchmark',
          'data throughput',
          'data reliability',
          'pipeline optimization',
        ],
        headingStructure: {
          h2: ['Benchmark goals', 'Test setup', 'Results and tradeoffs'],
          h3: ['Latency', 'Throughput', 'Reliability'],
        },
        faqSchema: [
          { question: 'How to benchmark?', answer: 'Define KPIs and baseline data.' },
          { question: 'Which metrics matter most?', answer: 'Latency and throughput first.' },
          { question: 'How often to run tests?', answer: 'Run after major changes.' },
        ],
        seoScore: 84,
      },
      geo: {
        citationOptimization: ['A 20% latency reduction was observed in controlled tests.'],
        entityMarking: [{ entity: 'Apache Kafka', description: 'Streaming platform for ingestion.' }],
        conciseAnswers: [{ question: 'What is ETL?', answer: 'ETL moves and transforms data.' }],
        structuredClaims: ['Kafka handles high-throughput ingestion with partitioning.'],
        sourceAttribution: 'Source: Internal benchmark suite, 2026.',
      },
    }

    const supabase = createSupabaseMock({ data: null, error: { message: 'insert failed' } })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-1')
    mockCreateMessage.mockResolvedValueOnce(JSON.stringify(seoGeoResult))

    const response = await POST(
      createJsonRequest({ article: '# Article content', sessionId: '7b8f8a20-f9e8-45ab-bf39-a14f6df88696' }) as never
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'storage_error', message: 'Failed to save SEO+GEO asset' },
    })
  })

  it('saves dd_seo_geo asset and returns normalized content', async () => {
    const seoGeoResult = {
      seo: {
        title: 'Data pipeline benchmark guide',
        metaDescription: 'Compare data pipelines with clear benchmarks and practical guidance.',
        slug: 'data-pipeline-benchmark-guide',
        primaryKeyword: 'data pipeline benchmark',
        secondaryKeywords: [
          'pipeline performance',
          'etl benchmark',
          'data throughput',
          'data reliability',
          'pipeline optimization',
        ],
        headingStructure: {
          h2: ['Benchmark goals', 'Test setup', 'Results and tradeoffs'],
          h3: ['Latency', 'Throughput', 'Reliability'],
        },
        faqSchema: [
          { question: 'How to benchmark?', answer: 'Define KPIs and baseline data.' },
          { question: 'Which metrics matter most?', answer: 'Latency and throughput first.' },
          { question: 'How often to run tests?', answer: 'Run after major changes.' },
        ],
        seoScore: 84,
      },
      geo: {
        citationOptimization: ['A 20% latency reduction was observed in controlled tests.'],
        entityMarking: [{ entity: 'Apache Kafka', description: 'Streaming platform for ingestion.' }],
        conciseAnswers: [{ question: 'What is ETL?', answer: 'ETL moves and transforms data.' }],
        structuredClaims: ['Kafka handles high-throughput ingestion with partitioning.'],
        sourceAttribution: 'Source: Internal benchmark suite, 2026.',
      },
    }

    const savedRow = {
      id: 'asset-1',
      session_id: 'session-1',
      asset_type: 'dd_seo_geo',
      content: seoGeoResult,
      version: 1,
      created_at: '2026-04-02T12:00:00.000Z',
    }

    const supabase = createSupabaseMock({ data: savedRow, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-1')
    mockCreateMessage.mockResolvedValueOnce(JSON.stringify(seoGeoResult))

    const response = await POST(
      createJsonRequest({ article: '# Article content', sessionId: '8aa00177-ac00-46b0-9f0e-f3034e018ca4' }) as never
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 'asset-1',
        sessionId: 'session-1',
        assetType: 'dd_seo_geo',
        content: seoGeoResult,
        version: 1,
        createdAt: '2026-04-02T12:00:00.000Z',
      },
    })

    expect(mockCreateMessage).toHaveBeenCalledTimes(1)
    expect(supabase.from).toHaveBeenCalledWith('content_assets')
    expect(supabase.insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      asset_type: 'dd_seo_geo',
      content: seoGeoResult,
    })
  })
})
