export function getTikTokScriptPrompt(
  article: string,
  tone = 'conversational',
  targetDuration = 60,
): string {
  return `You are an expert TikTok content creator. Convert the following blog article into a TikTok video script.

Requirements:
- Duration: approximately ${targetDuration} seconds (roughly ${Math.round(targetDuration * 2.5)} words when spoken)
- Hook: Start with an attention-grabbing first 3 seconds
- Format: [HOOK], [MAIN CONTENT 1], [MAIN CONTENT 2], [MAIN CONTENT 3], [CALL TO ACTION]
- Tone: ${tone}
- Include [VISUAL CUE: description] notes for each section
- End with a clear call-to-action

ARTICLE:
${article.slice(0, 3000)}

Output the script in this exact format:
---HOOK---
[3-second opening hook]

---CONTENT---
[Main talking points with visual cues]

---CTA---
[Call to action]

Keep it punchy, engaging, and scroll-stopping.`
}
