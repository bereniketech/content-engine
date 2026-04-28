import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock external modules
jest.mock('@/lib/ai', () => ({
  createMessage: jest.fn().mockResolvedValue(
    '{"hero":"A hero prompt","sections":["s1"],"infographic":"infographic","social":"social card","pinterest":"pinterest"}'
  ),
}))

jest.mock('@/lib/gemini-image', () => ({
  generateImageFromPrompt: jest.fn(),
}))

jest.mock('@/lib/fal-images', () => ({
  generateSocialCards: jest.fn(),
}))

jest.mock('@/lib/sanitize', () => ({
  sanitizeInput: jest.fn((v: string) => v),
  sanitizeUnknown: jest.fn((v: unknown) => v),
}))

jest.mock('@/lib/extract-json', () => ({
  extractJsonPayload: jest.fn((raw: string) => JSON.parse(raw)),
}))

jest.mock('@/lib/type-guards', () => ({
  isRecord: jest.fn((v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null),
}))

jest.mock('@/lib/prompts/images', () => ({
  getImagesPrompt: jest.fn().mockReturnValue('prompt'),
  IMAGE_STYLES: ['realistic', 'startup-style'],
}))

const mockSingle = jest.fn()
const mockSelect = jest.fn(() => ({ single: mockSingle }))
const mockInsert = jest.fn(() => ({ select: mockSelect }))
const mockSupabase = {
  from: jest.fn(() => ({ insert: mockInsert })),
}

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-123' },
    supabase: mockSupabase,
  }),
}))

jest.mock('@/lib/session-assets', () => ({
  resolveSessionId: jest.fn().mockResolvedValue('sess-abc'),
  mapAssetRowToContentAsset: jest.fn((row: Record<string, unknown>) => ({ id: row.id, ...row })),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateImageFromPrompt } = require('@/lib/gemini-image')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateSocialCards } = require('@/lib/fal-images')

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockAssetRow = { id: 'asset-001', session_id: 'sess-abc', asset_type: 'images', content: {} }
const mockGeneratedAssetRow = { id: 'asset-002', session_id: 'sess-abc', asset_type: 'image_generated', content: {} }

describe('POST /api/images — autoGenerate path', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-gemini-key'
    process.env.FAL_API_KEY = 'test-fal-key'

    // Default: first insert = images row, second = generated image row
    mockSingle
      .mockResolvedValueOnce({ data: mockAssetRow, error: null })
      .mockResolvedValueOnce({ data: mockGeneratedAssetRow, error: null })

    generateSocialCards.mockResolvedValue({
      featured: 'https://cdn.fal.ai/featured.jpg',
      portrait: 'https://cdn.fal.ai/portrait.jpg',
    })
  })

  it('returns 201 with generatedImage.imageUrl when autoGenerate: true', async () => {
    generateImageFromPrompt.mockResolvedValue('data:image/jpeg;base64,abc')

    const res = await POST(makeRequest({ topic: 'AI tools', blog: 'content here', autoGenerate: true }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.generatedImage.imageUrl).toBe('data:image/jpeg;base64,abc')
    expect(json.data.generatedImage.assetId).toBe('asset-002')
  })

  it('returns 201 with autoGenerateError when Gemini throws', async () => {
    generateImageFromPrompt.mockRejectedValue(new Error('Gemini unavailable'))

    const res = await POST(makeRequest({ topic: 'AI tools', blog: 'content here', autoGenerate: true }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.autoGenerateError).toBe('Gemini unavailable')
    expect(json.data.generatedImage).toBeUndefined()
  })

  it('returns 201 with socialCardsError when fal.ai throws, generatedImage still present', async () => {
    generateImageFromPrompt.mockResolvedValue('data:image/jpeg;base64,abc')
    generateSocialCards.mockRejectedValue(new Error('fal timeout'))

    const res = await POST(makeRequest({ topic: 'AI tools', blog: 'content here', autoGenerate: true }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.generatedImage.imageUrl).toBe('data:image/jpeg;base64,abc')
    expect(json.data.socialCardsError).toBe('fal timeout')
  })

  it('returns 201 with autoGenerateError when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY
    generateImageFromPrompt.mockRejectedValue(new Error('GEMINI_API_KEY not configured'))

    const res = await POST(makeRequest({ topic: 'AI tools', blog: 'content here', autoGenerate: true }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.autoGenerateError).toContain('GEMINI_API_KEY')
  })

  it('behaves identically to current behavior when autoGenerate is not set', async () => {
    const res = await POST(makeRequest({ topic: 'AI tools', blog: 'content here' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.generatedImage).toBeUndefined()
    expect(json.data.autoGenerateError).toBeUndefined()
    expect(generateImageFromPrompt).not.toHaveBeenCalled()
  })
})
