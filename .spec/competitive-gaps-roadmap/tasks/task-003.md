---
task: "003"
feature: competitive-gaps-roadmap
rec: R6
title: "Add loading skeleton and download buttons to ImagesPanel"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["001", "002"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`
- `.kit/skills/development/build-website-web-app/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Update `components/sections/ImagesPanel.tsx` to show a loading skeleton while `autoGenerate` is in flight, then display the generated images (featured 1200×630 and portrait 1080×1350) with download buttons. On generation failure, show a non-blocking error badge without hiding the rest of the images panel.

## Files

### Modify
- `D:/content-engine/components/sections/ImagesPanel.tsx`

### Create
- None (reuse existing `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`)

## Dependencies
- TASK-001 complete (API returns `generatedImage`)
- TASK-002 complete (API returns `generatedImage.socialCards`)
- Existing `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`
- Tailwind CSS v4

## Codebase Context

Existing `components/ui/` has:
- `badge.tsx` — `<Badge variant="...">` component
- `button.tsx` — `<Button variant="..." size="...">` component  
- `card.tsx` — `<Card>`, `<CardContent>`, `<CardHeader>` components

`components/sections/ImagesPanel.tsx` currently renders image prompt strings from `ImagePromptsOutput`. It needs extension, not replacement.

Pattern for data URLs and download:
```typescript
// Trigger browser download from data URL
const link = document.createElement('a')
link.href = dataUrl
link.download = `featured-image-1200x630.${mimeType === 'image/png' ? 'png' : 'jpg'}`
link.click()
```

## Implementation Steps

1. Add props to ImagesPanel:
```typescript
interface GeneratedImageResult {
  imageUrl: string
  socialCards?: { featured: string; portrait: string }
  assetId: string
}
interface ImagesPanelProps {
  // ... existing props ...
  autoGenerating?: boolean
  generatedImage?: GeneratedImageResult
  autoGenerateError?: string
}
```

2. Add loading skeleton section (rendered when `autoGenerating = true`):
   - A `<Card>` with `<CardHeader>Generated Images</CardHeader>`
   - Two skeleton divs: `className="animate-pulse bg-gray-200 rounded h-40 w-full mb-2"` for featured, `className="animate-pulse bg-gray-200 rounded h-48 w-32"` for portrait

3. Add generated images section (rendered when `generatedImage` is present):
   - Display featured image `<img src={generatedImage.imageUrl} className="w-full rounded">` with label "Featured (1200×630)"
   - Download button calling a `handleDownload(url, filename)` helper
   - If `socialCards` present: display portrait image with label "Portrait (1080×1350)" and download button
   - Grid layout: featured full-width, portrait constrained to `max-w-xs`

4. Add error badge (rendered when `autoGenerateError` is present):
   - `<Badge variant="destructive">Image generation failed: {autoGenerateError}</Badge>`
   - Positioned above the prompt list, does not hide any other content

5. `handleDownload(url: string, filename: string)`:
   - Create anchor, set href and download, click, clean up
   - For data URLs: works directly
   - For CDN URLs (fal.ai): fetch the image, create blob URL, then download

## Test Cases

- With `autoGenerating = true`: skeletons render, no image shown
- With `generatedImage` populated: images render with correct labels, download buttons visible
- With `autoGenerateError`: error badge renders, rest of panel unchanged
- Download button click: anchor download triggered

## Decision Rules
- Never replace existing prompt list display — new generated images section is additive.
- Loading skeleton must not shift layout when replaced by actual images.
- Error badge must use `variant="destructive"` from existing badge component.

## Acceptance Criteria
- ImagesPanel shows animated skeleton while `autoGenerating=true`.
- ImagesPanel shows generated featured image and portrait image with download buttons when `generatedImage` is populated.
- Download buttons trigger browser file download.
- Error badge appears when `autoGenerateError` is set, rest of panel fully visible.

Status: COMPLETE
Completed: 2026-04-28T07:15:49Z
