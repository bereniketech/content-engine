import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { getXCampaignPrompt } from '@/lib/prompts/x-campaign'
import { mapAssetRowToContentAsset, resolveSessionId, SESSION_ID_UUID_REGEX } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import { extractJsonPayload } from '@/lib/extract-json'
import { isRecord } from '@/lib/type-guards'

interface XCampaignPost {
  postNumber: number
  phase: 'mystery' | 'reveal_slow' | 'reveal_full'
  content: string
  purpose: string
  scheduleSuggestion: string
  hashtags: string[]
  hasLink: boolean
}

interface XCampaignOutputLocal {
  campaignName: string
  posts: XCampaignPost[]
  threadVariant: string[]
}

type XCampaignRequestBody = {
  article?: unknown
  seoGeo?: unknown
  tone?: unknown
  sessionId?: unknown
}

const MAX_ARTICLE_LENGTH = 120000
const MAX_SEO_GEO_LENGTH = 60000
const MAX_TONE_LENGTH = 4000
const MAX_X_CAMPAIGN_TOKENS = 4000
function isValidSeoGeoShape(
  value: unknown
): value is { seo: Record<string, unknown>; geo: Record<string, unknown> } {
  if (!isRecord(value)) {
    return false
  }

  return isRecord(value.seo) && isRecord(value.geo)
}

function normalizeXCampaignOutput(payload: unknown): XCampaignOutputLocal {
  if (!isRecord(payload)) {
    throw new Error('X campaign payload must be an object')
  }

  const campaignName =
    typeof payload.campaignName === 'string' ? payload.campaignName.trim() : ''

  const rawPosts = Array.isArray(payload.posts) ? payload.posts : []
  const posts: XCampaignPost[] = rawPosts
    .filter(isRecord)
    .map((post) => ({
      postNumber: typeof post.postNumber === 'number' ? post.postNumber : 0,
      phase:
        post.phase === 'mystery' || post.phase === 'reveal_slow' || post.phase === 'reveal_full'
          ? post.phase
          : 'mystery',
      content: typeof post.content === 'string' ? post.content.trim() : '',
      purpose: typeof post.purpose === 'string' ? post.purpose.trim() : '',
      scheduleSuggestion:
        typeof post.scheduleSuggestion === 'string' ? post.scheduleSuggestion.trim() : '',
      hashtags: Array.isArray(post.hashtags)
        ? post.hashtags.filter((h): h is string => typeof h === 'string')
        : [],
      hasLink: typeof post.hasLink === 'boolean' ? post.hasLink : false,
    }))

  const threadVariant = Array.isArray(payload.threadVariant)
    ? payload.threadVariant.filter((t): t is string => typeof t === 'string').map((t) => t.trim())
    : []

  if (!campaignName || posts.length === 0 || threadVariant.length === 0) {
    throw new Error('X campaign payload missing required fields')
  }

  return { campaignName, posts, threadVariant }
}

function serializeSeoGeo(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return null
    }

    if (!isValidSeoGeoShape(parsed)) {
      return null
    }

    return JSON.stringify(sanitizeUnknown(parsed))
  }

  if (!isRecord(value) || !isValidSeoGeoShape(value)) {
    return null
  }

  return JSON.stringify(sanitizeUnknown(value))
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

    let body: XCampaignRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    if (!isRecord(body)) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [{ field: 'body', message: 'Request body must be a JSON object' }],
          },
        },
        { status: 400 }
      )
    }

    const article = typeof body.article === 'string' ? body.article.trim() : ''
    const seoGeo = serializeSeoGeo(body.seoGeo)
    const tone = typeof body.tone === 'string' ? body.tone.trim() : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''

    if (!article || !tone || !sessionId) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(!article ? [{ field: 'article', message: 'article is required' }] : []),
              ...(!tone ? [{ field: 'tone', message: 'tone is required' }] : []),
              ...(!sessionId ? [{ field: 'sessionId', message: 'sessionId is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    if (!seoGeo) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              {
                field: 'seoGeo',
                message: 'seoGeo must be a JSON object with seo and geo fields',
              },
            ],
          },
        },
        { status: 400 }
      )
    }

    if (!SESSION_ID_UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [{ field: 'sessionId', message: 'sessionId must be a valid UUID' }],
          },
        },
        { status: 400 }
      )
    }

    if (
      article.length > MAX_ARTICLE_LENGTH
      || seoGeo.length > MAX_SEO_GEO_LENGTH
      || tone.length > MAX_TONE_LENGTH
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(article.length > MAX_ARTICLE_LENGTH
                ? [{ field: 'article', message: `article must be ${MAX_ARTICLE_LENGTH} characters or fewer` }]
                : []),
              ...(seoGeo.length > MAX_SEO_GEO_LENGTH
                ? [{ field: 'seoGeo', message: `seoGeo must be ${MAX_SEO_GEO_LENGTH} characters or fewer` }]
                : []),
              ...(tone.length > MAX_TONE_LENGTH
                ? [{ field: 'tone', message: `tone must be ${MAX_TONE_LENGTH} characters or fewer` }]
                : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const sanitizedArticle = sanitizeInput(article)
    const sanitizedTone = sanitizeInput(tone)

    let resolvedSessionId: string
    try {
      resolvedSessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: sessionId,
        fallbackInputType: 'data-driven',
        fallbackInputData: {
          sourceText: sanitizedArticle.slice(0, 2000),
          tone: sanitizedTone,
        },
      })
    } catch (sessionError) {
      if (sessionError instanceof Error && sessionError.message === 'Session not found') {
        return NextResponse.json(
          { error: { code: 'session_not_found', message: 'Session not found' } },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to resolve session' } },
        { status: 500 }
      )
    }

    const prompt = getXCampaignPrompt(sanitizedArticle, seoGeo, sanitizedTone)

    let output: XCampaignOutputLocal
    try {
      const responseText = await createMessage({
        maxTokens: MAX_X_CAMPAIGN_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      })

      output = normalizeXCampaignOutput(extractJsonPayload(responseText || '{}'))
    } catch {
      return NextResponse.json(
        { error: { code: 'x_campaign_error', message: 'Failed to generate X campaign' } },
        { status: 500 }
      )
    }

    const assetContent = {
      campaignName: output.campaignName,
      posts: output.posts,
      threadVariant: output.threadVariant,
    }

    const { data: savedAssets, error: saveError } = await supabase
      .from('content_assets')
      .insert([
        {
          session_id: resolvedSessionId,
          asset_type: 'dd_x_campaign',
          content: assetContent,
        },
      ])
      .select('*')

    if (saveError || !savedAssets || savedAssets.length !== 1) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save X campaign asset' } },
        { status: 500 }
      )
    }

    const asset = mapAssetRowToContentAsset(savedAssets[0])

    return NextResponse.json(
      {
        data: {
          id: asset.id,
          sessionId: resolvedSessionId,
          assetType: asset.assetType,
          content: asset.content,
          version: asset.version,
          createdAt: asset.createdAt,
        },
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
