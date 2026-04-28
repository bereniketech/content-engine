import { fetchYouTubeTranscript } from './youtube'
import { IngestionError } from './errors'

jest.mock('googleapis', () => ({
  google: {
    youtube: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { google } = require('googleapis')

const mockDownload = jest.fn()
const mockCaptionsList = jest.fn()
const mockYouTubeClient = {
  captions: {
    list: mockCaptionsList,
    download: mockDownload,
  },
}

describe('fetchYouTubeTranscript', () => {
  const originalApiKey = process.env.GOOGLE_SEARCH_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GOOGLE_SEARCH_API_KEY = 'test-yt-key'
    google.youtube.mockReturnValue(mockYouTubeClient)
  })

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.GOOGLE_SEARCH_API_KEY
    } else {
      process.env.GOOGLE_SEARCH_API_KEY = originalApiKey
    }
  })

  it('returns cleaned transcript for valid YouTube URL', async () => {
    mockCaptionsList.mockResolvedValue({
      data: { items: [{ id: 'cap-001', snippet: { language: 'en' } }] },
    })
    mockDownload.mockResolvedValue({ data: '<p>Hello <b>world</b></p>\n<p>This is a test.</p>' })

    const result = await fetchYouTubeTranscript('https://youtube.com/watch?v=abc12345678')

    expect(result).toContain('Hello')
    expect(result).toContain('world')
    expect(result).not.toContain('<')
  })

  it('throws IngestionError for invalid YouTube URL', async () => {
    await expect(fetchYouTubeTranscript('https://example.com/not-youtube'))
      .rejects.toMatchObject({ source: 'youtube', message: 'Invalid YouTube URL' })
  })

  it('throws IngestionError when GOOGLE_SEARCH_API_KEY is missing', async () => {
    delete process.env.GOOGLE_SEARCH_API_KEY

    await expect(fetchYouTubeTranscript('https://youtube.com/watch?v=abc12345678'))
      .rejects.toMatchObject({ source: 'youtube', message: expect.stringContaining('API key') })
  })

  it('throws IngestionError when captions list is empty', async () => {
    mockCaptionsList.mockResolvedValue({ data: { items: [] } })

    await expect(fetchYouTubeTranscript('https://youtube.com/watch?v=abc12345678'))
      .rejects.toMatchObject({ source: 'youtube', message: expect.stringContaining('No captions') })
  })

  it('throws IngestionError is instance of IngestionError', async () => {
    await expect(fetchYouTubeTranscript('not-a-url'))
      .rejects.toBeInstanceOf(IngestionError)
  })
})
