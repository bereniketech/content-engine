---
task: 007
feature: data-driven-pipeline
status: pending
depends_on: [1]
---

# Task 007: Multi-Format Prompt and API Route

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /api-design
Commands: /verify, /task-handoff

---

## Objective

Create the multi-format output prompt and API route. The route accepts an article, SEO+GEO results, and the user's free-form tone paragraph, then produces four distinct platform-specific outputs: blog, LinkedIn, Medium, and email newsletter. This is Iteration 3 — tone IS applied here. Saves 4 separate assets.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [MultiFormatOutput — from types/index.ts (added in task-001)]
export interface MultiFormatOutput {
  blog: string;
  linkedin: string;
  medium: { article: string; subtitle: string };
  newsletter: {
    subjectLine: string;
    previewText: string;
    body: string;
    plainText: string;
  };
}
```

```typescript
// [Existing social prompt — shows multi-platform output pattern — from lib/prompts/social.ts:96-171]
export function getSocialPrompt(
  blog: string,
  seo: SeoResult | Record<string, unknown>,
  platforms: SocialPlatform[]
): string {
  // Returns prompt requesting JSON with multiple platform keys
  // Pattern: embed JSON contract in prompt, return ONLY valid JSON
}
```

```typescript
// [Existing blog prompt shows tone usage — from lib/prompts/blog.ts:16-28]
const toneInstructions: Record<TopicTone, string> = {
  authority: `Write with a professional, authoritative voice...`,
  casual: `Write conversationally, as if speaking to a friend...`,
  storytelling: `Use narrative and storytelling techniques...`,
}
// NOTE: Data-driven pipeline uses free-form tone paragraph instead of TopicTone enum
```

```typescript
// [Asset saving pattern — multiple assets from one route]
// Social route saves per-platform: supabase.from('content_assets').insert({ asset_type: 'social_x', ... })
// Multi-format route should save: dd_blog, dd_linkedin, dd_medium, dd_newsletter
```

### Key Patterns in Use
- **Multi-output prompt:** Social prompt returns JSON with multiple platform keys. Multi-format follows same pattern.
- **Tone as free-form string:** Unlike existing `TopicTone` enum, this route receives `tone: string` (a paragraph) and embeds it directly in the prompt.
- **Multiple asset inserts:** Save each format as its own asset type for independent retrieval.

### Architecture Decisions Affecting This Task
- ADR-2: Tone is a free-form paragraph, embedded directly in the prompt. Not the `TopicTone` enum.
- Newsletter is a new output format not in the original spec — added during requirements.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-007.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Create `lib/prompts/multi-format.ts`:
   - Export `getMultiFormatPrompt(article: string, seoGeo: string, tone: string): string`.
   - Prompt instructs AI to repurpose the article into 4 platform-specific formats, all shaped by the user's tone paragraph.
   - Blog: web-optimized, SEO/GEO enhancements baked in, internal linking placeholders.
   - LinkedIn: professional article, hook opening, strategic line breaks, no hashtag spam.
   - Medium: subtitle, pull quotes, section breaks, reading-time-appropriate length.
   - Newsletter: subject line, preview text, body with sections (hook, key insights, CTA), plain-text fallback.
   - Embed `MultiFormatOutput` JSON schema in prompt.
2. Create `app/api/data-driven/multi-format/route.ts`:
   - `requireAuth()` → parse body → validate (`article`, `seoGeo`, `tone`, `sessionId` all required).
   - Sanitize inputs.
   - Call `createMessage({ maxTokens: 8000, messages: [...] })`.
   - Parse JSON response.
   - Save 4 assets: `dd_blog` (`{ markdown, wordCount }`), `dd_linkedin` (`{ article }`), `dd_medium` (`{ article, subtitle }`), `dd_newsletter` (`{ subjectLine, previewText, body, plainText }`).
   - Return `{ data: { blog: asset, linkedin: asset, medium: asset, newsletter: asset } }` with status 201.

_Requirements: 7_
_Skills: /code-writing-software-development — API route, /api-design — REST patterns_

---

## Acceptance Criteria
- [ ] `lib/prompts/multi-format.ts` exports prompt builder function
- [ ] `app/api/data-driven/multi-format/route.ts` handles POST requests
- [ ] Route requires `article`, `seoGeo`, `tone`, and `sessionId`
- [ ] Response contains all 4 format outputs (blog, linkedin, medium, newsletter)
- [ ] 4 separate assets saved: `dd_blog`, `dd_linkedin`, `dd_medium`, `dd_newsletter`
- [ ] User's tone paragraph shapes all 4 outputs
- [ ] Newsletter includes subject line, preview text, body, and plain-text fallback
- [ ] Auth required (401 without token)
- [ ] All existing tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
