export interface ResearchAsset {
  intent?: string
  keywords?: string[]
  faqs?: Array<{ question: string }>
  gaps?: string[]
  competitors?: Array<{ name: string }>
}

export interface Brief {
  id: string
  sessionId: string
  userId: string
  keyword: string
  searchIntent: string | null
  audience: string | null
  suggestedH1: string | null
  h2Outline: string[]
  competitorGaps: string[]
  recommendedWordCount: number | null
  ctas: string[]
  status: 'draft' | 'approved'
  rawMarkdown: string | null
  createdAt: string
  updatedAt: string
}

export function mapBrief(row: Record<string, unknown>): Brief {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    userId: row.user_id as string,
    keyword: row.keyword as string,
    searchIntent: (row.search_intent as string | null) ?? null,
    audience: (row.audience as string | null) ?? null,
    suggestedH1: (row.suggested_h1 as string | null) ?? null,
    h2Outline: (row.h2_outline as string[]) ?? [],
    competitorGaps: (row.competitor_gaps as string[]) ?? [],
    recommendedWordCount: (row.recommended_word_count as number | null) ?? null,
    ctas: (row.ctas as string[]) ?? [],
    status: (row.status as Brief['status']) ?? 'draft',
    rawMarkdown: (row.raw_markdown as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function generateBriefPrompt(researchData: ResearchAsset, topic: string): string {
  return `Generate a structured content brief as JSON for the topic: "${topic}"

Research findings:
- Intent: ${researchData.intent ?? 'unknown'}
- Keywords: ${researchData.keywords?.join(', ') ?? 'none'}
- Audience signals: ${researchData.faqs?.map((f) => f.question).join('; ').slice(0, 500) ?? 'none'}
- Content gaps: ${researchData.gaps?.join('; ') ?? 'none'}
- Competitors: ${researchData.competitors?.map((c) => c.name).join(', ') ?? 'none'}

Return JSON:
{
  "keyword": "primary keyword",
  "search_intent": "informational|commercial|transactional",
  "audience": "target audience description",
  "suggested_h1": "H1 title suggestion",
  "h2_outline": ["Section 1", "Section 2", "Section 3", "Section 4", "Section 5"],
  "competitor_gaps": ["gap 1", "gap 2"],
  "recommended_word_count": 1500,
  "ctas": ["CTA 1", "CTA 2"]
}`
}

export function injectBriefIntoGenerationContext(brief: Brief): string {
  const text = `## Content Brief
**Target Keyword:** ${brief.keyword}
**Search Intent:** ${brief.searchIntent ?? 'informational'}
**Target Audience:** ${brief.audience ?? 'general'}
**Suggested H1:** ${brief.suggestedH1 ?? ''}
**Recommended Word Count:** ${brief.recommendedWordCount ?? 1500}

**Article Outline (H2s):**
${brief.h2Outline.map((h, i) => `${i + 1}. ${h}`).join('\n')}

**Competitor Gaps to Address:**
${brief.competitorGaps.map((g) => `- ${g}`).join('\n')}

**Calls to Action:**
${brief.ctas.map((c) => `- ${c}`).join('\n')}`.trim()

  return text.slice(0, 16000)
}
