export interface FlywheelIdea {
  topic: string
  keywords: string[]
  cluster: string
}

export interface FlywheelOutput {
  ideas: FlywheelIdea[]
}

function normalizeKeywords(keywords: unknown): string[] {
  if (!Array.isArray(keywords)) {
    return []
  }

  return keywords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function getFlywheelPrompt(topic: string, keywords: unknown): string {
  const keywordList = normalizeKeywords(keywords)

  return `You are a topical authority strategist building a content flywheel.

Seed topic: "${topic}"
Supporting keywords: ${keywordList.length > 0 ? keywordList.join(', ') : 'None provided'}

Generate at least 10 high-potential related article ideas.
Each idea must include:
- topic (clear article headline)
- keywords (3-6 relevant keywords)
- cluster (category or pillar cluster)

Return only valid JSON.
No markdown fences.

Return this exact JSON shape:
{
  "ideas": [
    {
      "topic": "string",
      "keywords": ["string"],
      "cluster": "string"
    }
  ]
}`
}
