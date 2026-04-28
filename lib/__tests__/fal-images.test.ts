import { generateSocialCards } from '../fal-images'

jest.mock('@fal-ai/client', () => ({
  fal: {
    config: jest.fn(),
    run: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fal } = require('@fal-ai/client')

describe('generateSocialCards', () => {
  const originalFalKey = process.env.FAL_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.FAL_API_KEY = 'test-fal-key'
  })

  afterEach(() => {
    if (originalFalKey === undefined) {
      delete process.env.FAL_API_KEY
    } else {
      process.env.FAL_API_KEY = originalFalKey
    }
  })

  it('returns featured and portrait URLs on success', async () => {
    fal.run.mockResolvedValue({ images: [{ url: 'https://cdn.fal.ai/test.jpg' }] })

    const result = await generateSocialCards('test prompt', 'session-123')

    expect(result.featured).toBe('https://cdn.fal.ai/test.jpg')
    expect(result.portrait).toBe('https://cdn.fal.ai/test.jpg')
  })

  it('calls fal.run with correct image sizes', async () => {
    fal.run.mockResolvedValue({ images: [{ url: 'https://cdn.fal.ai/img.jpg' }] })

    await generateSocialCards('my prompt', 'sess-abc')

    expect(fal.run).toHaveBeenCalledWith('fal-ai/flux/schnell', {
      input: { prompt: 'my prompt', image_size: { width: 1200, height: 630 } },
    })
    expect(fal.run).toHaveBeenCalledWith('fal-ai/flux/schnell', {
      input: { prompt: 'my prompt', image_size: { width: 1080, height: 1350 } },
    })
    expect(fal.run).toHaveBeenCalledTimes(2)
  })

  it('throws when FAL_API_KEY is missing', async () => {
    delete process.env.FAL_API_KEY

    await expect(generateSocialCards('prompt', 'sess')).rejects.toThrow('FAL_API_KEY')
  })

  it('executes both fal.run calls in parallel via Promise.all', async () => {
    const callOrder: number[] = []
    let resolveFirst: (v: unknown) => void
    let resolveSecond: (v: unknown) => void
    const img = { images: [{ url: 'https://cdn.fal.ai/x.jpg' }] }

    fal.run
      .mockImplementationOnce(() => {
        callOrder.push(1)
        return new Promise((res) => {
          resolveFirst = res
        })
      })
      .mockImplementationOnce(() => {
        callOrder.push(2)
        return new Promise((res) => {
          resolveSecond = res
        })
      })

    const promise = generateSocialCards('parallel test', 'sess')

    // Both calls initiated before either resolves
    await Promise.resolve()
    expect(callOrder).toEqual([1, 2])

    resolveFirst!(img)
    resolveSecond!(img)
    await promise
  })

  it('throws when fal.ai returns no images', async () => {
    fal.run.mockResolvedValue({ images: [] })

    await expect(generateSocialCards('bad prompt', 'sess')).rejects.toThrow(
      'fal.ai returned no image URLs'
    )
  })
})
