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
  return new Request('http://localhost/api/data-driven/threads-campaign', {
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
  campaignName: 'AI in Practice Threads Campaign',
  posts: [
    {
      postNumber: 1,
      phase: 'hook',
      content: 'Most teams are using AI like a toy, not a system. That is the real productivity gap. Agree or disagree?',
      purpose: 'Pattern interrupt that opens a conversation',
      scheduleSuggestion: 'Day 1 - 9am',
      hashtags: ['AI', 'Productivity'],
      hasLink: false,
    },
    {
      postNumber: 2,
      phase: 'hook',
      content: 'Unpopular take: the best AI workflow is usually boring, repeatable, and documented.',
      purpose: 'Provocative take to trigger replies',
      scheduleSuggestion: 'Day 1 - 1pm',
      hashtags: ['Workflows'],
      hasLink: false,
    },
    {
      postNumber: 3,
      phase: 'hook',
      content: 'If your AI stack saves time but increases confusion, it is not a win. What metric are you tracking?',
      purpose: 'Invite perspective-sharing in comments',
      scheduleSuggestion: 'Day 2 - 9am',
      hashtags: [],
      hasLink: false,
    },
    {
      postNumber: 4,
      phase: 'conversation',
      content: 'In our dataset, teams that defined one clear “AI operating cadence” saw fewer bottlenecks in 30 days.',
      purpose: 'Ground the thread in evidence',
      scheduleSuggestion: 'Day 2 - 2pm',
      hashtags: ['AIOps'],
      hasLink: false,
    },
    {
      postNumber: 5,
      phase: 'conversation',
      content: 'The shift is simple: move from prompt tricks to process design. One survives scale, one does not.',
      purpose: 'Clarify strategic difference',
      scheduleSuggestion: 'Day 3 - 9am',
      hashtags: [],
      hasLink: false,
    },
    {
      postNumber: 6,
      phase: 'conversation',
      content: 'Try this: define trigger, context, output format, and review owner for every recurring AI task.',
      purpose: 'Provide practical implementation guidance',
      scheduleSuggestion: 'Day 3 - 1pm',
      hashtags: ['Operations'],
      hasLink: false,
    },
    {
      postNumber: 7,
      phase: 'conversation',
      content: 'Where does your current setup break first: quality, consistency, or accountability?',
      purpose: 'Drive quote-posts and comments',
      scheduleSuggestion: 'Day 4 - 9am',
      hashtags: [],
      hasLink: false,
    },
    {
      postNumber: 8,
      phase: 'conversion',
      content: 'We mapped the exact framework behind these outcomes. Save this thread if you want the full breakdown next.',
      purpose: 'Transition engagement into intent',
      scheduleSuggestion: 'Day 4 - 2pm',
      hashtags: ['ContentStrategy'],
      hasLink: false,
    },
    {
      postNumber: 9,
      phase: 'conversion',
      content: 'If helpful, I can share the full article with the model, template, and rollout timeline in one place.',
      purpose: 'Soft CTA to request deeper asset',
      scheduleSuggestion: 'Day 5 - 9am',
      hashtags: [],
      hasLink: false,
    },
    {
      postNumber: 10,
      phase: 'conversion',
      content: 'Full write-up is live with the framework and examples: [link]. Curious what part you want unpacked next?',
      purpose: 'Final conversion CTA with optional link',
      scheduleSuggestion: 'Day 5 - 1pm',
      hashtags: ['AI'],
      hasLink: true,
    },
  ],
  threadVariant: [
    '1/ Most teams are using AI like a toy, not a system. That is the hidden productivity gap.',
    '2/ Unpopular take: boring, repeatable AI workflows beat flashy prompt hacks every time.',
    '3/ If speed goes up but confusion goes up too, your process is broken.',
    '4/ Teams with one clear AI operating cadence reduce bottlenecks quickly.',
    '5/ Move from prompt tricks to process design. That is what scales.',
    '6/ Define trigger, context, output format, and review owner for recurring tasks.',
    '7/ Where does your setup fail first: quality, consistency, or accountability?',
    '8/ Save this thread if you want the full breakdown and template.',
    '9/ I can share the full article and rollout model if that helps.',
    '10/ Full write-up is live: [link]. What should we unpack next?',
  ],
}

describe('POST /api/data-driven/threads-campaign', () => {
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

  it('returns 201 and saves one dd_threads_campaign asset on success', async () => {
    const savedRow = {
      id: 'asset-threads-1',
      session_id: 'session-1',
      asset_type: 'dd_threads_campaign',
      content: {
        campaignName: VALID_CAMPAIGN_OUTPUT.campaignName,
        posts: VALID_CAMPAIGN_OUTPUT.posts,
        threadVariant: VALID_CAMPAIGN_OUTPUT.threadVariant,
      },
      version: 1,
      created_at: '2026-04-03T12:00:00.000Z',
    }

    const supabase = createSupabaseMock({ data: [savedRow], error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-1')
    mockCreateMessage.mockResolvedValueOnce(JSON.stringify(VALID_CAMPAIGN_OUTPUT))

    const response = await POST(
      createJsonRequest({
        article: '# Source article about AI workflows',
        seoGeo: { seo: { title: 'AI Workflow Playbook' }, geo: { sourceAttribution: 'Research source' } },
        tone: 'Conversational, practical, and bold.',
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
        id: 'asset-threads-1',
        sessionId: 'session-1',
        assetType: 'dd_threads_campaign',
        content: {
          campaignName: VALID_CAMPAIGN_OUTPUT.campaignName,
          posts: VALID_CAMPAIGN_OUTPUT.posts,
          threadVariant: VALID_CAMPAIGN_OUTPUT.threadVariant,
        },
        version: 1,
        createdAt: '2026-04-03T12:00:00.000Z',
      },
    })
  })

  it('returns 500 when model output is not a valid 10-post threads campaign', async () => {
    const supabase = createSupabaseMock({ data: null, error: null })
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: supabase.client })
    mockResolveSessionId.mockResolvedValueOnce('session-1')
    mockCreateMessage.mockResolvedValueOnce(
      JSON.stringify({ campaignName: 'Bad Output', posts: [{ postNumber: 1 }], threadVariant: ['only one'] })
    )

    const response = await POST(
      createJsonRequest({
        article: '# Source article about AI workflows',
        seoGeo: { seo: { title: 'AI Workflow Playbook' }, geo: { sourceAttribution: 'Research source' } },
        tone: 'Conversational, practical, and bold.',
        sessionId: VALID_SESSION_ID,
      }) as never
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'threads_campaign_error', message: 'Failed to generate Threads campaign' },
    })
  })
})
