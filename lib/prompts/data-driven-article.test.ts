import { getDataDrivenArticlePrompt } from './data-driven-article'

describe('getDataDrivenArticlePrompt', () => {
  it('builds a source-only prompt without the research section', () => {
    const prompt = getDataDrivenArticlePrompt('Source facts only')

    expect(prompt).toContain('source-only mode (ground the article in the provided source data)')
    expect(prompt).toContain('## Source Data')
    expect(prompt).not.toContain('## Research Data')
    expect(prompt).toContain('First character must be #')
  })

  it('builds a research-only prompt without the source section', () => {
    const prompt = getDataDrivenArticlePrompt(undefined, 'Research evidence only')

    expect(prompt).toContain('research-only mode (ground the article in the provided research data)')
    expect(prompt).toContain('## Research Data')
    expect(prompt).not.toContain('## Source Data')
    expect(prompt).toContain('neutral and informational')
  })

  it('builds a combined prompt that requires synthesis and evidence', () => {
    const prompt = getDataDrivenArticlePrompt('Internal metrics', 'External market research')

    expect(prompt).toContain('data-enriched synthesis mode (combine source context with external research evidence)')
    expect(prompt).toContain('## Source Data')
    expect(prompt).toContain('## Research Data')
    expect(prompt).toContain('Clearly identify the core thesis, key findings, and supporting evidence')
    expect(prompt).toContain('Support important claims with explicit evidence from the provided inputs')
  })
})