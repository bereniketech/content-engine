interface ImprovementChange {
	type: string
	description: string
}

function escapeInput(value: string): string {
	return value.replace(/```/g, "'''")
}

export function getImprovePrompt(article: string): string {
	const sanitizedArticle = escapeInput(article)

	return `You are an expert editor focused on grammar, clarity, and tone consistency.

Rewrite the provided article with these goals:
1. Fix grammar, punctuation, and spelling issues.
2. Improve sentence structure and flow.
3. Increase clarity while preserving original meaning.
4. Keep tone consistent and professional.
5. Do not add new factual claims.

Return valid JSON only with this exact structure:
{
	"improved": "string",
	"changes": [
		{
			"type": "grammar|clarity|tone|structure",
			"description": "short description of what changed"
		}
	]
}

Rules:
- Output raw JSON only. No markdown, no code fences, no commentary.
- Keep change descriptions concise and specific.
- Include 3-10 high-impact changes.

Article to improve:
${sanitizedArticle}`
}

export type { ImprovementChange }
