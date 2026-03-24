export const IMAGE_STYLES = [
  'realistic',
  '3d',
  'flat-illustration',
  'startup-style',
  'minimal-tech',
] as const

export type ImageStyle = (typeof IMAGE_STYLES)[number]

export interface ImagePromptsOutput {
  hero: string
  sections: string[]
  infographic: string
  social: string
  pinterest: string
}

const STYLE_DESCRIPTIONS: Record<ImageStyle, string> = {
  realistic:
    'Photorealistic, high-resolution photography style with natural lighting and depth of field',
  '3d':
    '3D render style with clean geometry, soft shadows, and a modern digital illustration feel',
  'flat-illustration':
    'Flat design illustration style with bold colors, simple shapes, and no gradients or shadows',
  'startup-style':
    'Modern startup / SaaS aesthetic — clean, professional, bright accent colors on white or light backgrounds',
  'minimal-tech':
    'Minimalist tech style with muted tones, simple iconography, and lots of negative space',
}

function buildStyleClause(style: ImageStyle): string {
  return `Style: ${STYLE_DESCRIPTIONS[style]}.`
}

export function getImagesPrompt(
  topic: string,
  blogSummary: string,
  style: ImageStyle
): string {
  const styleClause = buildStyleClause(style)

  return `You are an expert visual content strategist and AI image prompt engineer.

Topic: "${topic}"
Blog Summary: ${blogSummary}
${styleClause}

Generate a set of 5 detailed image generation prompts for this content. Each prompt must be
self-contained and optimised for fal.ai / Stable Diffusion XL. Include composition, lighting,
color palette, and mood in every prompt.

Return ONLY valid JSON with this exact shape:
{
  "hero": "<detailed prompt for the main hero/banner image>",
  "sections": [
    "<prompt for section illustration 1>",
    "<prompt for section illustration 2>",
    "<prompt for section illustration 3>"
  ],
  "infographic": "<detailed prompt for an infographic / data visualisation image>",
  "social": "<detailed prompt for a square social media post image>",
  "pinterest": "<detailed prompt for a tall 2:3 Pinterest visual>"
}

Rules:
- Each prompt must be 40–120 words
- Do NOT include markdown fences, code blocks, or any text outside the JSON object
- Make every prompt visually distinct and purpose-built for its placement`
}
