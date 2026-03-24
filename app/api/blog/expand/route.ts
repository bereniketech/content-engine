import { NextRequest, NextResponse } from 'next/server'
import { claude } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
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

    const { sectionTitle, context, topic } = body

    if (!sectionTitle?.trim() || !context?.trim()) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...((!sectionTitle?.trim())
                ? [{ field: 'sectionTitle', message: 'Section title is required' }]
                : []),
              ...((!context?.trim()) ? [{ field: 'context', message: 'Context is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    // Create the expand prompt
    const expandPrompt = `You are a blog content expert. Regenerate ONLY the "${sectionTitle}" section for an article about "${topic || 'this topic'}".

Context (for reference):
${context}

Requirements:
- Write 300-500 words for this section
- Start with ## ${sectionTitle} (H2 heading)
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

          // Call Claude with streaming
          const stream = claude.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [
              {
                role: 'user',
                content: expandPrompt,
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
