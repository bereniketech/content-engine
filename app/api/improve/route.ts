import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { getImprovePrompt } from '@/lib/prompts/improve'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput } from '@/lib/sanitize'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

interface ImproveResponse {
  improved: string
  changes: Array<{ type: string; description: string }>
}

const MIN_ARTICLE_LENGTH = 101

function extractJsonPayload(raw: string): ImproveResponse {
  const trimmed = raw.trim()

  try {
    return JSON.parse(trimmed) as ImproveResponse
  } catch {
    const fencedJsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fencedJsonMatch) {
      return JSON.parse(fencedJsonMatch[1]) as ImproveResponse
    }
    throw new Error('Claude response did not contain valid JSON')
  }
}

function normalizeImproveResponse(payload: ImproveResponse): ImproveResponse {
  const improved = typeof payload.improved === 'string' ? payload.improved.trim() : ''
  const changes = Array.isArray(payload.changes)
    ? payload.changes
        .filter((change) => change && typeof change.type === 'string' && typeof change.description === 'string')
        .map((change) => ({
          type: change.type.trim() || 'clarity',
          description: change.description.trim(),
        }))
        .filter((change) => change.description.length > 0)
    : []

  if (!improved) {
    throw new Error('Missing improved content from Claude response')
  }

  return {
    improved,
    changes,
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

    let body: { article?: unknown; sessionId?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const article = typeof body.article === 'string' ? body.article.trim() : ''

    if (article.length < MIN_ARTICLE_LENGTH) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              {
                field: 'article',
                message: 'Article content must be longer than 100 characters',
                code: 'too_short',
              },
            ],
          },
        },
        { status: 422 }
      )
    }

    const sanitizedArticle = sanitizeInput(article)

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'upload',
        fallbackInputData: { article: sanitizedArticle },
      })
    } catch (sessionError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: sessionError instanceof Error ? sessionError.message : 'Failed to resolve session' } },
        { status: 500 },
      )
    }

    const prompt = getImprovePrompt(sanitizedArticle)

    const responseText = await createMessage({
      maxTokens: 2200,
      messages: [{ role: 'user', content: prompt }],
    })
    const normalized = normalizeImproveResponse(extractJsonPayload(responseText))

    const { data: savedAsset, error: saveError } = await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'improved',
      content: {
        original: article,
        improved: normalized.improved,
        changes: normalized.changes,
      },
    })
      .select('*')
      .single()

    if (saveError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save improved content' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        original: article,
        improved: normalized.improved,
        changes: normalized.changes,
        data: savedAsset ? mapAssetRowToContentAsset(savedAsset) : null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Improve API error:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
