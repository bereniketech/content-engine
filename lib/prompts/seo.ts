export interface ResearchOutput {
  intent: 'informational' | 'commercial' | 'transactional'
  demand: 'high' | 'medium' | 'low'
  trend: 'rising' | 'stable' | 'declining'
  keywords: string[]
  faqs: Array<{ question: string; answer: string }>
  competitors: Array<{ name: string; url: string; strength: string }>
  gaps: string[]
  alternatives?: string[]
}

export function getSeoPrompt(topic: string, research: ResearchOutput, keywords: string[] = []): string {
  const keywordList = [...new Set([...research.keywords, ...keywords])].slice(0, 15).join(', ')
  const faqText = research.faqs.map((faq, i) => `${i + 1}. Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')

  return `Based on the research for "${topic}", generate optimized SEO metadata and schemas.

Topic: ${topic}
Primary Keywords: ${keywordList}

FAQs from Research:
${faqText}

Competitors: ${research.competitors.map(c => `${c.name} (${c.strength})`).join(', ')}
Demand: ${research.demand}
Trend: ${research.trend}

Generate a JSON response with EXACTLY this structure (no markdown, pure JSON):
{
  "title": "SEO-optimized title (50-60 chars)",
  "metaDescription": "Meta description (150-160 chars)",
  "slug": "url-slug-format",
  "primaryKeyword": "main keyword from research",
  "secondaryKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "snippetAnswer": "Concise answer (100-150 chars) for featured snippet",
  "headingStructure": {
    "h1": "Main heading",
    "h2": ["Subheading 1", "Subheading 2", "Subheading 3"],
    "h3": ["Detail 1", "Detail 2", "Detail 3"]
  },
  "faqSchema": [
    {"question": "Q1", "answer": "A1"},
    {"question": "Q2", "answer": "A2"},
    {"question": "Q3", "answer": "A3"}
  ],
  "articleSchema": {
    "headline": "Article headline",
    "description": "Short description",
    "author": "Content Studio",
    "datePublished": "YYYY-MM-DD"
  },
  "seoScore": <0-100>,
  "keywordScore": <0-100>,
  "rankingPotential": "Low|Medium|High"
}

IMPORTANT:
- title: Compelling, includes primary keyword, 50-60 characters.
- metaDescription: Calls to action, includes keyword, 150-160 characters.
- slug: Lowercase, hyphenated, includes primary keyword.
- primaryKeyword: Highest volume/intent match from research keywords.
- secondaryKeywords: 5 high-intent supporting keywords from research.
- snippetAnswer: Directly answers the core question, fact-checked against FAQs.
- headingStructure: Logical hierarchy supporting readability and SEO.
- faqSchema: 3 critical questions from research faqs, refined for clarity.
- articleSchema: JSON-LD compatible metadata for Google.
- seoScore: 0-100 based on keyword optimization, competition, demand, and trend.
  - >70: High potential (high demand, low competition, rising trend)
  - 40-70: Medium potential (mixed factors)
  - <40: Low potential (low demand, high competition, declining trend)
- keywordScore: 0-100 based on searchability and relevance of combined keywords.
- rankingPotential: "High" if demand=high and trend=rising, "Low" if demand=low or trend=declining, else "Medium".

Return ONLY valid JSON. No additional text.`
}
