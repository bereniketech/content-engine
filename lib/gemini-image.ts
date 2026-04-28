import { GoogleGenAI } from '@google/genai'
import { sanitizeInput } from '@/lib/sanitize'
import { logger } from '@/lib/logger'

/**
 * Generates an image from a text prompt using Gemini image generation.
 * Returns a base64 data URL string (e.g. "data:image/png;base64,...").
 *
 * @throws Error if GEMINI_API_KEY is not configured or image generation fails.
 */
export async function generateImageFromPrompt(prompt: string, style: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const sanitizedPrompt = sanitizeInput(prompt)
  const sanitizedStyle = sanitizeInput(style)
  const enhancedPrompt = `${sanitizedPrompt}. Style: ${sanitizedStyle}`

  const ai = new GoogleGenAI({ apiKey: geminiKey })

  // Nano Banana model — native Gemini image generation (gemini-2.5-flash-image)
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: enhancedPrompt,
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find(
    (p): p is typeof p & { inlineData: { data: string; mimeType: string } } =>
      p != null &&
      typeof p === 'object' &&
      'inlineData' in p &&
      p.inlineData != null
  )

  if (!imagePart) {
    logger.error({}, 'generateImageFromPrompt: Gemini returned no image data')
    throw new Error('Image generation returned no data')
  }

  const { data: imageBytes, mimeType } = imagePart.inlineData
  return `data:${mimeType};base64,${imageBytes}`
}
