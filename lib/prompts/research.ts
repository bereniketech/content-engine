export function getResearchPrompt(topic: string, searchResults: Array<{ title: string; snippet: string; link: string }>) {
  const resultsText = searchResults
    .map((result, i) => `${i + 1}. ${result.title}\n${result.snippet}\n${result.link}`)
    .join('\n\n')

  return `Analyze the following search results for the topic "${topic}" and provide structured research intelligence.

Search Results:
${resultsText}

Provide a JSON response with EXACTLY this structure (no markdown, pure JSON):
{
  "intent": "informational|commercial|transactional",
  "demand": "high|medium|low",
  "trend": "rising|stable|declining",
  "keywords": ["keyword1", "keyword2", "keyword3", ...],
  "faqs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ],
  "competitors": [
    {"name": "...", "url": "...", "strength": "..."},
    {"name": "...", "url": "...", "strength": "..."}
  ],
  "gaps": [
    "gap1",
    "gap2",
    "gap3"
  ]${topic.length > 0 ? `,\n  "alternatives": ["alt_topic_1", "alt_topic_2", "alt_topic_3"]` : ''}
}

IMPORTANT:
- intent: Determine if the topic is informational (explaining concepts), commercial (promoting products), or transactional (buying/doing).
- demand: Based on search volume, competition, and trend indicators.
- trend: Whether the topic is gaining (rising), maintaining (stable), or losing (declining) interest.
- keywords: Extract 5-10 key phrases people search for related to this topic.
- faqs: Generate 3-5 common questions your target audience would ask.
- competitors: List 3-5 top competitors/resources and their main strength.
- gaps: Identify 3-5 content gaps or unexplored angles in the current landscape.
- alternatives: Only if this is requested; otherwise field should not exist.

Return ONLY valid JSON. No additional text.`
}
