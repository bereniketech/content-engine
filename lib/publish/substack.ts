import { getSubstackPostPrompt } from '@/lib/prompts/substack'
import { createMessage } from '@/lib/ai'
import { logger } from '@/lib/logger'

export interface SubstackPublishOptions {
  article: string
  topic: string
  tone?: string
  sessionId: string
}

export interface SubstackPublishResult {
  subjectLine: string
  previewText: string
  body: string
  replyPrompt: string
  platform: 'substack'
  publishedAt: string
}

export async function publishToSubstack(opts: SubstackPublishOptions): Promise<SubstackPublishResult> {
  const { article, topic, tone = 'authority', sessionId } = opts

  logger.info({ sessionId, platform: 'substack' }, 'Generating Substack post')

  const prompt = getSubstackPostPrompt(article, topic, tone)

  const rawOutput = await createMessage({
    maxTokens: 2000,
    system: 'You are a Substack newsletter writer who creates engaging, personal newsletter posts.',
    messages: [{ role: 'user', content: prompt }],
  })

  const subjectMatch = rawOutput.match(/---SUBJECT_LINE---\n(.+)/)
  const previewMatch = rawOutput.match(/---PREVIEW_TEXT---\n(.+)/)
  const bodyMatch = rawOutput.match(/---BODY---\n([\s\S]*?)(?=---REPLY_PROMPT---|$)/)
  const replyMatch = rawOutput.match(/---REPLY_PROMPT---\n([\s\S]*)$/)

  return {
    subjectLine: subjectMatch?.[1]?.trim() ?? topic,
    previewText: previewMatch?.[1]?.trim() ?? '',
    body: bodyMatch?.[1]?.trim() ?? rawOutput,
    replyPrompt: replyMatch?.[1]?.trim() ?? '',
    platform: 'substack',
    publishedAt: new Date().toISOString(),
  }
}
