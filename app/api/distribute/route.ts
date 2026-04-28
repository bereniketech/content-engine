import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { getDistributePrompt, type DistributionOutput } from '@/lib/prompts/distribute'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeUnknown } from '@/lib/sanitize'
import { extractJsonPayload } from '@/lib/extract-json'
import { isRecord } from '@/lib/type-guards'
import { logger } from '@/lib/logger'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

type DistributeRequestBody = {
  assets?: unknown
  sessionId?: unknown
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

    const sanitizedAssets = sanitizeUnknown(assets)

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'upload',
        fallbackInputData: { assets: sanitizedAssets },
      })
    } catch (sessionError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: sessionError instanceof Error ? sessionError.message : 'Failed to resolve session' } },
        { status: 500 },
      )
    }

    const prompt = getDistributePrompt(sanitizedAssets)

    const responseText = await createMessage({
      maxTokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    }) || '{}'
    const distribution = normalizeDistributionOutput(extractJsonPayload(responseText))

    const { data: savedAsset, error: saveError } = await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'distribution',
      content: distribution,
    })
      .select('*')
      .single()

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
          asset: savedAsset ? mapAssetRowToContentAsset(savedAsset) : null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ err: error }, 'Distribute API error')
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
