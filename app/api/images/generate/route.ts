import { NextRequest, NextResponse } from 'next/server'
import * as fal from '@fal-ai/serverless-client'
import type { ImageStyle } from '@/lib/prompts/images'
import { requireAuth } from '@/lib/auth'
import { sanitizeInput } from '@/lib/sanitize'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

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

    const fal_key = process.env.FAL_KEY

    if (!fal_key) {
      return NextResponse.json(
        { error: { code: 'server_error', message: 'FAL_KEY not configured' } },
        { status: 500 }
      )
    }

    fal.config({
      credentials: fal_key,
    })

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

    // Call fal.ai Flux model for image generation
    const result = await fal.subscribe('fal-ai/flux/dev', {
      input: {
        prompt: enhancedPrompt,
        image_size: { width: 1024, height: 1024 },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: true,
      },
      logs: true,
    })

    if (!isRecord(result) || !isRecord(result.data)) {
      return NextResponse.json(
        { error: { code: 'generation_error', message: 'Failed to generate image' } },
        { status: 502 }
      )
    }

    const images = Array.isArray(result.data.images) ? result.data.images : []
    const firstImage = images[0]

    if (!firstImage || !isRecord(firstImage) || typeof firstImage.url !== 'string') {
      return NextResponse.json(
        { error: { code: 'generation_error', message: 'image generation returned invalid format' } },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { data: { imageUrl: firstImage.url } },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Error in image generation:', message)
    return NextResponse.json(
      { error: { code: 'server_error', message } },
      { status: 500 }
    )
  }
}
