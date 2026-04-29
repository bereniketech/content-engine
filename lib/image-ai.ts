import { GoogleGenAI } from '@google/genai'
import { fal } from '@fal-ai/client'
import { sanitizeInput } from '@/lib/sanitize'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Provider detection — mirrors lib/ai.ts pattern
// ---------------------------------------------------------------------------
export type ImageProvider = 'gemini' | 'fal'

export function getImageProvider(): ImageProvider {
  const explicit = process.env.IMAGE_PROVIDER?.toLowerCase()
  if (explicit === 'fal') return 'fal'
  if (explicit === 'gemini') return 'gemini'

  // Auto-detect: prefer whichever key is set
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.FAL_API_KEY) return 'fal'

  return 'gemini' // default
}

// ---------------------------------------------------------------------------
// Default models per provider
// ---------------------------------------------------------------------------
const DEFAULT_MODELS: Record<ImageProvider, string> = {
  gemini: 'gemini-2.5-flash-image',
  fal: 'fal-ai/flux/schnell',
}

export function getDefaultImageModel(provider?: ImageProvider): string {
  return DEFAULT_MODELS[provider ?? getImageProvider()]
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export interface GenerateImageOptions {
  prompt: string
  style?: string
  model?: string
  width?: number
  height?: number
}

export interface SocialCards {
  featured: string  // 1200×630
  portrait: string  // 1080×1350
}

// ---------------------------------------------------------------------------
// Single image generation — returns base64 data URL or hosted URL
// ---------------------------------------------------------------------------
export async function generateImage(opts: GenerateImageOptions): Promise<string> {
  const provider = getImageProvider()
  const model = opts.model ?? getDefaultImageModel(provider)
  const sanitizedPrompt = sanitizeInput(opts.prompt)
  const enhancedPrompt = opts.style
    ? `${sanitizedPrompt}. Style: ${sanitizeInput(opts.style)}`
    : sanitizedPrompt

  if (provider === 'fal') {
    const falKey = process.env.FAL_API_KEY
    if (!falKey) throw new Error('FAL_API_KEY not configured')

    fal.config({ credentials: falKey })

    interface FalRunResult { images: { url: string }[] }
    const result = await fal.run(model, {
      input: {
        prompt: enhancedPrompt,
        image_size: {
          width: opts.width ?? 1200,
          height: opts.height ?? 630,
        },
      },
    }) as FalRunResult

    const url = result.images[0]?.url
    if (!url) throw new Error('fal.ai returned no image URL')
    return url
  }

  // Gemini — returns base64 data URL
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) throw new Error('GEMINI_API_KEY not configured')

  const ai = new GoogleGenAI({ apiKey: geminiKey })
  const response = await ai.models.generateContent({
    model,
    contents: enhancedPrompt,
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find(
    (p): p is typeof p & { inlineData: { data: string; mimeType: string } } =>
      p != null && typeof p === 'object' && 'inlineData' in p && p.inlineData != null
  )

  if (!imagePart) {
    logger.error({}, 'generateImage: provider returned no image data')
    throw new Error('Image generation returned no data')
  }

  const { data: imageBytes, mimeType } = imagePart.inlineData
  return `data:${mimeType};base64,${imageBytes}`
}

// ---------------------------------------------------------------------------
// Social cards — two sizes in parallel
// ---------------------------------------------------------------------------
export async function generateSocialCards(
  prompt: string,
  _sessionId: string,
): Promise<SocialCards> {
  const provider = getImageProvider()
  const model = getDefaultImageModel(provider)
  const sanitizedPrompt = sanitizeInput(prompt)

  if (provider === 'gemini') {
    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured')

    const ai = new GoogleGenAI({ apiKey: geminiKey })

    const generate = async (width: number, height: number): Promise<string> => {
      const sizePrompt = `${sanitizedPrompt}. Image dimensions: ${width}x${height}.`
      const response = await ai.models.generateContent({
        model: getDefaultImageModel('gemini'),
        contents: sizePrompt,
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      })
      const parts = response.candidates?.[0]?.content?.parts ?? []
      const imagePart = parts.find(
        (p): p is typeof p & { inlineData: { data: string; mimeType: string } } =>
          p != null && typeof p === 'object' && 'inlineData' in p && p.inlineData != null
      )
      if (!imagePart) throw new Error('Gemini returned no image data for social card')
      const { data, mimeType } = imagePart.inlineData
      return `data:${mimeType};base64,${data}`
    }

    const [featured, portrait] = await Promise.all([
      generate(1200, 630),
      generate(1080, 1350),
    ])
    return { featured, portrait }
  }

  // FAL
  const falKey = process.env.FAL_API_KEY
  if (!falKey) throw new Error('FAL_API_KEY not configured')

  fal.config({ credentials: falKey })

  interface FalRunResult { images: { url: string }[] }

  const [featuredResult, portraitResult] = await Promise.all([
    fal.run(model, {
      input: { prompt: sanitizedPrompt, image_size: { width: 1200, height: 630 } },
    }) as Promise<FalRunResult>,
    fal.run(model, {
      input: { prompt: sanitizedPrompt, image_size: { width: 1080, height: 1350 } },
    }) as Promise<FalRunResult>,
  ])

  const featured = featuredResult.images[0]?.url
  const portrait = portraitResult.images[0]?.url
  if (!featured || !portrait) throw new Error('fal.ai returned no image URLs')

  return { featured, portrait }
}
