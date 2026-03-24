import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { claude } from '@/lib/claude'
import { getDistributePrompt, type DistributionOutput } from '@/lib/prompts/distribute'

type DistributeRequestBody = {
  assets?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fencedMatch) {
      return JSON.parse(fencedMatch[1])
    }
    throw new Error('Claude response did not contain valid JSON')
  }
}

function normalizePlatformInstructions(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.entries(value).reduce<Record<string, string>>((acc, [platform, instructions]) => {
    if (typeof instructions === 'string') {
      acc[platform] = instructions
    }
    return acc
  }, {})
}

function normalizeDistributionOutput(payload: unknown): DistributionOutput {
  if (!isRecord(payload)) {
    throw new Error('Distribution output must be an object')
  }

  const sequence = Array.isArray(payload.sequence)
    ? payload.sequence
        .filter((item): item is Record<string, unknown> => isRecord(item))
        .map((item) => {
          const dayRaw = typeof item.day === 'number' ? item.day : Number(item.day)
          const day = dayRaw >= 1 && dayRaw <= 3 ? Math.round(dayRaw) : 1

          return {
            day: day as 1 | 2 | 3,
            platform: typeof item.platform === 'string' ? item.platform : '',
            assetType: typeof item.assetType === 'string' ? item.assetType : '',
            instructions: typeof item.instructions === 'string' ? item.instructions : '',
          }
        })
        .filter((item) => item.platform && item.assetType && item.instructions)
    : []

  return {
    sequence,
    platformInstructions: normalizePlatformInstructions(payload.platformInstructions),
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

    let body: DistributeRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const assets = body.assets
    if (!assets) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [{ field: 'assets', message: 'Assets summary is required' }],
          },
        },
        { status: 400 }
      )
    }

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
          input_type: 'upload',
          input_data: { assets },
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

    const prompt = getDistributePrompt(assets)

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
    const distribution = normalizeDistributionOutput(extractJsonPayload(responseText))

    const { error: saveError } = await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'distribution',
      content: distribution,
    })

    if (saveError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save distribution plan' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          sessionId,
          distribution,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Distribute API error:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
