export function getYouTubeDescriptionPrompt(
  article: string,
  title: string,
  keywords: string[] = [],
): string {
  return `You are a YouTube SEO expert. Generate a YouTube video description and chapter timestamps for the following article content.

ARTICLE TITLE: ${title}
TARGET KEYWORDS: ${keywords.join(', ')}

ARTICLE CONTENT:
${article.slice(0, 4000)}

Generate:
1. A compelling first 2-3 lines (shown before "more" fold) with primary keyword
2. Full description (300-500 words) with secondary keywords naturally integrated
3. Chapter timestamps in format: "0:00 Introduction" (assume 10-minute video, distribute chapters)
4. 3-5 relevant hashtags
5. Call-to-action with subscribe reminder

Format:
---FIRST_LINES---
[First 2-3 compelling lines]

---FULL_DESCRIPTION---
[Full description]

---CHAPTERS---
0:00 Introduction
[Additional chapters...]

---HASHTAGS---
#hashtag1 #hashtag2 ...`
}
