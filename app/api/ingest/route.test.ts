import { POST } from './route'
import { NextRequest } from 'next/server'
import { IngestionError } from '@/lib/ingest/errors'

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-123' },
    supabase: mockSupabase,
  }),
}))

const mockSingle = jest.fn()
const mockSelect = jest.fn(() => ({ single: mockSingle }))
const mockInsert = jest.fn(() => ({ select: mockSelect }))
const mockSupabase = {
  from: jest.fn(() => ({ insert: mockInsert })),
}

jest.mock('@/lib/session-assets', () => ({
  resolveSessionId: jest.fn().mockResolvedValue('sess-ingest-001'),
  mapAssetRowToContentAsset: jest.fn((row: Record<string, unknown>) => ({ id: row.id, ...row })),
}))

jest.mock('@/lib/sanitize', () => ({
  sanitizeInput: jest.fn((v: string) => v),
}))

jest.mock('@/lib/ingest/detect-url-type', () => ({
  detectUrlType: jest.fn(),
}))

jest.mock('@/lib/ingest/youtube', () => ({
  fetchYouTubeTranscript: jest.fn(),
}))

jest.mock('@/lib/ingest/audio', () => ({
  transcribeAudio: jest.fn(),
}))

jest.mock('@/lib/ingest/web-scraper', () => ({
  scrapeWebPage: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { detectUrlType } = require('@/lib/ingest/detect-url-type')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetchYouTubeTranscript } = require('@/lib/ingest/youtube')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { transcribeAudio } = require('@/lib/ingest/audio')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { scrapeWebPage } = require('@/lib/ingest/web-scraper')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { requireAuth } = require('@/lib/auth')

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })
}

const mockAssetRow = { id: 'asset-ingest-001', session_id: 'sess-ingest-001', asset_type: 'source_transcript', content: {} }
const longText = 'word '.repeat(100)

describe('POST /api/ingest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSingle.mockResolvedValue({ data: mockAssetRow, error: null })
  })

  it('dispatches to fetchYouTubeTranscript for youtube URLs and returns 200', async () => {
    detectUrlType.mockReturnValue('youtube')
    fetchYouTubeTranscript.mockResolvedValue(longText)

    const res = await POST(makeRequest({ url: 'https://youtube.com/watch?v=abc12345678' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.sessionId).toBe('sess-ingest-001')
    expect(json.data.wordCount).toBeGreaterThan(0)
    expect(fetchYouTubeTranscript).toHaveBeenCalledWith('https://youtube.com/watch?v=abc12345678')
  })

  it('dispatches to transcribeAudio for audio URLs and returns 200', async () => {
    detectUrlType.mockReturnValue('audio')
    transcribeAudio.mockResolvedValue(longText)

    const res = await POST(makeRequest({ url: 'https://example.com/podcast.mp3' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(transcribeAudio).toHaveBeenCalledWith('https://example.com/podcast.mp3')
  })

  it('dispatches to scrapeWebPage for web URLs and returns 200', async () => {
    detectUrlType.mockReturnValue('web')
    scrapeWebPage.mockResolvedValue(longText)

    const res = await POST(makeRequest({ url: 'https://example.com/article' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.assetId).toBeTruthy()
    expect(scrapeWebPage).toHaveBeenCalledWith('https://example.com/article')
  })

  it('returns 400 when url field is missing', async () => {
    const res = await POST(makeRequest({}))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error.code).toBe('validation_error')
  })

  it('returns 422 with source field when IngestionError is thrown', async () => {
    detectUrlType.mockReturnValue('web')
    scrapeWebPage.mockRejectedValue(new IngestionError('web', 'Page timed out'))

    const res = await POST(makeRequest({ url: 'https://slow-site.com' }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error.code).toBe('ingestion_error')
    expect(json.error.source).toBe('web')
    expect(json.error.message).toBe('Page timed out')
  })

  it('returns 401 for unauthenticated request', async () => {
    requireAuth.mockRejectedValueOnce(new Error('Not authenticated'))

    const res = await POST(makeRequest({ url: 'https://example.com' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error.code).toBe('unauthorized')
  })
})
