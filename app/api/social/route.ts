import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import { extractJsonPayload } from '@/lib/extract-json'
import { isRecord } from '@/lib/type-guards'
import { normalizeSocialOutput } from '@/lib/social-normalize'
import {
  getSocialPrompt,
  SOCIAL_ASSET_TYPE_BY_KEY,
  SOCIAL_PLATFORM_KEYS,
  type SocialOutput,
  type SocialPlatform,
} from '@/lib/prompts/social'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

type SocialRequestBody = {
  blog?: unknown
  seo?: unknown
  platforms?: unknown
  sessionId?: unknown
}

const SOCIAL_OUTPUT_KEYS = [
  'x',
  'linkedin',
  'instagram',
  'medium',
  'reddit',
  'newsletter',
  'pinterest',
  'extras',
] as const

function normalizePlatforms(value: unknown): SocialPlatform[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [...SOCIAL_PLATFORM_KEYS]
  }

  const unique = new Set<SocialPlatform>()
  for (const item of value) {
    if (typeof item === 'string' && SOCIAL_PLATFORM_KEYS.includes(item as SocialPlatform)) {
      unique.add(item as SocialPlatform)
    }
  }

  return unique.size > 0 ? Array.from(unique) : [...SOCIAL_PLATFORM_KEYS]
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

    let body: SocialRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const blog = typeof body.blog === 'string' ? body.blog.trim() : ''
    const seo = isRecord(body.seo)
      ? (sanitizeUnknown(body.seo) as Record<string, unknown>)
      : null
    const platforms = normalizePlatforms(body.platforms)

    if (!blog || !seo) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(!blog ? [{ field: 'blog', message: 'Blog content is required' }] : []),
              ...(!seo ? [{ field: 'seo', message: 'SEO object is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const sanitizedBlog = sanitizeInput(blog)

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'upload',
        fallbackInputData: { article: sanitizedBlog },
      })
    } catch (sessionError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: sessionError instanceof Error ? sessionError.message : 'Failed to resolve session' } },
        { status: 500 },
      )
    }

    const prompt = getSocialPrompt(sanitizedBlog, seo, platforms)

    const responseText = await createMessage({
      maxTokens: 3200,
      messages: [{ role: 'user', content: prompt }],
    }) || '{}'
    const social = normalizeSocialOutput(extractJsonPayload(responseText))

    const assetsToSave = SOCIAL_OUTPUT_KEYS.map((key) => ({
      session_id: sessionId,
      asset_type: SOCIAL_ASSET_TYPE_BY_KEY[key],
      content: {
        platform: key,
        ...social[key],
      },
    }))

    const { data: savedAssets, error: saveError } = await supabase
      .from('content_assets')
      .insert(assetsToSave)
      .select('*')
    if (saveError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save social assets' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          sessionId,
          platforms,
          social,
          assets: (savedAssets ?? []).map(mapAssetRowToContentAsset),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Social API error:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
