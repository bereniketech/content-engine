import { NextRequest, NextResponse } from 'next/server'
import { claude } from '@/lib/claude'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import {
  getImagesPrompt,
  IMAGE_STYLES,
  type ImagePromptsOutput,
  type ImageStyle,
} from '@/lib/prompts/images'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStyle(value: unknown): ImageStyle {
  if (typeof value === 'string' && IMAGE_STYLES.includes(value as ImageStyle)) {
    return value as ImageStyle
  }
  return 'realistic'
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

function normalizeImagePrompts(payload: unknown): ImagePromptsOutput {
  if (!isRecord(payload)) {
    throw new Error('Image prompts output must be an object')
  }

  const sections = Array.isArray(payload.sections)
    ? payload.sections
        .filter((s): s is string => typeof s === 'string')
        .slice(0, 3)
    : []

  return {
    hero: typeof payload.hero === 'string' ? payload.hero : '',
    sections,
    infographic: typeof payload.infographic === 'string' ? payload.infographic : '',
    social: typeof payload.social === 'string' ? payload.social : '',
    pinterest: typeof payload.pinterest === 'string' ? payload.pinterest : '',
  }
}

function buildBlogSummary(blog: unknown): string {
  if (typeof blog === 'string') {
    return blog.slice(0, 800)
  }
  if (isRecord(blog)) {
    const title = typeof blog.title === 'string' ? blog.title : ''
    const intro = typeof blog.intro === 'string' ? blog.intro : ''
    return `${title}\n\n${intro}`.slice(0, 800)
  }
  return ''
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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const blog = body.blog ?? null
    const style = normalizeStyle(body.style)

    if (!topic || !blog) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(!topic ? [{ field: 'topic', message: 'Topic is required' }] : []),
              ...(!blog ? [{ field: 'blog', message: 'Blog content is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const sanitizedTopic = sanitizeInput(topic)
    const sanitizedBlog = sanitizeUnknown(blog)
    const blogSummary = sanitizeInput(buildBlogSummary(sanitizedBlog))
    const prompt = getImagesPrompt(sanitizedTopic, blogSummary, style)

    const claudeResponse = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText =
      claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''

    let images: ImagePromptsOutput
    try {
      const parsed = extractJsonPayload(rawText)
      images = normalizeImagePrompts(parsed)
    } catch {
      return NextResponse.json(
        { error: { code: 'parse_error', message: 'Failed to parse Claude response as JSON' } },
        { status: 502 }
      )
    }

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'topic',
        fallbackInputData: { topic: sanitizedTopic },
      })
    } catch (sessionError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: sessionError instanceof Error ? sessionError.message : 'Failed to resolve session' } },
        { status: 500 },
      )
    }

    const { data: savedAsset, error: saveError } = await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'images',
      content: { style, ...images },
    })
      .select('*')
      .single()

    if (saveError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save image prompts' } },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { data: { sessionId, style, images, asset: mapAssetRowToContentAsset(savedAsset) } },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: { code: 'server_error', message } },
      { status: 500 }
    )
  }
}

