import { getTikTokScriptPrompt } from '@/lib/prompts/tiktok'
import { createMessage } from '@/lib/ai'
import { logger } from '@/lib/logger'

export interface TikTokPublishOptions {
  article: string
  tone?: string
  targetDurationSeconds?: number
  sessionId: string
}

export interface TikTokPublishResult {
  script: string
  platform: 'tiktok'
  publishedAt: string
}

export async function publishToTikTok(opts: TikTokPublishOptions): Promise<TikTokPublishResult> {
  const { article, tone = 'conversational', targetDurationSeconds = 60, sessionId } = opts

  logger.info({ sessionId, platform: 'tiktok' }, 'Generating TikTok script')

  const prompt = getTikTokScriptPrompt(article, tone, targetDurationSeconds)

  const script = await createMessage({
    maxTokens: 1000,
    system: 'You are an expert TikTok content creator who writes viral short-form video scripts.',
    messages: [{ role: 'user', content: prompt }],
  })

  return {
    script,
    platform: 'tiktok',
    publishedAt: new Date().toISOString(),
  }
}
