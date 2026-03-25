import { NextRequest, NextResponse } from 'next/server'
import { getBlogPrompt } from '@/lib/prompts/blog'
import { claude } from '@/lib/claude'
import { createSupabaseUserClient, requireAuth } from '@/lib/auth'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import type { SeoResult } from '@/app/api/seo/route'
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

const VALID_TONES: TopicTone[] = ['authority', 'casual', 'storytelling']

function normalizeTone(value: unknown): TopicTone {
  if (typeof value === 'string' && VALID_TONES.includes(value as TopicTone)) {
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

    const { user, token } = auth
    const supabase = createSupabaseUserClient(token)

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

    if (!rawTopic || !seo || !research) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(!rawTopic ? [{ field: 'topic', message: 'Topic is required' }] : []),
              ...(!seo ? [{ field: 'seo', message: 'SEO data is required' }] : []),
              ...(!research ? [{ field: 'research', message: 'Research data is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const topic = sanitizeInput(rawTopic)

    // Get or create session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let sessionId: string
    if (sessionError || !sessionData) {
      const { data: newSession, error: createSessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          input_type: 'topic',
          input_data: { topic, tone },
        })
        .select('id')
        .single()

      if (createSessionError || !newSession) {
        return NextResponse.json(
          { error: { code: 'storage_error', message: 'Failed to create session' } },
          { status: 500 }
        )
      }

      sessionId = newSession.id
    } else {
      sessionId = sessionData.id
    }

    // Get blog prompt
    const prompt = getBlogPrompt(topic, seo as SeoResult, research as ResearchOutput, tone as TopicTone)

    // Create streaming response
    const encoder = new TextEncoder()

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let fullMarkdown = ''

          // Call Claude with streaming
          const stream = claude.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          })

          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = event.delta.text
              fullMarkdown += chunk
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
            }
          }

          const { error: assetError } = await supabase.from('content_assets').insert({
            session_id: sessionId,
            asset_type: 'blog',
            content: {
              topic,
              tone,
              markdown: fullMarkdown,
              wordCount: fullMarkdown.trim().split(/\s+/).filter(Boolean).length,
            },
          })

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
              `data: ${JSON.stringify({ done: true, wordCount: fullMarkdown.trim().split(/\s+/).filter(Boolean).length })}\n\n`
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
