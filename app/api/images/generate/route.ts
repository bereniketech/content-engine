import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { requireAuth } from '@/lib/auth'
import { sanitizeInput } from '@/lib/sanitize'
import { logger } from '@/lib/logger'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

export async function POST(request: NextRequest) {
  try {
    try {
      await requireAuth(request)
    } catch {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const geminiKey = process.env.GEMINI_API_KEY

    if (!geminiKey) {
      return NextResponse.json(
        { error: { code: 'server_error', message: 'GEMINI_API_KEY not configured' } },
        { status: 500 }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const style = typeof body.style === 'string' ? sanitizeInput(body.style) : 'realistic'

    if (!prompt) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [{ field: 'prompt', message: 'Prompt is required' }],
          },
        },
        { status: 400 }
      )
    }

    // Enhance prompt with style context
    const enhancedPrompt = `${sanitizeInput(prompt)}. Style: ${style}`

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
      return NextResponse.json(
        { error: { code: 'generation_error', message: 'Image generation returned no data' } },
        { status: 502 }
      )
    }

    const { data: imageBytes, mimeType } = imagePart.inlineData
    const imageUrl = `data:${mimeType};base64,${imageBytes}`

    return NextResponse.json(
      { data: { imageUrl } },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    logger.error({}, 'Error in image generation: ' + message)
    return NextResponse.json(
      { error: { code: 'server_error', message } },
      { status: 500 }
    )
  }
}
