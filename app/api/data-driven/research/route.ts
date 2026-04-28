import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { getDeepResearchPrompt } from '@/lib/prompts/deep-research'
import { sanitizeInput } from '@/lib/sanitize'
import { resolveSessionId } from '@/lib/session-assets'
import { runNotebookLmCliResearch } from '@/lib/notebooklm-cli'
import { extractJsonPayload } from '@/lib/extract-json'
import { isRecord, asStringArray } from '@/lib/type-guards'
import type { DeepResearchResult } from '@/types'
import { logger } from '@/lib/logger'

export const maxDuration = 300

type DataDrivenResearchRequestBody = {
  topic?: unknown
  sourceText?: unknown
  sessionId?: unknown
}

type NotebookCapability =
  | 'deep_research'
  | 'competitive_intel'
  | 'market_synthesis'
  | 'due_diligence'
  | 'literature_review'
  | 'trend_spotting'

const NOTEBOOK_CAPABILITY_SET = new Set<NotebookCapability>([
  'deep_research',
  'competitive_intel',
  'market_synthesis',
  'due_diligence',
  'literature_review',
  'trend_spotting',
])

const DEFAULT_NOTEBOOK_CAPABILITIES: NotebookCapability[] = ['deep_research', 'literature_review']
const MAX_TOPIC_LENGTH = 200
const MAX_SOURCE_TEXT_LENGTH = 16000

function selectNotebookCapabilities(topic: string): NotebookCapability[] {
  const normalized = topic.toLowerCase()
  const selected = new Set<NotebookCapability>(DEFAULT_NOTEBOOK_CAPABILITIES)

  if (/(compare|comparison|competitor|vs\b|alternative)/i.test(normalized)) {
    selected.add('competitive_intel')
    selected.add('due_diligence')
  }

  if (/(market|industry|sizing|segment|tam|sam|som|growth|demand)/i.test(normalized)) {
    selected.add('market_synthesis')
    selected.add('trend_spotting')
  }

  if (/(forecast|trend|future|outlook|prediction)/i.test(normalized)) {
    selected.add('trend_spotting')
  }

  if (/(risk|verify|audit|claim|compliance|regulation)/i.test(normalized)) {
    selected.add('due_diligence')
  }

  return Array.from(selected)
}

function normalizeDeepResearchResult(
  payload: unknown,
  capabilitiesUsed: NotebookCapability[]
): DeepResearchResult {
  if (!isRecord(payload)) {
    throw new Error('Deep research output must be a JSON object')
  }

  const summary = typeof payload.summary === 'string' ? payload.summary.trim() : ''
  const sourceUrls = asStringArray(payload.sourceUrls).filter((url) => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  })

  const resultCapabilities = asNotebookCapabilities(payload.capabilitiesUsed)

  return {
    summary,
    keyFindings: asStringArray(payload.keyFindings),
    statistics: asStringArray(payload.statistics),
    expertInsights: asStringArray(payload.expertInsights),
    caseStudies: asStringArray(payload.caseStudies),
    controversies: asStringArray(payload.controversies),
    trends: asStringArray(payload.trends),
    gaps: asStringArray(payload.gaps),
    sourceUrls,
    capabilitiesUsed: resultCapabilities.length > 0 ? resultCapabilities : capabilitiesUsed,
  }
}

function classifyResearchError(error: unknown): {
  status: number
  code: string
  message: string
} {
  const rawMessage = error instanceof Error ? error.message : 'Unknown research error'
  const message = rawMessage.toLowerCase()

  if (message.includes('enoent') || message.includes('notebooklm')) {
    return {
      status: 503,
      code: 'notebooklm_unavailable',
      message: 'NotebookLM is unavailable. Verify local NotebookLM CLI setup and authentication.',
    }
  }

  if (message.includes('timed out') || message.includes('timeout')) {
    return {
      status: 504,
      code: 'research_timeout',
      message: 'Research request timed out while waiting for NotebookLM.',
    }
  }

  return {
    status: 500,
    code: 'research_error',
    message: 'Failed to generate deep research',
  }
}

async function deriveTopicFromSourceText(sourceText: string): Promise<string> {
  const fallbackTopic = sourceText
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 8)
    .join(' ')

  if (!fallbackTopic) {
    return ''
  }

  const responseText = await createMessage({
    maxTokens: 80,
    messages: [
      {
        role: 'user',
        content:
          'Derive a concise research topic (max 8 words) from the following text. Return only plain text topic.\n\n' +
          sanitizePromptData(sourceText),
      },
    ],
  })

  const cleaned = sanitizeInput(responseText).replace(/["`]/g, '').trim()
  return cleaned.length > 0 ? cleaned : fallbackTopic
}

async function runNotebookLmResearch(options: {
  topic: string
  sourceText: string
  capabilities: NotebookCapability[]
}): Promise<DeepResearchResult> {
  const rawAnswer = await runNotebookLmCliResearch(options.topic, options.sourceText || undefined)
  const prompt = getDeepResearchPrompt(options.topic, rawAnswer)
  const responseText =
    (await createMessage({
      maxTokens: 2400,
      messages: [{ role: 'user', content: prompt }],
    })) || '{}'
  return normalizeDeepResearchResult(extractJsonPayload(responseText), options.capabilities)
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

    let body: DataDrivenResearchRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const rawTopic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const rawSourceText = typeof body.sourceText === 'string' ? body.sourceText.trim() : ''

    if (!rawTopic && !rawSourceText) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              {
                field: 'topic',
                message: 'Provide topic or sourceText',
              },
            ],
          },
        },
        { status: 400 }
      )
    }

    if (rawTopic.length > MAX_TOPIC_LENGTH || rawSourceText.length > MAX_SOURCE_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...(rawTopic.length > MAX_TOPIC_LENGTH
                ? [
                    {
                      field: 'topic',
                      message: `Topic must be ${MAX_TOPIC_LENGTH} characters or fewer`,
                    },
                  ]
                : []),
              ...(rawSourceText.length > MAX_SOURCE_TEXT_LENGTH
                ? [
                    {
                      field: 'sourceText',
                      message: `Source text must be ${MAX_SOURCE_TEXT_LENGTH} characters or fewer`,
                    },
                  ]
                : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const sanitizedSourceText = sanitizeInput(rawSourceText)
    const initialTopic = sanitizeInput(rawTopic)
    let resolvedTopic = initialTopic

    if (!resolvedTopic && sanitizedSourceText) {
      try {
        resolvedTopic = await deriveTopicFromSourceText(sanitizedSourceText)
      } catch {
        return NextResponse.json(
          { error: { code: 'research_error', message: 'Failed to derive research topic' } },
          { status: 500 }
        )
      }
    }

    if (!resolvedTopic) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [{ field: 'sourceText', message: 'Could not derive topic from sourceText' }],
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
        providedSessionId: body.sessionId,
        fallbackInputType: 'data-driven',
        fallbackInputData: {
          topic: resolvedTopic,
          sourceText: sanitizedSourceText,
          tone: 'neutral',
        },
      })
    } catch (sessionError) {
      return NextResponse.json(
        {
          error: {
            code: 'storage_error',
            message:
              sessionError instanceof Error ? sessionError.message : 'Failed to resolve session',
          },
        },
        { status: 500 }
      )
    }

    const capabilities = selectNotebookCapabilities(resolvedTopic)

    let researchResult: DeepResearchResult
    try {
      researchResult = await runNotebookLmResearch({
        topic: resolvedTopic,
        sourceText: sanitizedSourceText,
        capabilities,
      })
    } catch (error) {
      const classifiedError = classifyResearchError(error)
      logger.error({ err: error }, 'Deep research generation failed')
      return NextResponse.json(
        {
          error: {
            code: classifiedError.code,
            message: classifiedError.message,
          },
        },
        { status: classifiedError.status }
      )
    }

    const { data: savedAsset, error: saveError } = await supabase
      .from('content_assets')
      .insert({
        session_id: sessionId,
        asset_type: 'dd_research',
        content: researchResult,
      })
      .select('*')
      .single()

    if (saveError || !savedAsset) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save deep research asset' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          id: savedAsset.id,
          sessionId: savedAsset.session_id,
          assetType: savedAsset.asset_type,
          content: savedAsset.content,
          version: savedAsset.version,
          createdAt: savedAsset.created_at,
        },
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

function sanitizePromptData(text: string): string {
  return sanitizeInput(text).replace(/\s+/g, ' ').trim()
}

function asNotebookCapabilities(value: unknown): NotebookCapability[] {
  return asStringArray(value).filter(
    (item): item is NotebookCapability => NOTEBOOK_CAPABILITY_SET.has(item as NotebookCapability)
  )
}