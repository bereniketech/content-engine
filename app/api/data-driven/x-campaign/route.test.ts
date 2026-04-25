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
  SESSION_ID_UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  isRecord: (value: unknown) => typeof value === 'object' && value !== null,
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
  return new Request('http://localhost/api/data-driven/x-campaign', {
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

const VALID_SESSION_ID = 'f41a9625-ddaf-46da-8890-fd1d81a88cdb'

const VALID_CAMPAIGN_OUTPUT = {
  campaignName: 'AI Tools Hype Campaign',
  posts: [
    {
      postNumber: 1,
      phase: 'mystery',
      content: 'Something in AI just changed everything. Few people know yet. 🧵',
      purpose: 'Open with intrigue to drive curiosity',
      scheduleSuggestion: 'Day 1 - 9am',
      hashtags: ['AI', 'FutureOfWork'],
      hasLink: false,
    },
    {
      postNumber: 2,
      phase: 'mystery',
      content: 'What if the tool you ignored last year is now the one everyone fights over?',
      purpose: 'Provocative question to trigger engagement',
      scheduleSuggestion: 'Day 1 - 12pm',
      hashtags: ['AITools', 'Productivity'],
      hasLink: false,
    },
    {
      postNumber: 3,
      phase: 'mystery',
      content: 'Big reveal coming. Stay tuned. The data will surprise you.',
      purpose: 'Tease the reveal to maintain suspense',
      scheduleSuggestion: 'Day 2 - 9am',
      hashtags: ['DataDriven', 'AI'],
      hasLink: false,
    },
    {
      postNumber: 4,
      phase: 'reveal_slow',
      content: 'Here is one stat from our research: 73% of teams using this AI tool cut tasks in half.',
      purpose: 'Introduce a credibility-building statistic',
      scheduleSuggestion: 'Day 2 - 3pm',
      hashtags: ['AI', 'Stats'],
      hasLink: false,
    },
    {
      postNumber: 5,
      phase: 'reveal_slow',
      content: 'The tool is not magic. It is systematic. Here is what makes it different.',
      purpose: 'Build anticipation by hinting at methodology',
      scheduleSuggestion: 'Day 3 - 9am',
      hashtags: ['AITools', 'Workflow'],
      hasLink: false,
    },
    {
      postNumber: 6,
      phase: 'reveal_slow',
      content: 'We analyzed 50 use cases. The results keep pointing to the same pattern.',
      purpose: 'Credibility through research depth',
      scheduleSuggestion: 'Day 3 - 3pm',
      hashtags: ['Research', 'AIInsights'],
      hasLink: false,
    },
    {
      postNumber: 7,
      phase: 'reveal_full',
      content: 'Full breakdown is live. Everything we found about AI tools in 2026. Link below.',
      purpose: 'Direct CTA linking to the full article',
      scheduleSuggestion: 'Day 4 - 9am',
      hashtags: ['AI', 'Article'],
      hasLink: true,
    },
    {
      postNumber: 8,
      phase: 'reveal_full',
      content: 'Top insight from the article: Automation is not the goal. Augmentation is.',
      purpose: 'Share a high-value excerpt to drive clicks',
      scheduleSuggestion: 'Day 4 - 12pm',
      hashtags: ['AIInsights', 'FutureOfWork'],
      hasLink: true,
    },
    {
      postNumber: 9,
      phase: 'reveal_full',
      content: 'If you work in tech, this article is required reading. Here is why.',
      purpose: 'Targeted CTA for the tech audience',
      scheduleSuggestion: 'Day 5 - 9am',
      hashtags: ['TechTrends', 'AI'],
      hasLink: true,
    },
    {
      postNumber: 10,
      phase: 'reveal_full',
      content: 'Missed the thread? Full article covers every insight from our AI tools research.',
      purpose: 'Final campaign recap driving late readers to the article',
      scheduleSuggestion: 'Day 5 - 3pm',
      hashtags: ['AI', 'MustRead'],
      hasLink: true,
    },
  ],
  threadVariant: [
    '1/ Something in AI just changed everything. Here is what the data actually says. 🧵',
    '2/ We analyzed 50 AI tool use cases from 2026. The results keep pointing to one pattern.',
    '3/ 73% of teams using this approach cut tasks in half. Not magic — systematic.',
    '4/ The full breakdown is now live. Every insight, every stat, every use case.',
    '5/ Read the full article here: [link]',
  ],
}

describe('POST /api/data-driven/x-campaign', () => {
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
        tone: 'Direct and bold.',
        sessionId: VALID_SESSION_ID,
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

  it('returns 201 and saves one dd_x_campaign asset on success', async () => {
    const savedRow = {
      id: 'asset-1',
      session_id: 'session-1',
      asset_type: 'dd_x_campaign',
      content: {
        campaignName: VALID_CAMPAIGN_OUTPUT.campaignName,
        posts: VALID_CAMPAIGN_OUTPUT.posts,
        threadVariant: VALID_CAMPAIGN_OUTPUT.threadVariant,
      },
      version: 1,
      created_at: '2026-04-02T12:00:00.000Z',
    }

    const supabase = createSupabaseMock({ data: [savedRow], error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-1')
    mockCreateMessage.mockResolvedValueOnce(JSON.stringify(VALID_CAMPAIGN_OUTPUT))

    const response = await POST(
      createJsonRequest({
        article: '# Source article about AI tools',
        seoGeo: { seo: { title: 'AI Tools 2026' }, geo: { sourceAttribution: 'Research source' } },
        tone: 'Bold, energetic, tech-forward.',
        sessionId: VALID_SESSION_ID,
      }) as never
    )

    expect(response.status).toBe(201)
    expect(mockCreateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: 4000,
      })
    )

    await expect(response.json()).resolves.toEqual({
      data: {
        id: 'asset-1',
        sessionId: 'session-1',
        assetType: 'dd_x_campaign',
        content: {
          campaignName: VALID_CAMPAIGN_OUTPUT.campaignName,
          posts: VALID_CAMPAIGN_OUTPUT.posts,
          threadVariant: VALID_CAMPAIGN_OUTPUT.threadVariant,
        },
        version: 1,
        createdAt: '2026-04-02T12:00:00.000Z',
      },
    })
  })
})
