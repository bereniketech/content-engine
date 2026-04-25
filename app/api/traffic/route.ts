import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { getTrafficPrompt, type TrafficPrediction } from '@/lib/prompts/traffic'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import { extractJsonPayload } from '@/lib/extract-json'
import { isRecord } from '@/lib/type-guards'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

type TrafficRequestBody = {
  topic?: unknown
  seo?: unknown
  sessionId?: unknown
}

function clampScore(value: unknown): number {
  const score = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(score)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(score)))
}

function normalizeLabel(value: unknown): 'Low' | 'Medium' | 'High' {
  if (value === 'Low' || value === 'Medium' || value === 'High') {
    return value
  }

  const normalized = typeof value === 'string' ? value.toLowerCase() : ''
  if (normalized === 'low') {
    return 'Low'
  }
  if (normalized === 'high') {
    return 'High'
  }
  return 'Medium'
}

function normalizeTrafficPrediction(payload: unknown): TrafficPrediction {
  if (!isRecord(payload)) {
    throw new Error('Traffic prediction must be an object')
  }

  return {
    demand: clampScore(payload.demand),
    competition: clampScore(payload.competition),
    clickPotential: clampScore(payload.clickPotential),
    seoStrength: clampScore(payload.seoStrength),
    label: normalizeLabel(payload.label),
    estimatedRange:
      typeof payload.estimatedRange === 'string' && payload.estimatedRange.trim().length > 0
        ? payload.estimatedRange
        : 'Not available',
  }
}

export async function POST(request: NextRequest) {
  try {
    let auth
    try {
      auth = await requireAuth(request)
    } catch {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { user, supabase } = auth

    let body: TrafficRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const seo = isRecord(body.seo) ? sanitizeUnknown(body.seo) : null

    if (!topic || !seo) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(!topic ? [{ field: 'topic', message: 'Topic is required' }] : []),
              ...(!seo ? [{ field: 'seo', message: 'SEO object is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const sanitizedTopic = sanitizeInput(topic)

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'topic',
        fallbackInputData: { topic: sanitizedTopic },
      })
    } catch (sessionError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: sessionError instanceof Error ? sessionError.message : 'Failed to resolve session' } },
        { status: 500 },
      )
    }

    const prompt = getTrafficPrompt(sanitizedTopic, seo)

    const responseText = await createMessage({
      maxTokens: 900,
      messages: [{ role: 'user', content: prompt }],
    }) || '{}'
    const traffic = normalizeTrafficPrediction(extractJsonPayload(responseText))

    const { data: savedAsset, error: saveError } = await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'traffic',
      content: { topic: sanitizedTopic, seo, ...traffic },
    })
      .select('*')
      .single()

    if (saveError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save traffic prediction' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          sessionId,
          traffic,
          asset: savedAsset ? mapAssetRowToContentAsset(savedAsset) : null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Traffic API error:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
