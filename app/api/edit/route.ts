import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth'

type EditAction = 'rewrite' | 'expand' | 'shorten' | 'change_tone' | 'fix_seo' | 'add_stat'

interface ArticleContext {
  title: string
  keyword: string
  audience: string
}

function buildPrompt(
  paragraph: string,
  action: EditAction,
  tone: string | undefined,
  ctx: ArticleContext
): string {
  switch (action) {
    case 'rewrite':
      return `Rewrite this paragraph in a more engaging way:\n\n${paragraph}`
    case 'expand':
      return `Expand this paragraph with more detail and examples:\n\n${paragraph}`
    case 'shorten':
      return `Shorten this paragraph to its essential point:\n\n${paragraph}`
    case 'change_tone':
      return `Rewrite in a ${tone ?? 'professional'} tone:\n\n${paragraph}`
    case 'fix_seo':
      return `Rewrite this paragraph to naturally include the keyword "${ctx.keyword}" and improve SEO:\n\n${paragraph}`
    case 'add_stat':
      return `Add a relevant statistic or data point to this paragraph:\n\n${paragraph}`
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)
  } catch {
    return new Response(
      JSON.stringify({ error: { code: 'unauthorized', message: 'Authentication required' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return new Response(
      JSON.stringify({ error: { code: 'validation_error', message: 'Invalid JSON body' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { paragraph, action, tone, articleContext } = body as {
    paragraph?: unknown
    action?: unknown
    tone?: unknown
    articleContext?: unknown
  }

  if (!paragraph || typeof paragraph !== 'string' || paragraph.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: { code: 'validation_error', message: 'paragraph is required' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const validActions = new Set(['rewrite', 'expand', 'shorten', 'change_tone', 'fix_seo', 'add_stat'])
  if (!action || typeof action !== 'string' || !validActions.has(action)) {
    return new Response(
      JSON.stringify({ error: { code: 'validation_error', message: 'valid action is required' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const ctx: ArticleContext = {
    title: ((articleContext as Record<string, unknown> | undefined)?.title as string) ?? '',
    keyword: ((articleContext as Record<string, unknown> | undefined)?.keyword as string) ?? '',
    audience: ((articleContext as Record<string, unknown> | undefined)?.audience as string) ?? '',
  }

  const prompt = buildPrompt(paragraph, action as EditAction, tone as string | undefined, ctx)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        })

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`)
            )
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`
          )
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
