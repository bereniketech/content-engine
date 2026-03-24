export interface TrafficPrediction {
  demand: number
  competition: number
  clickPotential: number
  seoStrength: number
  label: 'Low' | 'Medium' | 'High'
  estimatedRange: string
}

function buildSeoSummary(seo: unknown): string {
  if (!seo || typeof seo !== 'object') {
    return 'No SEO context provided.'
  }

  const value = seo as Record<string, unknown>

  const title = typeof value.title === 'string' ? value.title : ''
  const primaryKeyword = typeof value.primaryKeyword === 'string' ? value.primaryKeyword : ''
  const metaDescription = typeof value.metaDescription === 'string' ? value.metaDescription : ''
  const rankingPotential =
    typeof value.rankingPotential === 'string' ? value.rankingPotential : ''

  return [
    `Title: ${title || 'n/a'}`,
    `Primary keyword: ${primaryKeyword || 'n/a'}`,
    `Meta description: ${metaDescription || 'n/a'}`,
    `Ranking potential: ${rankingPotential || 'n/a'}`,
  ].join('\n')
}

export function getTrafficPrompt(topic: string, seo: unknown): string {
  return `You are a content growth analyst.

Predict traffic potential for this topic using the SEO context.

Topic: "${topic}"

SEO Context:
${buildSeoSummary(seo)}

Requirements:
- Score demand, competition, clickPotential, and seoStrength from 0 to 100.
- Set label to exactly one of: Low, Medium, High.
- estimatedRange should be a realistic monthly organic traffic range string like "1,200-2,100 visits/month".
- Return only valid JSON.
- No markdown fences.

Return this exact JSON shape:
{
  "demand": 0,
  "competition": 0,
  "clickPotential": 0,
  "seoStrength": 0,
  "label": "Low",
  "estimatedRange": "string"
}`
}
