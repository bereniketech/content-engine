import { getXCampaignPrompt } from './x-campaign'

describe('getXCampaignPrompt', () => {
  it('embeds the JSON contract with all required keys', () => {
    const prompt = getXCampaignPrompt('Article body', '{"seo":{},"geo":{}}', 'Bold and direct.')

    expect(prompt).toContain('"campaignName": "string"')
    expect(prompt).toContain('"posts": [')
    expect(prompt).toContain('"threadVariant": ["string"]')
    expect(prompt).toContain('"phase": "mystery" | "reveal_slow" | "reveal_full"')
    expect(prompt).toContain('"hasLink": false')
    expect(prompt).toContain('Return strict JSON only')
  })

  it('specifies the phase distribution rules', () => {
    const prompt = getXCampaignPrompt('Article body', '{"seo":{},"geo":{}}', 'Direct.')

    expect(prompt).toContain('Posts 1-3: phase = "mystery"')
    expect(prompt).toContain('Posts 4-6: phase = "reveal_slow"')
    expect(prompt).toContain('Posts 7-10: phase = "reveal_full"')
    expect(prompt).toContain('hasLink = false for all mystery posts')
    expect(prompt).toContain('hasLink = true for all full-reveal posts')
  })

  it('injects user tone, seoGeo context, and source article blocks', () => {
    const tone = 'Energetic, punchy, witty.'
    const seoGeo = '{"seo":{"title":"AI Tools"},"geo":{"sourceAttribution":"Source A"}}'
    const article = 'Core article about AI trends.'

    const prompt = getXCampaignPrompt(article, seoGeo, tone)

    expect(prompt).toContain('<USER_TONE>')
    expect(prompt).toContain(tone)
    expect(prompt).toContain('<SEO_GEO_CONTEXT>')
    expect(prompt).toContain(seoGeo)
    expect(prompt).toContain('<SOURCE_ARTICLE>')
    expect(prompt).toContain(article)
  })

  it('enforces the 280 character limit requirement', () => {
    const prompt = getXCampaignPrompt('Article body', '{"seo":{},"geo":{}}', 'Direct.')

    expect(prompt).toContain('280 characters or fewer')
  })
})
