import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { getMultiFormatPrompt } from '@/lib/prompts/multi-format'
import { mapAssetRowToContentAsset, resolveSessionId, SESSION_ID_UUID_REGEX } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import { extractJsonPayload } from '@/lib/extract-json'
import { isRecord } from '@/lib/type-guards'
import { getWordCount } from '@/lib/utils'

interface MultiFormatOutput {
  blog: string
  linkedin: string
  medium: {
    article: string
    subtitle: string
  }
  newsletter: {
    subjectLine: string
    previewText: string
    body: string
    plainText: string
  }
}

type MultiFormatRequestBody = {
  article?: unknown
  seoGeo?: unknown
  tone?: unknown
  sessionId?: unknown
}

const MAX_ARTICLE_LENGTH = 120000
const MAX_SEO_GEO_LENGTH = 60000
const MAX_TONE_LENGTH = 4000
const MAX_MULTI_FORMAT_TOKENS = 8000
function isValidSeoGeoShape(value: unknown): value is { seo: Record<string, unknown>; geo: Record<string, unknown> } {
  if (!isRecord(value) || Array.isArray(value)) {
    return false
  }

  return isRecord(value.seo) && !Array.isArray(value.seo) && isRecord(value.geo) && !Array.isArray(value.geo)
}

function normalizeMultiFormatOutput(payload: unknown): MultiFormatOutput {
  if (!isRecord(payload)) {
    throw new Error('Multi-format payload must be an object')
  }

  const medium = isRecord(payload.medium) ? payload.medium : {}
  const newsletter = isRecord(payload.newsletter) ? payload.newsletter : {}

  const normalized = {
    blog: typeof payload.blog === 'string' ? payload.blog.trim() : '',
    linkedin: typeof payload.linkedin === 'string' ? payload.linkedin.trim() : '',
    medium: {
      article: typeof medium.article === 'string' ? medium.article.trim() : '',
      subtitle: typeof medium.subtitle === 'string' ? medium.subtitle.trim() : '',
    },
    newsletter: {
      subjectLine: typeof newsletter.subjectLine === 'string' ? newsletter.subjectLine.trim() : '',
      previewText: typeof newsletter.previewText === 'string' ? newsletter.previewText.trim() : '',
      body: typeof newsletter.body === 'string' ? newsletter.body.trim() : '',
      plainText: typeof newsletter.plainText === 'string' ? newsletter.plainText.trim() : '',
    },
  }

  if (
    !normalized.blog
    || !normalized.linkedin
    || !normalized.medium.article
    || !normalized.medium.subtitle
    || !normalized.newsletter.subjectLine
    || !normalized.newsletter.previewText
    || !normalized.newsletter.body
    || !normalized.newsletter.plainText
  ) {
    throw new Error('Multi-format payload missing required fields')
  }

  return normalized
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

    let body: MultiFormatRequestBody
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

    const prompt = getMultiFormatPrompt(sanitizedArticle, seoGeo, sanitizedTone)

    let output: MultiFormatOutput
    try {
      const responseText = await createMessage({
        maxTokens: MAX_MULTI_FORMAT_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      })

      output = normalizeMultiFormatOutput(extractJsonPayload(responseText || '{}'))
    } catch {
      return NextResponse.json(
        { error: { code: 'multi_format_error', message: 'Failed to generate multi-format output' } },
        { status: 500 }
      )
    }

    const assetsToSave = [
      {
        session_id: resolvedSessionId,
        asset_type: 'dd_blog',
        content: {
          markdown: output.blog,
          wordCount: getWordCount(output.blog),
        },
      },
      {
        session_id: resolvedSessionId,
        asset_type: 'dd_linkedin',
        content: {
          article: output.linkedin,
        },
      },
      {
        session_id: resolvedSessionId,
        asset_type: 'dd_medium',
        content: output.medium,
      },
      {
        session_id: resolvedSessionId,
        asset_type: 'dd_newsletter',
        content: output.newsletter,
      },
    ]

    const { data: savedAssets, error: saveError } = await supabase
      .from('content_assets')
      .insert(assetsToSave)
      .select('*')

    if (saveError || !savedAssets || savedAssets.length !== 4) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save multi-format assets' } },
        { status: 500 }
      )
    }

    const assetsByType = Object.fromEntries(
      savedAssets.map((row) => [row.asset_type, mapAssetRowToContentAsset(row)])
    ) as Record<string, ReturnType<typeof mapAssetRowToContentAsset>>

    return NextResponse.json(
      {
        data: {
          sessionId: resolvedSessionId,
          blog: assetsByType.dd_blog,
          linkedin: assetsByType.dd_linkedin,
          medium: assetsByType.dd_medium,
          newsletter: assetsByType.dd_newsletter,
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
