import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import {
  getSocialRegeneratePrompt,
  SOCIAL_ASSET_TYPE_BY_KEY,
  SOCIAL_PLATFORM_KEYS,
  type SocialPlatform,
  type SocialOutput,
} from '@/lib/prompts/social'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

type RegenerateRequestBody = {
  platform?: unknown
  blog?: unknown
  seo?: unknown
  sessionId?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function parseJsonPayload(raw: string): unknown {
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

function normalizePlatform(platform: unknown): SocialPlatform | null {
  if (typeof platform !== 'string') {
    return null
  }

  return SOCIAL_PLATFORM_KEYS.includes(platform as SocialPlatform) ? (platform as SocialPlatform) : null
}

function normalizePlatformOutput(platform: SocialPlatform, payload: unknown): SocialOutput[SocialPlatform] {
  const data = isRecord(payload) ? payload : {}

  if (platform === 'x') {
    return {
      tweet: typeof data.tweet === 'string' ? data.tweet : '',
      thread: asStringArray(data.thread),
      hooks: asStringArray(data.hooks),
      replies: asStringArray(data.replies),
    }
  }

  if (platform === 'linkedin') {
    return {
      storytelling: typeof data.storytelling === 'string' ? data.storytelling : '',
      authority: typeof data.authority === 'string' ? data.authority : '',
      carousel: typeof data.carousel === 'string' ? data.carousel : '',
    }
  }

  if (platform === 'instagram') {
    return {
      carouselCaptions: asStringArray(data.carouselCaptions),
      reelCaption: typeof data.reelCaption === 'string' ? data.reelCaption : '',
      hooks: asStringArray(data.hooks),
      cta: typeof data.cta === 'string' ? data.cta : '',
    }
  }

  if (platform === 'medium') {
    return {
      article: typeof data.article === 'string' ? data.article : '',
      canonicalSuggestion: typeof data.canonicalSuggestion === 'string' ? data.canonicalSuggestion : '',
    }
  }

  if (platform === 'reddit') {
    return {
      post: typeof data.post === 'string' ? data.post : '',
      subreddits: asStringArray(data.subreddits),
      questions: asStringArray(data.questions),
    }
  }

  if (platform === 'newsletter') {
    return {
      subjectLines: asStringArray(data.subjectLines),
      body: typeof data.body === 'string' ? data.body : '',
      cta: typeof data.cta === 'string' ? data.cta : '',
    }
  }

  return {
    pins: Array.isArray(data.pins)
      ? data.pins
          .filter((pin): pin is Record<string, unknown> => isRecord(pin))
          .map((pin) => ({
            title: typeof pin.title === 'string' ? pin.title : '',
            description: typeof pin.description === 'string' ? pin.description : '',
            keywords: asStringArray(pin.keywords),
          }))
      : [],
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

    let body: RegenerateRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const platform = normalizePlatform(body.platform)
    const blog = typeof body.blog === 'string' ? body.blog.trim() : ''
    const seo = isRecord(body.seo)
      ? (sanitizeUnknown(body.seo) as Record<string, unknown>)
      : null

    if (!platform || !blog || !seo) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(!platform ? [{ field: 'platform', message: 'Valid platform is required' }] : []),
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

    const prompt = getSocialRegeneratePrompt(platform, sanitizedBlog, seo)

    const responseText = await createMessage({
      maxTokens: 1400,
      messages: [{ role: 'user', content: prompt }],
    }) || '{}'
    const rawPayload = parseJsonPayload(responseText)
    const payloadObject = isRecord(rawPayload) ? rawPayload : {}
    const platformSource = isRecord(payloadObject[platform]) ? payloadObject[platform] : payloadObject

    const platformPayload = normalizePlatformOutput(platform, platformSource)

    const { data: savedAsset, error: saveError } = await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: SOCIAL_ASSET_TYPE_BY_KEY[platform],
      content: {
        platform,
        ...platformPayload,
      },
    })
      .select('*')
      .single()

    if (saveError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save social asset' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          sessionId,
          platform,
          content: platformPayload,
          asset: savedAsset ? mapAssetRowToContentAsset(savedAsset) : null,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Social regenerate API error:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
