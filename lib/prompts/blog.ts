import type { SeoResult } from '@/app/api/seo/route'
import type { TopicTone } from '@/types'

interface ResearchOutput {
  intent: 'informational' | 'commercial' | 'transactional'
  demand: 'high' | 'medium' | 'low'
  trend: 'rising' | 'stable' | 'declining'
  keywords: string[]
  faqs: Array<{ question: string; answer: string }>
  competitors: Array<{ name: string; url: string; strength: string }>
  gaps: string[]
  alternatives?: string[]
}

const toneInstructions: Record<TopicTone, string> = {
  authority: `Write with a professional, authoritative voice. Use industry terminology and cite best practices. 
Position the reader as someone seeking expert guidance. Include confidence in recommendations.`,
  casual: `Write conversationally, as if speaking to a friend. Use contractions, relatable examples, and humor where appropriate.
Make the reader feel at ease. Avoid jargon unless explained.`,
  storytelling: `Use narrative and storytelling techniques. Open with a compelling anecdote or scenario. 
Build tension around the problem and resolve it with solutions. Make it memorable and emotionally resonant.`,
}

export function getBlogPrompt(
  topic: string,
  seo: SeoResult,
  research: ResearchOutput,
  tone: TopicTone = 'authority'
): string {
  const faqContent = research.faqs
    .slice(0, 3)
    .map((faq) => `- ${faq.question}\n  ${faq.answer}`)
    .join('\n\n')

  const keywords = [seo.primaryKeyword, ...seo.secondaryKeywords].join(', ')

  return `Write a comprehensive, engaging blog article about "${topic}" for ${seo.articleSchema.description}.

## Content Requirements
- **Primary Title**: ${seo.title}
- **Primary Keyword**: ${seo.primaryKeyword}
- **Target Keywords**: ${keywords}
- **Tone**: ${tone}
- **Length**: 1500–2500 words
- **Format**: Structured markdown with H1, H2, and H3 headings

## Tone Instructions
${toneInstructions[tone]}

## Key Topics to Cover (from research)
${faqContent}

## Content Structure (REQUIRED - follow this exactly)
1. # Article Title (H1 - use "${seo.title}")
2. Introduction paragraph (hook the reader to the problem/opportunity)
3. Multiple H2 sections covering:
   - What is ${topic}? (definition and context)
   - Why it matters (business/personal impact)
   - Core principles or concepts
   - Real-world examples and use cases
   - Common challenges and solutions
   - Best practices tips (3–5 actionable items)
   - Tools and resources
4. Conclusion / Call-to-action section
5. FAQ section with H3 headings for each question

## Writing Guidelines
- Include 3–5 real-world examples per H2 section (not code unless relevant)
- Add actionable tips and takeaways throughout
- Use bold (**text**) for key points
- Include at least one bulleted or numbered list per H2
- Write compelling intro for each section
- End with a clear CTA (action the reader should take)
- Avoid jargon or explain terms clearly
- Incorporate the primary keyword naturally (aim for 1-2% keyword density)
- Cite competitors where relevant (e.g., "Unlike X, this approach...")

## SEO Metadata (for context, not in output)
- Meta: ${seo.metaDescription}
- Snippet Answer: ${seo.snippetAnswer}
- H2 Outline: ${seo.headingStructure.h2.join(' | ')}

## Output Format
Return ONLY valid markdown. No additional text, no code blocks, no JSON. Start with # and end with a final paragraph.
Use standard markdown:
- # for H1
- ## for H2 sections
- ### for H3 subsections
- **bold** for emphasis
- - for bullet points
- 1. for numbered lists`
}
