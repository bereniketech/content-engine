---
task: 011
feature: data-driven-pipeline
status: pending
depends_on: [7, 8, 10]
---

# Task 011: Output Display Pages

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /build-website-web-app
Commands: /verify, /task-handoff

---

## Objective

Create 5 output display pages under `/dashboard/data-driven/` for viewing and copying each generated format: blog, LinkedIn, Medium, newsletter, and X campaign. Each page loads its asset from the session context and renders it with appropriate formatting and copy functionality.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [Existing blog page pattern — from app/dashboard/blog/page.tsx (representative)]
// "use client" page, uses useSessionContext(), finds asset by type, renders with react-markdown
// Copy button: navigator.clipboard.writeText(markdown)
```

```typescript
// [react-markdown usage — already in dependencies]
// import ReactMarkdown from 'react-markdown'
// <ReactMarkdown>{markdownContent}</ReactMarkdown>
```

```typescript
// [getLatestAssetByType — from lib/session-assets.ts:55-57]
export function getLatestAssetByType(assets: ContentAsset[], assetType: string): ContentAsset | null {
  return [...assets].reverse().find((asset) => asset.assetType === assetType) ?? null
}
```

```typescript
// [XCampaignPost — from types/index.ts (added in task-001)]
export interface XCampaignPost {
  postNumber: number;
  phase: "mystery" | "reveal_slow" | "reveal_full";
  content: string;
  purpose: string;
  scheduleSuggestion: string;
  hashtags: string[];
  hasLink: boolean;
}
```

```typescript
// [Existing panel components use Card, Badge, Button from components/ui/]
// Pattern: Card with CardHeader + CardContent, Badge for labels, Button for actions
```

### Key Patterns in Use
- **Asset retrieval:** `getLatestAssetByType(assets, 'dd_blog')` from session context.
- **Markdown rendering:** `<ReactMarkdown>` component, already in deps.
- **Copy to clipboard:** `navigator.clipboard.writeText(text)` with toast/feedback.
- **Phase color coding for X campaign:** mystery = purple, reveal_slow = amber, reveal_full = green.

### Architecture Decisions Affecting This Task
- Each page is a simple read-only view of a single asset type.
- No API calls needed — data comes from session context (already loaded).

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-011.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps

1. Create `app/dashboard/data-driven/blog/page.tsx`:
   - Load `dd_blog` asset from session context.
   - Render markdown with `<ReactMarkdown>`.
   - Copy button copies full markdown.
   - Show "No content yet" state if asset missing.

2. Create `app/dashboard/data-driven/linkedin/page.tsx`:
   - Load `dd_linkedin` asset.
   - Render article text with line breaks preserved.
   - Copy button.

3. Create `app/dashboard/data-driven/medium/page.tsx`:
   - Load `dd_medium` asset.
   - Show subtitle prominently, render article with `<ReactMarkdown>`.
   - Copy button.

4. Create `app/dashboard/data-driven/newsletter/page.tsx`:
   - Load `dd_newsletter` asset.
   - Show subject line and preview text in highlighted cards.
   - Render body with `<ReactMarkdown>`.
   - Copy buttons: per-section (subject, preview, body) + "Copy Full HTML".
   - Plain-text fallback viewable in a toggle/tab.

5. Create `app/dashboard/data-driven/x-campaign/page.tsx`:
   - Load `dd_x_campaign` asset.
   - Render 10-post timeline as vertical card list.
   - Each card: post number, phase badge (color-coded: purple/amber/green), content text, purpose note, schedule suggestion, hashtags as badges, link indicator icon.
   - Copy button per post.
   - "Copy All as Thread" button copies `threadVariant` array joined with newlines.
   - Show `campaignName` as page header.

_Requirements: 10_
_Skills: /build-website-web-app — React pages, Tailwind_

---

## Acceptance Criteria
- [ ] All 5 pages render at their respective routes
- [ ] Blog page renders markdown with copy button
- [ ] LinkedIn page renders article with copy button
- [ ] Medium page shows subtitle + article with copy button
- [ ] Newsletter page shows subject, preview, body with per-section copy + full HTML copy
- [ ] X campaign page shows 10-post timeline with phase-coded badges (purple/amber/green)
- [ ] X campaign copy per post works
- [ ] "Copy All as Thread" copies threadVariant
- [ ] X campaign shows link indicator on posts 7-10
- [ ] Empty state shown when asset is missing
- [ ] All existing tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
