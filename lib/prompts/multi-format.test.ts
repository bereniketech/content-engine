import { getMultiFormatPrompt } from './multi-format'

describe('getMultiFormatPrompt', () => {
  it('embeds all required output keys and sections', () => {
    const prompt = getMultiFormatPrompt('Article body', '{"seo":{},"geo":{}}', 'Confident, pragmatic, direct.')

    expect(prompt).toContain('"blog": "string"')
    expect(prompt).toContain('"linkedin": "string"')
    expect(prompt).toContain('"medium": {')
    expect(prompt).toContain('"newsletter": {')
    expect(prompt).toContain('Return strict JSON only')
  })

  it('injects user tone and source context blocks', () => {
    const tone = 'Warm, story-first, and reflective.'
    const seoGeo = '{"seo":{"title":"A"},"geo":{"sourceAttribution":"B"}}'
    const article = 'Core article content.'

    const prompt = getMultiFormatPrompt(article, seoGeo, tone)

    expect(prompt).toContain('<USER_TONE>')
    expect(prompt).toContain(tone)
    expect(prompt).toContain('<SEO_GEO_CONTEXT>')
    expect(prompt).toContain(seoGeo)
    expect(prompt).toContain('<SOURCE_ARTICLE>')
    expect(prompt).toContain(article)
  })
})
