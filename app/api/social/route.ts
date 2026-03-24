import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { claude } from '@/lib/claude'
import {
  getSocialPrompt,
  SOCIAL_ASSET_TYPE_BY_KEY,
  SOCIAL_PLATFORM_KEYS,
  type SocialOutput,
  type SocialPlatform,
} from '@/lib/prompts/social'

type SocialRequestBody = {
  blog?: unknown
  seo?: unknown
  platforms?: unknown
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
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

function normalizeSocialOutput(payload: unknown): SocialOutput {
  if (!isRecord(payload)) {
    throw new Error('Social output must be an object')
  }

  const x = isRecord(payload.x) ? payload.x : {}
  const linkedin = isRecord(payload.linkedin) ? payload.linkedin : {}
  const instagram = isRecord(payload.instagram) ? payload.instagram : {}
  const medium = isRecord(payload.medium) ? payload.medium : {}
  const reddit = isRecord(payload.reddit) ? payload.reddit : {}
  const newsletter = isRecord(payload.newsletter) ? payload.newsletter : {}
  const pinterest = isRecord(payload.pinterest) ? payload.pinterest : {}
  const extras = isRecord(payload.extras) ? payload.extras : {}

  const normalizedPins = Array.isArray(pinterest.pins)
    ? pinterest.pins
        .filter((pin): pin is Record<string, unknown> => isRecord(pin))
        .map((pin) => ({
          title: typeof pin.title === 'string' ? pin.title : '',
          description: typeof pin.description === 'string' ? pin.description : '',
          keywords: asStringArray(pin.keywords),
        }))
    : []

  return {
    x: {
      tweet: typeof x.tweet === 'string' ? x.tweet : '',
      thread: asStringArray(x.thread),
      hooks: asStringArray(x.hooks),
      replies: asStringArray(x.replies),
    },
    linkedin: {
      storytelling: typeof linkedin.storytelling === 'string' ? linkedin.storytelling : '',
      authority: typeof linkedin.authority === 'string' ? linkedin.authority : '',
      carousel: typeof linkedin.carousel === 'string' ? linkedin.carousel : '',
    },
    instagram: {
      carouselCaptions: asStringArray(instagram.carouselCaptions),
      reelCaption: typeof instagram.reelCaption === 'string' ? instagram.reelCaption : '',
      hooks: asStringArray(instagram.hooks),
      cta: typeof instagram.cta === 'string' ? instagram.cta : '',
    },
    medium: {
      article: typeof medium.article === 'string' ? medium.article : '',
      canonicalSuggestion:
        typeof medium.canonicalSuggestion === 'string' ? medium.canonicalSuggestion : '',
    },
    reddit: {
      post: typeof reddit.post === 'string' ? reddit.post : '',
      subreddits: asStringArray(reddit.subreddits),
      questions: asStringArray(reddit.questions),
    },
    newsletter: {
      subjectLines: asStringArray(newsletter.subjectLines),
      body: typeof newsletter.body === 'string' ? newsletter.body : '',
      cta: typeof newsletter.cta === 'string' ? newsletter.cta : '',
    },
    pinterest: {
      pins: normalizedPins,
    },
    extras: {
      quotes: asStringArray(extras.quotes),
      discussionQuestions: asStringArray(extras.discussionQuestions),
      miniPosts: asStringArray(extras.miniPosts),
    },
  }
}

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
    const seo = isRecord(body.seo) ? body.seo : null
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
          input_data: { article: blog },
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

    const prompt = getSocialPrompt(blog, seo, platforms)

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
    const social = normalizeSocialOutput(extractJsonPayload(responseText))

    const assetsToSave = SOCIAL_OUTPUT_KEYS.map((key) => ({
      session_id: sessionId,
      asset_type: SOCIAL_ASSET_TYPE_BY_KEY[key],
      content: {
        platform: key,
        ...social[key],
      },
    }))

    const { error: saveError } = await supabase.from('content_assets').insert(assetsToSave)
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
