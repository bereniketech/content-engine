import { NextRequest, NextResponse } from 'next/server'
import { streamMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { parsePdf } from '@/lib/pdf-parse'
import { getDataDrivenArticlePrompt } from '@/lib/prompts/data-driven-article'
import { mapAssetRowToContentAsset, resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import { getWordCount } from '@/lib/utils'

interface ParsedArticleInput {
  sourceText?: string
  researchData?: string
  providedSessionId?: unknown
}

type InputParseErrorCode = 'INVALID_JSON' | 'INVALID_PDF'

interface InputParseError extends Error {
  code: InputParseErrorCode
}

const MAX_SOURCE_TEXT_LENGTH = 80000
const MAX_RESEARCH_TEXT_LENGTH = 40000
const PDF_TRUNCATION_NOTE = '[Note: PDF text was truncated due to length limits.]'
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const

function sanitizeOptionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  return sanitizeInput(trimmed).slice(0, maxLength)
}

function serializeResearchData(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return undefined
    }

    return sanitizeInput(trimmed).slice(0, MAX_RESEARCH_TEXT_LENGTH)
  }

  if (value === null || value === undefined) {
    return undefined
  }

  const sanitizedValue = sanitizeUnknown(value)
  const serialized = JSON.stringify(sanitizedValue)

  if (!serialized || serialized === '{}') {
    return undefined
  }

  return serialized.slice(0, MAX_RESEARCH_TEXT_LENGTH)
}

function createInputParseError(code: InputParseErrorCode, message: string): InputParseError {
  const error = new Error(message) as InputParseError
  error.code = code
  return error
}

function isInputParseError(error: unknown): error is InputParseError {
  return (
    error instanceof Error
    && 'code' in error
    && (error as InputParseError).code !== undefined
  )
}

async function parseArticleInput(request: NextRequest): Promise<ParsedArticleInput> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const sourceText = sanitizeOptionalText(formData.get('sourceText'), MAX_SOURCE_TEXT_LENGTH)
    const researchData = serializeResearchData(formData.get('researchData'))
    const providedSessionId = formData.get('sessionId')
    const uploadCandidate = formData.get('file') ?? formData.get('pdf')

    if (uploadCandidate instanceof File) {
      let parsed
      try {
        parsed = await parsePdf(Buffer.from(await uploadCandidate.arrayBuffer()))
      } catch (error) {
        throw createInputParseError(
          'INVALID_PDF',
          error instanceof Error ? error.message : 'Unable to parse PDF upload'
        )
      }

      const parsedSourceText = sanitizeInput(parsed.text).slice(0, MAX_SOURCE_TEXT_LENGTH)
      const sourceFromUpload = parsed.wasTruncated
        ? `${parsedSourceText}\n\n${PDF_TRUNCATION_NOTE}`
        : parsedSourceText

      return {
        sourceText: sourceFromUpload || sourceText,
        researchData,
        providedSessionId,
      }
    }

    return {
      sourceText,
      researchData,
      providedSessionId,
    }
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    throw createInputParseError('INVALID_JSON', 'Invalid JSON in request body')
  }

  return {
    sourceText: sanitizeOptionalText(body.sourceText, MAX_SOURCE_TEXT_LENGTH),
    researchData: serializeResearchData(body.researchData),
    providedSessionId: body.sessionId,
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

    let parsedInput: ParsedArticleInput
    try {
      parsedInput = await parseArticleInput(request)
    } catch (error) {
      if (isInputParseError(error) && error.code === 'INVALID_JSON') {
        return NextResponse.json(
          { error: { code: 'invalid_json', message: error.message } },
          { status: 400 }
        )
      }

      if (isInputParseError(error) && error.code === 'INVALID_PDF') {
        return NextResponse.json(
          { error: { code: 'invalid_pdf', message: error.message } },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: { code: 'invalid_input', message: 'Unable to process input payload' } },
        { status: 400 }
      )
    }

    const { sourceText, researchData, providedSessionId } = parsedInput

    if (!sourceText && !researchData) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              {
                field: 'sourceText',
                message: 'Provide sourceText, researchData, or a PDF file upload',
              },
            ],
          },
        },
        { status: 400 }
      )
    }

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId,
        fallbackInputType: 'data-driven',
        fallbackInputData: {
          sourceText,
          researchData,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Session not found') {
        return NextResponse.json(
          { error: { code: 'session_not_found', message: 'Session not found' } },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to resolve session' } },
        { status: 500 }
      )
    }

    const prompt = getDataDrivenArticlePrompt(sourceText, researchData)
    const encoder = new TextEncoder()

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let fullMarkdown = ''

          for await (const chunk of streamMessage({
            maxTokens: 8000,
            messages: [{ role: 'user', content: prompt }],
          })) {
            fullMarkdown += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
          }

          const wordCount = getWordCount(fullMarkdown)
          const { data: savedAsset, error: assetError } = await supabase
            .from('content_assets')
            .insert({
              session_id: sessionId,
              asset_type: 'dd_article',
              content: {
                markdown: fullMarkdown,
                wordCount,
              },
            })
            .select('*')
            .single()

          if (assetError) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to save article' })}\n\n`))
            controller.close()
            return
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                wordCount,
                asset: savedAsset ? mapAssetRowToContentAsset(savedAsset) : undefined,
              })}\n\n`
            )
          )
          controller.close()
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Failed to stream article content' })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      status: 200,
      headers: SSE_HEADERS,
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
