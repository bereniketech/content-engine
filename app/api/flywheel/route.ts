import { NextRequest, NextResponse } from 'next/server'
import { claude } from '@/lib/claude'
import { getFlywheelPrompt, type FlywheelIdea } from '@/lib/prompts/flywheel'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput } from '@/lib/sanitize'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

type FlywheelRequestBody = {
  topic?: unknown
  keywords?: unknown
  sessionId?: unknown
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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

function buildFallbackIdeas(topic: string, keywords: string[], count: number): FlywheelIdea[] {
  const fallbackClusters = [
    'Beginner Guides',
    'Tactical Playbooks',
    'Case Studies',
    'Comparisons',
    'Workflows',
  ]

  return Array.from({ length: count }, (_, index) => ({
    topic: `${topic}: angle ${index + 1}`,
    keywords: keywords.length > 0 ? keywords.slice(0, 5) : [topic, 'strategy', 'framework'],
    cluster: fallbackClusters[index % fallbackClusters.length],
  }))
}

function normalizeFlywheelIdeas(payload: unknown, topic: string, keywords: string[]): FlywheelIdea[] {
  if (!isRecord(payload) || !Array.isArray(payload.ideas)) {
    return buildFallbackIdeas(topic, keywords, 10)
  }

  const ideas = payload.ideas
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      topic: typeof item.topic === 'string' ? item.topic.trim() : '',
      keywords: asStringArray(item.keywords),
      cluster: typeof item.cluster === 'string' ? item.cluster.trim() : '',
    }))
    .filter((item) => item.topic.length > 0 && item.cluster.length > 0)

  if (ideas.length >= 10) {
    return ideas
  }

  return [...ideas, ...buildFallbackIdeas(topic, keywords, 10 - ideas.length)]
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

    let body: FlywheelRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const keywords = asStringArray(body.keywords)

    if (!topic) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [{ field: 'topic', message: 'Topic is required' }],
          },
        },
        { status: 400 }
      )
    }

    const sanitizedTopic = sanitizeInput(topic)
    const sanitizedKeywords = keywords.map((keyword) => sanitizeInput(keyword))

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'topic',
        fallbackInputData: { topic: sanitizedTopic, keywords: sanitizedKeywords },
      })
    } catch (sessionError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: sessionError instanceof Error ? sessionError.message : 'Failed to resolve session' } },
        { status: 500 },
      )
    }

    const prompt = getFlywheelPrompt(sanitizedTopic, sanitizedKeywords)

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
    const flywheelIdeas = normalizeFlywheelIdeas(
      extractJsonPayload(responseText),
      sanitizedTopic,
      sanitizedKeywords
    )

    const { data: savedAsset, error: saveError } = await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'flywheel',
      content: {
        topic: sanitizedTopic,
        keywords: sanitizedKeywords,
        ideas: flywheelIdeas,
      },
    })
      .select('*')
      .single()

    if (saveError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save flywheel ideas' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          sessionId,
          ideas: flywheelIdeas,
          asset: savedAsset ? mapAssetRowToContentAsset(savedAsset) : null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Flywheel API error:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
