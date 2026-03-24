import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getBlogPrompt } from '@/lib/prompts/blog'
import { claude } from '@/lib/claude'
import type { SeoResult } from '@/app/api/seo/route'
import type { TopicTone } from '@/types'

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

export async function POST(request: NextRequest) {
  try {
    // Get Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: { code: 'server_error', message: 'Missing server configuration' } },
        { status: 500 }
      )
    }

    // Create server client with service key for RLS bypass
    const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // No-op for server client, cookies already managed by middleware
        },
      },
    })

    // Get user from Supabase auth via middleware
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

    const { topic, seo, research, tone = 'authority' } = body

    if (!topic?.trim() || !seo || !research) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...((!topic?.trim()) ? [{ field: 'topic', message: 'Topic is required' }] : []),
              ...(!seo ? [{ field: 'seo', message: 'SEO data is required' }] : []),
              ...(!research ? [{ field: 'research', message: 'Research data is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    // Get or create session
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let sessionId: string
    if (!sessionData) {
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          input_type: 'topic',
          input_data: { topic, tone },
        })
        .select('id')
        .single()

      sessionId = newSession?.id || ''
    } else {
      sessionId = sessionData.id
    }

    // Get blog prompt
    const prompt = getBlogPrompt(topic, seo as SeoResult, research as ResearchOutput, tone as TopicTone)

    // Create streaming response
    const readable = new ReadableStream<string>({
      async start(controller) {
        try {
          let fullMarkdown = ''

          // Call Claude with streaming
          const stream = await claude.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          })

          // Pipe text events to the stream
          stream.on('text', (text) => {
            fullMarkdown += text
            // Send text chunk as SSE
            controller.enqueue(`data: ${JSON.stringify({ text })}\n\n`)
          })

          // On stream completion, save to database
          stream.on('end', async () => {
            try {
              // Save to content_assets
              await supabase.from('content_assets').insert({
                session_id: sessionId,
                asset_type: 'blog',
                content: {
                  topic,
                  tone,
                  markdown: fullMarkdown,
                  wordCount: fullMarkdown.split(/\s+/).length,
                },
              })

              // Send final event with completion status
              controller.enqueue(`data: ${JSON.stringify({ done: true, markdown: fullMarkdown })}\n\n`)
            } catch (dbError) {
              console.error('Error saving blog to database:', dbError)
              controller.enqueue(`data: ${JSON.stringify({ error: 'Failed to save blog' })}\n\n`)
            }

            controller.close()
          })

          stream.on('error', (error) => {
            console.error('Stream error:', error)
            controller.enqueue(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
            controller.close()
          })
        } catch (error) {
          console.error('Error initializing stream:', error)
          controller.enqueue(
            `data: ${JSON.stringify({ error: 'Failed to initialize stream' })}\n\n`
          )
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
        'Access-Control-Allow-Origin': '*',
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
