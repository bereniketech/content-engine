import type { SeoResult } from '@/app/api/seo/route'

export const SOCIAL_PLATFORM_KEYS = [
	'x',
	'linkedin',
	'instagram',
	'medium',
	'reddit',
	'newsletter',
	'pinterest',
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORM_KEYS)[number]

export interface SocialOutput {
	x: {
		tweet: string
		thread: string[]
		hooks: string[]
		replies: string[]
	}
	linkedin: {
		storytelling: string
		authority: string
		carousel: string
	}
	instagram: {
		carouselCaptions: string[]
		reelCaption: string
		hooks: string[]
		cta: string
	}
	medium: {
		article: string
		canonicalSuggestion: string
	}
	reddit: {
		post: string
		subreddits: string[]
		questions: string[]
	}
	newsletter: {
		subjectLines: string[]
		body: string
		cta: string
	}
	pinterest: {
		pins: Array<{
			title: string
			description: string
			keywords: string[]
		}>
	}
	extras: {
		quotes: string[]
		discussionQuestions: string[]
		miniPosts: string[]
	}
}

export const SOCIAL_ASSET_TYPE_BY_KEY: Record<keyof SocialOutput, string> = {
	x: 'social_x',
	linkedin: 'social_linkedin',
	instagram: 'social_instagram',
	medium: 'social_medium',
	reddit: 'social_reddit',
	newsletter: 'social_newsletter',
	pinterest: 'social_pinterest',
	extras: 'social_extras',
}

function buildSeoSummary(seo: SeoResult | Record<string, unknown>): string {
	if (!seo || typeof seo !== 'object') {
		return 'No SEO data provided.'
	}

	const title = typeof seo.title === 'string' ? seo.title : ''
	const primaryKeyword = typeof seo.primaryKeyword === 'string' ? seo.primaryKeyword : ''
	const metaDescription = typeof seo.metaDescription === 'string' ? seo.metaDescription : ''
	const headingStructure =
		seo.headingStructure && typeof seo.headingStructure === 'object'
			? (seo.headingStructure as { h2?: unknown }).h2
			: undefined
	const h2 = Array.isArray(headingStructure)
		? headingStructure.filter((item): item is string => typeof item === 'string').join(' | ')
		: ''

	return [
		`Title: ${title || 'n/a'}`,
		`Primary keyword: ${primaryKeyword || 'n/a'}`,
		`Meta description: ${metaDescription || 'n/a'}`,
		`Section outline: ${h2 || 'n/a'}`,
	].join('\n')
}

export function getSocialPrompt(
	blog: string,
	seo: SeoResult | Record<string, unknown>,
	platforms: SocialPlatform[]
): string {
	const platformList = platforms.join(', ')

	return `You are an expert social media content strategist.

Create high-performing, platform-native social content for the following platforms: ${platformList}.
You must return content for all core objects in the JSON contract below, even if a platform is not requested. For non-requested platforms, still provide concise but usable output.

Source Blog:
"""
${blog}
"""

SEO Context:
${buildSeoSummary(seo)}

Output requirements:
- Return ONLY valid JSON.
- No markdown fences.
- No commentary.
- Keep X single tweet under 280 characters.
- Keep hooks punchy and conversational.
- Keep subreddit names in reddit.subreddits format: r/example.

JSON contract (must match exactly):
{
	"x": {
		"tweet": "string",
		"thread": ["string"],
		"hooks": ["string"],
		"replies": ["string"]
	},
	"linkedin": {
		"storytelling": "string",
		"authority": "string",
		"carousel": "string"
	},
	"instagram": {
		"carouselCaptions": ["string"],
		"reelCaption": "string",
		"hooks": ["string"],
		"cta": "string"
	},
	"medium": {
		"article": "string",
		"canonicalSuggestion": "string"
	},
	"reddit": {
		"post": "string",
		"subreddits": ["string"],
		"questions": ["string"]
	},
	"newsletter": {
		"subjectLines": ["string"],
		"body": "string",
		"cta": "string"
	},
	"pinterest": {
		"pins": [
			{
				"title": "string",
				"description": "string",
				"keywords": ["string"]
			}
		]
	},
	"extras": {
		"quotes": ["string"],
		"discussionQuestions": ["string"],
		"miniPosts": ["string"]
	}}`
}

export function getSocialRegeneratePrompt(
	platform: SocialPlatform,
	blog: string,
	seo: SeoResult | Record<string, unknown>
): string {
	return `You are regenerating one social platform output from a source blog.

Target platform: ${platform}

Source Blog:
"""
${blog}
"""

SEO Context:
${buildSeoSummary(seo)}

Return ONLY JSON for this exact key: "${platform}".
No markdown fences.
No explanation.

Schemas by platform:
- x: { "tweet": "string", "thread": ["string"], "hooks": ["string"], "replies": ["string"] }
- linkedin: { "storytelling": "string", "authority": "string", "carousel": "string" }
- instagram: { "carouselCaptions": ["string"], "reelCaption": "string", "hooks": ["string"], "cta": "string" }
- medium: { "article": "string", "canonicalSuggestion": "string" }
- reddit: { "post": "string", "subreddits": ["string"], "questions": ["string"] }
- newsletter: { "subjectLines": ["string"], "body": "string", "cta": "string" }
- pinterest: { "pins": [{ "title": "string", "description": "string", "keywords": ["string"] }] }`
}
