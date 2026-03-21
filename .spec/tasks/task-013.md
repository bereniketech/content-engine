# TASK-013 — Content Multiplication Summary Panel

## Session Bootstrap
Skills needed: build-website-web-app, code-writing-software-development

## Objective
Build the summary panel that appears after all engines complete, showing a count of all generated assets with links to each panel.

## Implementation Steps
1. Create `/components/dashboard/SummaryPanel.tsx`:
   - Appears on `/app/dashboard/page.tsx` when session has assets
   - Asset count cards:
     - 1 Blog article → links to /dashboard/blog
     - 1 Medium article → links to /dashboard/social/medium
     - 1 Newsletter → links to /dashboard/social/newsletter
     - 1 Reddit post → links to /dashboard/social/reddit
     - 10 Tweets (X thread) → links to /dashboard/social/x
     - 3 LinkedIn posts → links to /dashboard/social/linkedin
     - Instagram captions → links to /dashboard/social/instagram
     - Pinterest pins → links to /dashboard/social/pinterest
     - 5 Quotes → shown inline
     - 5 Discussion questions → shown inline
   - Total count badge: "23 assets ready" (or actual count from assets)
2. Show panel only when at least 5 `content_assets` exist for the session
3. Add a prominent "Total Assets" counter at the top (large number, animated count-up)
4. Each card is clickable — navigates to the relevant panel
5. Add "Start New Session" button that clears SessionContext and returns to input form

## Acceptance Criteria
- Summary panel appears after all engines complete
- Shows counts: 1 blog, 1 Medium, 1 newsletter, 1 Reddit post, 10 tweets, 3 LinkedIn posts, Instagram captions, Pinterest pins, 5 quotes, 5 questions
- Total asset count shown prominently (20–30+)
- Each asset type links to its panel

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [ ]
- Next task: task-014.md
- Notes: ___
