export function getDeepResearchPrompt(topic: string, researchContent: string): string {
  return `You are an expert research synthesis engine.

Topic:
${topic}

Research Content:
${researchContent}

Synthesize the findings into structured deep research output.

Return ONLY valid JSON (no markdown, no extra text) with EXACTLY this schema:
{
  "summary": "string",
  "keyFindings": ["string"],
  "statistics": ["string"],
  "expertInsights": ["string"],
  "caseStudies": ["string"],
  "controversies": ["string"],
  "trends": ["string"],
  "gaps": ["string"],
  "sourceUrls": ["https://example.com"],
  "capabilitiesUsed": ["deep_research", "competitive_intel", "market_synthesis", "due_diligence", "literature_review", "trend_spotting"]
}

Rules:
- Be evidence-based and concise.
- If a field has no clear data, return an empty array (or empty string for summary).
- sourceUrls must include only valid absolute URLs when available.
- capabilitiesUsed must include only capabilities actually used by the analysis.
- Keep the response machine-parseable JSON only.`
}