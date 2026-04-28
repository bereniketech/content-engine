export interface BrandVoice {
  id: string
  name: string
  toneAdjectives: string[]
  writingSamples: string[]
  forbiddenPhrases: string[]
  formalityLevel: string
  isActive: boolean
}

export function buildBrandVoiceSystemAddendum(voice: BrandVoice): string {
  const samples = voice.writingSamples
    .map((s) => s.slice(0, 400))
    .join('\n---\n')
    .slice(0, 2000)
  return `## Brand Voice: ${voice.name}
Tone: ${voice.toneAdjectives.join(', ')}
Formality: ${voice.formalityLevel}
Forbidden phrases: ${voice.forbiddenPhrases.map((p) => `"${p}"`).join(', ')}
Writing style samples:
${samples}`.trim()
}

export function buildBrandScorePrompt(article: string, voice: BrandVoice): string {
  return `Rate how well this article matches the brand voice profile below.
Return JSON: {"score": 0-100, "violations": ["specific issue 1", "specific issue 2"]}
Score 100 = perfect match, 0 = completely off-brand.

BRAND VOICE:
${buildBrandVoiceSystemAddendum(voice)}

ARTICLE (first 3000 chars):
${article.slice(0, 3000)}`
}
