# TASK-010 — Image Prompt Engine API + UI

## Session Bootstrap
Skills needed: code-writing-software-development, api-design, claude-developer-platform

## Objective
Build `POST /api/images` to generate image prompts via Claude (optimised for fal.ai / Nanobana) and the Images panel UI with style selector and optional image generation.

## Implementation Steps
1. Create `/lib/prompts/images.ts` — Claude prompt that takes topic + blog summary + style and returns:
   `{ hero, sections: string[], infographic, social, pinterest }` — each a detailed image generation prompt
2. Create `/app/api/images/route.ts`:
   - Accept `{ topic, blog, style }`
   - Call Claude with images prompt
   - Optionally call fal.ai SDK if `generate: true` flag present
   - Save to `content_assets` (`asset_type = 'images'`)
   - Return prompts (+ image URLs if generated)
3. Install fal.ai: `npm install @fal-ai/serverless-client`
4. Create `/app/api/images/generate/route.ts`:
   - Accept `{ prompt, style }`
   - Call fal.ai with prompt
   - Return `{ imageUrl }`
5. Create `/components/sections/ImagesPanel.tsx`:
   - Style selector at top: realistic / 3D / flat illustration / startup style / minimal tech
   - 5 prompt cards: Hero, Section Illustrations, Infographic, Social Post, Pinterest Visual
   - Each card: prompt text + copy button + "Generate Image" button
   - "Generate Image" calls `/api/images/generate` and shows result inline

## Acceptance Criteria
- `POST /api/images` returns hero, section, infographic, social, and Pinterest prompts
- Style selector affects all prompts
- Each prompt has a copy button and optional "Generate image" button (calls fal.ai)
- Result saved to `content_assets` with `asset_type = 'images'`

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [ ]
- Next task: task-011.md
- Notes: ___
