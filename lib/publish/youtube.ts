import { getYouTubeDescriptionPrompt } from '@/lib/prompts/youtube'
import { createMessage } from '@/lib/ai'
import { logger } from '@/lib/logger'

export interface YouTubePublishOptions {
  article: string
  title: string
  keywords?: string[]
  sessionId: string
}

export interface YouTubePublishResult {
  description: string
  chapters: string
  hashtags: string
  platform: 'youtube'
  publishedAt: string
}

export async function publishToYouTube(opts: YouTubePublishOptions): Promise<YouTubePublishResult> {
  const { article, title, keywords = [], sessionId } = opts

  logger.info({ sessionId, platform: 'youtube' }, 'Generating YouTube description')

  const prompt = getYouTubeDescriptionPrompt(article, title, keywords)

  const rawOutput = await createMessage({
    maxTokens: 1500,
    system: 'You are a YouTube SEO expert who writes compelling video descriptions.',
    messages: [{ role: 'user', content: prompt }],
  })

  const descriptionMatch = rawOutput.match(/---FULL_DESCRIPTION---\n([\s\S]*?)(?=---CHAPTERS---|$)/)
  const chaptersMatch = rawOutput.match(/---CHAPTERS---\n([\s\S]*?)(?=---HASHTAGS---|$)/)
  const hashtagsMatch = rawOutput.match(/---HASHTAGS---\n([\s\S]*)$/)

  return {
    description: descriptionMatch?.[1]?.trim() ?? rawOutput,
    chapters: chaptersMatch?.[1]?.trim() ?? '',
    hashtags: hashtagsMatch?.[1]?.trim() ?? '',
    platform: 'youtube',
    publishedAt: new Date().toISOString(),
  }
}
