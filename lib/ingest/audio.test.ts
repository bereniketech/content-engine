import { transcribeAudio } from './audio'
import { IngestionError } from './errors'

jest.mock('@fal-ai/client', () => ({
  fal: {
    config: jest.fn(),
    run: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fal } = require('@fal-ai/client')

describe('transcribeAudio', () => {
  const originalFalKey = process.env.FAL_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    process.env.FAL_API_KEY = 'test-fal-key'
  })

  afterEach(() => {
    jest.useRealTimers()
    if (originalFalKey === undefined) {
      delete process.env.FAL_API_KEY
    } else {
      process.env.FAL_API_KEY = originalFalKey
    }
  })

  it('returns transcript text on success', async () => {
    fal.run.mockResolvedValue({ text: 'Hello from audio transcription' })

    const result = await transcribeAudio('https://example.com/podcast.mp3')

    expect(result).toBe('Hello from audio transcription')
  })

  it('throws IngestionError with source=audio when FAL_API_KEY is missing', async () => {
    delete process.env.FAL_API_KEY

    await expect(transcribeAudio('https://example.com/audio.mp3'))
      .rejects.toMatchObject({ source: 'audio', message: 'FAL_API_KEY not configured' })
  })

  it('throws IngestionError when fal.run throws', async () => {
    fal.run.mockRejectedValue(new Error('Network error'))

    await expect(transcribeAudio('https://example.com/audio.mp3'))
      .rejects.toMatchObject({ source: 'audio' })
  })

  it('throws IngestionError on timeout after 120s', async () => {
    fal.run.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200_000))
    )

    const promise = transcribeAudio('https://example.com/audio.mp3')
    jest.advanceTimersByTime(120_001)

    await expect(promise).rejects.toMatchObject({
      source: 'audio',
      message: 'Transcription timed out',
    })
  })

  it('throws IngestionError when empty URL is passed', async () => {
    await expect(transcribeAudio(''))
      .rejects.toBeInstanceOf(IngestionError)
  })
})
