export function getSubstackPostPrompt(
  article: string,
  topic: string,
  tone = 'authority',
): string {
  return `You are a Substack newsletter writer. Adapt the following article for a Substack post.

Requirements:
- Opening: Personal, direct address to subscribers ("Welcome back," or similar)
- Format: Readable newsletter prose with occasional subheadings
- Tone: ${tone} — authoritative but personal
- Length: 600-1200 words (digestible for email readers)
- End with a reflection question to encourage replies
- Include a brief "TL;DR" section at the top after the opening

TOPIC: ${topic}
ARTICLE:
${article.slice(0, 5000)}

Output:
---SUBJECT_LINE---
[Email subject line — curiosity-driven, 40-60 chars]

---PREVIEW_TEXT---
[Preview text — 90-140 chars]

---BODY---
[Full Substack post]

---REPLY_PROMPT---
[Question to encourage subscriber replies]`
}
