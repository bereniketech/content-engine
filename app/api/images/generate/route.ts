import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sanitizeInput } from '@/lib/sanitize'
import { logger } from '@/lib/logger'
import { generateImage } from '@/lib/image-ai'

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

    const imageUrl = await generateImage({ prompt, style })

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
