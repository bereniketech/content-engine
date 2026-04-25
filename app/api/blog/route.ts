import { NextRequest, NextResponse } from 'next/server'
import { getBlogPrompt } from '@/lib/prompts/blog'
import { streamMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import { getWordCount } from '@/lib/utils'
import { VALIDATION_CONSTANTS } from '@/lib/validation'
import { TOPIC_TONES } from '@/types'
import type { SeoResult } from '@/types'
import type { TopicTone } from '@/types'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

interface ResearchOutput {
  intent: 'informational' | 'commercial' | 'transactional'
  demand: 'high' | 'medium' | 'low'
  trend: 'rising' | 'stable' | 'declining'
  keywords: string[]
  faqs: Array<{ question: string; answer: string }>
  competitors: Array<{ name: string; url: string; strength: string }>
  gaps: string[]
  alternatives?: string[]
}

function normalizeTone(value: unknown): TopicTone {
  if (typeof value === 'string' && TOPIC_TONES.includes(value as TopicTone)) {
    return value as TopicTone
  }
  return 'authority'
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

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const rawTopic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const seo = sanitizeUnknown(body.seo)
    const research = sanitizeUnknown(body.research)
    const tone = normalizeTone(body.tone)

    if (!rawTopic || !seo || !research || rawTopic.length < VALIDATION_CONSTANTS.MIN_TOPIC_LENGTH) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(!rawTopic ? [{ field: 'topic', message: 'Topic is required' }] : []),
              ...(rawTopic && rawTopic.length < VALIDATION_CONSTANTS.MIN_TOPIC_LENGTH ? [{ field: 'topic', message: 'Topic must be at least 6 characters' }] : []),
              ...(!seo ? [{ field: 'seo', message: 'SEO data is required' }] : []),
              ...(!research ? [{ field: 'research', message: 'Research data is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const topic = sanitizeInput(rawTopic)

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'topic',
        fallbackInputData: { topic, tone },
      })
    } catch (sessionError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: sessionError instanceof Error ? sessionError.message : 'Failed to resolve session' } },
        { status: 500 },
      )
    }

    // Get blog prompt
    const prompt = getBlogPrompt(topic, seo as SeoResult, research as ResearchOutput, tone as TopicTone)

    // Create streaming response
    const encoder = new TextEncoder()

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let fullMarkdown = ''

          // Stream AI response
          for await (const chunk of streamMessage({
            maxTokens: 4000,
            messages: [{ role: 'user', content: prompt }],
          })) {
            fullMarkdown += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
          }

          const { data: savedAsset, error: assetError } = await supabase.from('content_assets').insert({
            session_id: sessionId,
            asset_type: 'blog',
            content: {
              topic,
              tone,
              markdown: fullMarkdown,
              wordCount: getWordCount(fullMarkdown),
            },
          })
            .select('*')
            .single()

          if (assetError) {
            console.error('Error saving blog to database:', assetError)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Failed to save blog' })}\n\n`)
            )
            controller.close()
            return
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                wordCount: getWordCount(fullMarkdown),
                asset: savedAsset ? mapAssetRowToContentAsset(savedAsset) : undefined,
              })}\n\n`
            )
          )
          controller.close()
        } catch (error) {
          console.error('Error initializing stream:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to stream blog content' })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in blog API:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
