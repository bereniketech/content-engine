import { NextRequest, NextResponse } from 'next/server'
import { streamMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { sanitizeInput } from '@/lib/sanitize'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

export async function POST(request: NextRequest) {
  try {
    try {
      await requireAuth(request)
    } catch {
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

    const sectionTitle = typeof body.sectionTitle === 'string' ? body.sectionTitle.trim() : ''
    const context = typeof body.context === 'string' ? body.context.trim() : ''
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''

    if (!sectionTitle || !context) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...((!sectionTitle)
                ? [{ field: 'sectionTitle', message: 'Section title is required' }]
                : []),
              ...((!context) ? [{ field: 'context', message: 'Context is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const safeSectionTitle = sanitizeInput(sectionTitle)
    const safeContext = sanitizeInput(context)
    const safeTopic = sanitizeInput(topic)

    // Create the expand prompt
    const expandPrompt = `You are a blog content expert. Regenerate ONLY the "${safeSectionTitle}" section for an article about "${safeTopic || 'this topic'}".

Context (for reference):
  ${safeContext}

Requirements:
- Write 300-500 words for this section
- Start with ## ${safeSectionTitle} (H2 heading)
- Include 2-3 practical examples or tips
- Use bullet points or numbered lists where appropriate
- End with a transitional sentence or call-to-action
- Maintain the same tone and style as the context provided
- Use markdown formatting (bold for emphasis, bullet points, etc.)
- Do not write any other section title

Return ONLY the markdown section. No explanations, no code blocks, no additional text.`

    const encoder = new TextEncoder()

    // Create streaming response
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let fullMarkdown = ''

          // Stream AI response
          for await (const chunk of streamMessage({
            maxTokens: 1000,
            messages: [{ role: 'user', content: expandPrompt }],
          })) {
            fullMarkdown += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, markdown: fullMarkdown })}\n\n`)
          )
          controller.close()
        } catch (error) {
          console.error('Error initializing stream:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Failed to stream section expansion' })}\n\n`)
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
      },
    })
  } catch (error) {
    console.error('Error in blog expand API:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
