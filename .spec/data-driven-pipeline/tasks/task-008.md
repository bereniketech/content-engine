---
task: 008
feature: data-driven-pipeline
status: pending
depends_on: [1]
---

# Task 008: X Campaign Prompt and API Route

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /x-api
Commands: /verify, /task-handoff

---

## Objective

Create the X hype campaign prompt and API route. The route generates exactly 10 posts following a mystery → slow reveal → full reveal arc, plus a thread variant. Saves result as `dd_x_campaign` asset.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [XCampaignPost and XCampaignOutput — from types/index.ts (added in task-001)]
export interface XCampaignPost {
  postNumber: number;
  phase: "mystery" | "reveal_slow" | "reveal_full";
  content: string;
  purpose: string;
  scheduleSuggestion: string;
  hashtags: string[];
  hasLink: boolean;
}

export interface XCampaignOutput {
  campaignName: string;
  posts: XCampaignPost[];
  threadVariant: string[];
}
```

```typescript
// [Existing X/Twitter social output — from lib/prompts/social.ts:16-20]
// Existing social pipeline generates: tweet, thread, hooks, replies
// Data-driven X campaign is different: 10 strategic posts with hype arc phases
```

```typescript
// [Non-streaming route pattern — same as seo-geo, multi-format]
// requireAuth → parse body → validate → createMessage → JSON.parse → save asset → respond
```

### Key Patterns in Use
- **JSON schema in prompt:** Embed exact `XCampaignOutput` schema for reliable structured output.
- **280 char limit:** Each post's `content` field must be <= 280 characters.
- **Phase distribution:** Posts 1-3 mystery, 4-6 reveal_slow, 7-10 reveal_full. Posts 1-6 `hasLink: false`, 7-10 `hasLink: true`.

### Architecture Decisions Affecting This Task
- The X campaign is separate from the existing social pipeline's X output. It's a strategic 10-post campaign, not a single tweet + thread.
- Tone paragraph is applied to shape the campaign voice.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-008.

**Files changed by previous task:** `lib/prompts/multi-format.ts`, `lib/prompts/multi-format.test.ts`, `app/api/data-driven/multi-format/route.ts`, `app/api/data-driven/multi-format/route.test.ts`
**Decisions made:** Multi-format now enforces strict `seoGeo` `{ seo, geo }` validation, requires object JSON request bodies, returns persisted assets keyed by `blog`, `linkedin`, `medium`, and `newsletter`, and includes `sessionId` in the success payload.
**Context for this task:** Follow the same non-streaming data-driven route pattern as SEO+GEO and multi-format: require auth, validate `article`/`seoGeo`/`tone`/`sessionId`, sanitize inputs, normalize strict JSON output, and persist the asset with route-level tests for auth, validation, and success paths.
**Open questions left:** Global repo lint still has unrelated workspace noise, so task-local lint should be validated with targeted eslint in parallel with the standard verify tasks.

---

## Implementation Steps

1. Create `lib/prompts/x-campaign.ts`:
   - Export `getXCampaignPrompt(article: string, seoGeo: string, tone: string): string`.
   - Prompt instructs AI to generate exactly 10 posts with hype arc:
     - Posts 1-3 (mystery): provocative questions, bold claims, "something big is coming", NO links.
     - Posts 4-6 (slow reveal): tease insights, share a surprising stat, build anticipation, NO links.
     - Posts 7-10 (full reveal): share content directly, link to blog, CTA, summary.
   - Each post: `{ postNumber, phase, content (<=280 chars), purpose, scheduleSuggestion, hashtags, hasLink }`.
   - Also generate `threadVariant`: all 10 posts as a connected thread.
   - Embed `XCampaignOutput` JSON schema in prompt.
2. Create `app/api/data-driven/x-campaign/route.ts`:
   - `requireAuth()` → parse body → validate (`article`, `seoGeo`, `tone`, `sessionId` required).
   - Sanitize inputs.
   - Call `createMessage({ maxTokens: 4000, messages: [...] })`.
   - Parse JSON response.
   - Save asset as `dd_x_campaign`.
   - Return `{ data: { id, sessionId, assetType, content, version, createdAt } }` with status 201.

_Requirements: 8_
_Skills: /code-writing-software-development — API route, /x-api — X platform patterns_

---

## Acceptance Criteria
- [ ] `lib/prompts/x-campaign.ts` exports prompt builder function
- [ ] `app/api/data-driven/x-campaign/route.ts` handles POST requests
- [ ] Response contains exactly 10 posts
- [ ] Posts 1-3 have `phase: "mystery"` and `hasLink: false`
- [ ] Posts 4-6 have `phase: "reveal_slow"` and `hasLink: false`
- [ ] Posts 7-10 have `phase: "reveal_full"` and `hasLink: true`
- [ ] All post `content` fields are <= 280 characters
- [ ] `threadVariant` array is present with 10 entries
- [ ] `campaignName` is present
- [ ] Asset saved as `dd_x_campaign`
- [ ] User's tone paragraph shapes the campaign voice
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
