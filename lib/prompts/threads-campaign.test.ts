import { getThreadsCampaignPrompt } from './threads-campaign'

describe('getThreadsCampaignPrompt', () => {
  it('embeds the JSON contract with all required keys', () => {
    const prompt = getThreadsCampaignPrompt('Article body', '{"seo":{},"geo":{}}', 'Bold and conversational.')

    expect(prompt).toContain('Generate a strategic 10-post Threads campaign')
    expect(prompt).toContain('"campaignName": "string"')
    expect(prompt).toContain('"posts": [')
    expect(prompt).toContain('"threadVariant": ["string"]')
    expect(prompt).toContain('"phase": "hook" | "conversation" | "conversion"')
    expect(prompt).toContain('Return strict JSON only')
  })

  it('specifies platform-native Threads behavior', () => {
    const prompt = getThreadsCampaignPrompt('Article body', '{"seo":{},"geo":{}}', 'Direct.')

    expect(prompt).toContain('Prioritize native, text-first storytelling with short paragraphs and line breaks')
    expect(prompt).toContain('Keep links minimal because Threads generally rewards native on-platform consumption')
    expect(prompt).toContain('Use hashtags sparingly (0-2 max) and only when contextually relevant')
    expect(prompt).toContain('Prioritize reply-driving prompts and perspective-taking questions')
  })

  it('injects user tone, seoGeo context, and source article blocks', () => {
    const tone = 'Energetic, punchy, witty.'
    const seoGeo = '{"seo":{"title":"AI Tools"},"geo":{"sourceAttribution":"Source A"}}'
    const article = 'Core article about AI trends.'

    const prompt = getThreadsCampaignPrompt(article, seoGeo, tone)

    expect(prompt).toContain('<USER_TONE>')
    expect(prompt).toContain(tone)
    expect(prompt).toContain('<SEO_GEO_CONTEXT>')
    expect(prompt).toContain(seoGeo)
    expect(prompt).toContain('<SOURCE_ARTICLE>')
    expect(prompt).toContain(article)
  })

  it('enforces post length and phase distribution requirements', () => {
    const prompt = getThreadsCampaignPrompt('Article body', '{"seo":{},"geo":{}}', 'Direct.')

    expect(prompt).toContain('Posts 1-3: phase = "hook"')
    expect(prompt).toContain('Posts 4-7: phase = "conversation"')
    expect(prompt).toContain('Posts 8-10: phase = "conversion"')
    expect(prompt).toContain('500 characters or fewer')
  })
})
