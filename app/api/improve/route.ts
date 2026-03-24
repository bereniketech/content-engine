import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { claude } from '@/lib/claude'
import { getImprovePrompt } from '@/lib/prompts/improve'

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: { code: 'server_error', message: 'Missing server configuration' } },
        { status: 500 }
      )
    }

    const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // No-op in route handlers.
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    let body: { article?: unknown }
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

    const { data: latestSession } = await supabase
      .from('sessions')
      .select('id,input_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let sessionId = latestSession?.id

    if (!sessionId || latestSession?.input_type !== 'upload') {
      const { data: createdSession, error: createSessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          input_type: 'upload',
          input_data: { article },
        })
        .select('id')
        .single()

      if (createSessionError || !createdSession) {
        return NextResponse.json(
          { error: { code: 'storage_error', message: 'Failed to create upload session' } },
          { status: 500 }
        )
      }

      sessionId = createdSession.id
    }

    const prompt = getImprovePrompt(article)

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const normalized = normalizeImproveResponse(extractJsonPayload(responseText))

    const { error: saveError } = await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'improved',
      content: {
        original: article,
        improved: normalized.improved,
        changes: normalized.changes,
      },
    })

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
