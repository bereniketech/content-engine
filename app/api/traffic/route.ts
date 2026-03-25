import { NextRequest, NextResponse } from 'next/server'
import { claude } from '@/lib/claude'
import { getTrafficPrompt, type TrafficPrediction } from '@/lib/prompts/traffic'
import { createSupabaseUserClient, requireAuth } from '@/lib/auth'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

type TrafficRequestBody = {
  topic?: unknown
  seo?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fencedJsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fencedJsonMatch) {
      return JSON.parse(fencedJsonMatch[1])
    }
    throw new Error('Claude response did not contain valid JSON')
  }
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

    const { user, token } = auth
    const supabase = createSupabaseUserClient(token)

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

    const { data: latestSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let sessionId = latestSession?.id
    if (!sessionId) {
      const { data: createdSession, error: createSessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          input_type: 'topic',
          input_data: { topic: sanitizedTopic },
        })
        .select('id')
        .single()

      if (createSessionError || !createdSession) {
        return NextResponse.json(
          { error: { code: 'storage_error', message: 'Failed to create session' } },
          { status: 500 }
        )
      }
      sessionId = createdSession.id
    }

    const prompt = getTrafficPrompt(sanitizedTopic, seo)

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
    const traffic = normalizeTrafficPrediction(extractJsonPayload(responseText))

    const { error: saveError } = await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'traffic',
      content: { topic: sanitizedTopic, seo, ...traffic },
    })

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
