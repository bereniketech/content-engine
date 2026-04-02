import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { getSeoGeoPrompt } from '@/lib/prompts/seo-geo'
import { sanitizeInput } from '@/lib/sanitize'
import { resolveSessionId } from '@/lib/session-assets'
import type { SeoGeoResult } from '@/types'

type SeoGeoRequestBody = {
  article?: unknown
  sessionId?: unknown
}

const MAX_ARTICLE_LENGTH = 120000
const MAX_SEO_GEO_TOKENS = 4000
const REQUIRED_SECONDARY_KEYWORDS = 5
const REQUIRED_FAQ_ITEMS = 3
const SESSION_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
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

    const objectStart = trimmed.indexOf('{')
    if (objectStart >= 0) {
      let depth = 0
      let inString = false
      let isEscaped = false

      for (let index = objectStart; index < trimmed.length; index += 1) {
        const char = trimmed[index]

        if (char === '"' && !isEscaped) {
          inString = !inString
        }

        if (!inString && char === '{') {
          depth += 1
        }

        if (!inString && char === '}') {
          depth -= 1
          if (depth === 0) {
            return JSON.parse(trimmed.slice(objectStart, index + 1))
          }
        }

        isEscaped = char === '\\' && !isEscaped
      }
    }

    throw new Error('SEO+GEO response did not contain valid JSON')
  }
}

function normalizeSeoGeoResult(payload: unknown): SeoGeoResult {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('SEO+GEO payload must be a JSON object')
  }

  const raw = payload as {
    seo?: unknown
    geo?: unknown
  }

  if (typeof raw.seo !== 'object' || raw.seo === null) {
    throw new Error('SEO+GEO payload missing seo object')
  }

  if (typeof raw.geo !== 'object' || raw.geo === null) {
    throw new Error('SEO+GEO payload missing geo object')
  }

  const seo = raw.seo as {
    title?: unknown
    metaDescription?: unknown
    slug?: unknown
    primaryKeyword?: unknown
    secondaryKeywords?: unknown
    headingStructure?: unknown
    faqSchema?: unknown
    seoScore?: unknown
  }

  const geo = raw.geo as {
    citationOptimization?: unknown
    entityMarking?: unknown
    conciseAnswers?: unknown
    structuredClaims?: unknown
    sourceAttribution?: unknown
  }

  const headingStructureRaw =
    typeof seo.headingStructure === 'object' && seo.headingStructure !== null
      ? (seo.headingStructure as { h2?: unknown; h3?: unknown })
      : undefined

  const faqSchema = Array.isArray(seo.faqSchema)
    ? seo.faqSchema
        .filter(
          (item): item is { question: string; answer: string } =>
            typeof item === 'object'
            && item !== null
            && typeof (item as { question?: unknown }).question === 'string'
            && typeof (item as { answer?: unknown }).answer === 'string'
        )
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        }))
    : []

  const entityMarking = Array.isArray(geo.entityMarking)
    ? geo.entityMarking
        .filter(
          (item): item is { entity: string; description: string } =>
            typeof item === 'object'
            && item !== null
            && typeof (item as { entity?: unknown }).entity === 'string'
            && typeof (item as { description?: unknown }).description === 'string'
        )
        .map((item) => ({
          entity: item.entity.trim(),
          description: item.description.trim(),
        }))
    : []

  const conciseAnswers = Array.isArray(geo.conciseAnswers)
    ? geo.conciseAnswers
        .filter(
          (item): item is { question: string; answer: string } =>
            typeof item === 'object'
            && item !== null
            && typeof (item as { question?: unknown }).question === 'string'
            && typeof (item as { answer?: unknown }).answer === 'string'
        )
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        }))
    : []

  const seoResult = {
    title: typeof seo.title === 'string' ? seo.title.trim() : '',
    metaDescription: typeof seo.metaDescription === 'string' ? seo.metaDescription.trim() : '',
    slug: typeof seo.slug === 'string' ? seo.slug.trim() : '',
    primaryKeyword: typeof seo.primaryKeyword === 'string' ? seo.primaryKeyword.trim() : '',
    secondaryKeywords: asStringArray(seo.secondaryKeywords),
    headingStructure: {
      h2: asStringArray(headingStructureRaw?.h2),
      h3: asStringArray(headingStructureRaw?.h3),
    },
    faqSchema,
    seoScore:
      typeof seo.seoScore === 'number' && Number.isFinite(seo.seoScore)
        ? Math.max(0, Math.min(100, Math.round(seo.seoScore)))
        : 0,
  }

  const geoResult = {
    citationOptimization: asStringArray(geo.citationOptimization),
    entityMarking,
    conciseAnswers,
    structuredClaims: asStringArray(geo.structuredClaims),
    sourceAttribution:
      typeof geo.sourceAttribution === 'string' ? geo.sourceAttribution.trim() : '',
  }

  if (
    !seoResult.title
    || !seoResult.metaDescription
    || !seoResult.slug
    || !seoResult.primaryKeyword
    || seoResult.secondaryKeywords.length !== REQUIRED_SECONDARY_KEYWORDS
    || seoResult.faqSchema.length < REQUIRED_FAQ_ITEMS
  ) {
    throw new Error('SEO+GEO payload missing required SEO fields')
  }

  if (
    geoResult.citationOptimization.length === 0
    || geoResult.entityMarking.length === 0
    || geoResult.conciseAnswers.length === 0
    || geoResult.structuredClaims.length === 0
    || !geoResult.sourceAttribution
  ) {
    throw new Error('SEO+GEO payload missing required GEO fields')
  }

  return {
    seo: seoResult,
    geo: geoResult,
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

    let body: SeoGeoRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const article = typeof body.article === 'string' ? body.article.trim() : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''

    if (!article || !sessionId) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(!article ? [{ field: 'article', message: 'article is required' }] : []),
              ...(!sessionId ? [{ field: 'sessionId', message: 'sessionId is required' }] : []),
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

    if (article.length > MAX_ARTICLE_LENGTH) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              {
                field: 'article',
                message: `article must be ${MAX_ARTICLE_LENGTH} characters or fewer`,
              },
            ],
          },
        },
        { status: 400 }
      )
    }

    const sanitizedArticle = sanitizeInput(article)

    let resolvedSessionId: string
    try {
      resolvedSessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: sessionId,
        fallbackInputType: 'data-driven',
        fallbackInputData: {
          sourceText: sanitizedArticle.slice(0, 2000),
          tone: 'neutral',
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
        {
          error: {
            code: 'storage_error',
            message: 'Failed to resolve session',
          },
        },
        { status: 500 }
      )
    }

    const prompt = getSeoGeoPrompt(sanitizedArticle)

    let seoGeoResult: SeoGeoResult
    try {
      const responseText = await createMessage({
        maxTokens: MAX_SEO_GEO_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      })

      seoGeoResult = normalizeSeoGeoResult(extractJsonPayload(responseText || '{}'))
    } catch {
      return NextResponse.json(
        { error: { code: 'seo_geo_error', message: 'Failed to generate SEO+GEO output' } },
        { status: 500 }
      )
    }

    const { data: savedAsset, error: saveError } = await supabase
      .from('content_assets')
      .insert({
        session_id: resolvedSessionId,
        asset_type: 'dd_seo_geo',
        content: seoGeoResult,
      })
      .select('*')
      .single()

    if (saveError || !savedAsset) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save SEO+GEO asset' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          id: savedAsset.id,
          sessionId: savedAsset.session_id,
          assetType: savedAsset.asset_type,
          content: savedAsset.content,
          version: savedAsset.version,
          createdAt: savedAsset.created_at,
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
