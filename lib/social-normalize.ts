import { isRecord, asStringArray } from '@/lib/type-guards'
import type { SocialOutput, SocialPlatform } from '@/lib/prompts/social'

/**
 * Normalizes a social output payload across all platforms.
 * Handles per-platform field extraction, array trimming, and fallback defaults.
 *
 * @param payload Raw output from Claude API (may have incomplete or malformed fields)
 * @returns Normalized SocialOutput with all platforms properly typed
 */
export function normalizeSocialOutput(payload: unknown): SocialOutput {
  if (!isRecord(payload)) {
    return getDefaultSocialOutput()
  }

  const extras = isRecord(payload.extras) ? payload.extras : {}

  return {
    x: normalizePlatformData('x', payload.x),
    linkedin: normalizePlatformData('linkedin', payload.linkedin),
    instagram: normalizePlatformData('instagram', payload.instagram),
    medium: normalizePlatformData('medium', payload.medium),
    reddit: normalizePlatformData('reddit', payload.reddit),
    newsletter: normalizePlatformData('newsletter', payload.newsletter),
    pinterest: normalizePlatformData('pinterest', payload.pinterest),
    extras: {
      quotes: asStringArray(extras.quotes),
      discussionQuestions: asStringArray(extras.discussionQuestions),
      miniPosts: asStringArray(extras.miniPosts),
    },
  }
}

/**
 * Normalizes social output for a single platform.
 * Extracts platform-specific fields, trims arrays, applies fallback defaults.
 *
 * @param platform The platform name (e.g., 'x', 'linkedin')
 * @param payload The platform-specific payload from Claude
 * @returns Normalized platform-specific output
 */
export function normalizePlatformData<K extends SocialPlatform>(
  platform: K,
  payload: unknown
): SocialOutput[K] {
  if (!isRecord(payload)) {
    return getDefaultForPlatform(platform) as SocialOutput[K]
  }

  if (platform === 'x') {
    return {
      tweet: typeof payload.tweet === 'string' ? payload.tweet.trim() : '',
      thread: asStringArray(payload.thread),
      hooks: asStringArray(payload.hooks),
      replies: asStringArray(payload.replies),
    } as SocialOutput[K]
  }

  if (platform === 'linkedin') {
    return {
      storytelling: typeof payload.storytelling === 'string' ? payload.storytelling.trim() : '',
      authority: typeof payload.authority === 'string' ? payload.authority.trim() : '',
      carousel: typeof payload.carousel === 'string' ? payload.carousel.trim() : '',
    } as SocialOutput[K]
  }

  if (platform === 'instagram') {
    return {
      carouselCaptions: asStringArray(payload.carouselCaptions),
      reelCaption: typeof payload.reelCaption === 'string' ? payload.reelCaption.trim() : '',
      hooks: asStringArray(payload.hooks),
      cta: typeof payload.cta === 'string' ? payload.cta.trim() : '',
    } as SocialOutput[K]
  }

  if (platform === 'medium') {
    return {
      article: typeof payload.article === 'string' ? payload.article.trim() : '',
      canonicalSuggestion:
        typeof payload.canonicalSuggestion === 'string' ? payload.canonicalSuggestion.trim() : '',
    } as SocialOutput[K]
  }

  if (platform === 'reddit') {
    return {
      post: typeof payload.post === 'string' ? payload.post.trim() : '',
      subreddits: asStringArray(payload.subreddits),
      questions: asStringArray(payload.questions),
    } as SocialOutput[K]
  }

  if (platform === 'newsletter') {
    return {
      subjectLines: asStringArray(payload.subjectLines),
      body: typeof payload.body === 'string' ? payload.body.trim() : '',
      cta: typeof payload.cta === 'string' ? payload.cta.trim() : '',
    } as SocialOutput[K]
  }

  if (platform === 'pinterest') {
    const normalizedPins = Array.isArray(payload.pins)
      ? payload.pins
          .filter((pin): pin is Record<string, unknown> => isRecord(pin))
          .map((pin) => ({
            title: typeof pin.title === 'string' ? pin.title.trim() : '',
            description: typeof pin.description === 'string' ? pin.description.trim() : '',
            keywords: asStringArray(pin.keywords),
          }))
      : []
    return {
      pins: normalizedPins,
    } as SocialOutput[K]
  }

  const _exhaustive: never = platform
  return getDefaultForPlatform(_exhaustive) as SocialOutput[K]
}

/**
 * Returns default/empty output for a platform when payload is missing or invalid.
 */
function getDefaultForPlatform(platform: SocialPlatform): unknown {
  switch (platform) {
    case 'x':
      return { tweet: '', thread: [], hooks: [], replies: [] }
    case 'linkedin':
      return { storytelling: '', authority: '', carousel: '' }
    case 'instagram':
      return { carouselCaptions: [], reelCaption: '', hooks: [], cta: '' }
    case 'medium':
      return { article: '', canonicalSuggestion: '' }
    case 'reddit':
      return { post: '', subreddits: [], questions: [] }
    case 'newsletter':
      return { subjectLines: [], body: '', cta: '' }
    case 'pinterest':
      return { pins: [] }
    default:
      return {}
  }
}

/**
 * Returns default/empty SocialOutput for all platforms.
 */
function getDefaultSocialOutput(): SocialOutput {
  return {
    x: { tweet: '', thread: [], hooks: [], replies: [] },
    linkedin: { storytelling: '', authority: '', carousel: '' },
    instagram: { carouselCaptions: [], reelCaption: '', hooks: [], cta: '' },
    medium: { article: '', canonicalSuggestion: '' },
    reddit: { post: '', subreddits: [], questions: [] },
    newsletter: { subjectLines: [], body: '', cta: '' },
    pinterest: { pins: [] },
    extras: { quotes: [], discussionQuestions: [], miniPosts: [] },
  }
}
