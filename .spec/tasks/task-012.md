# TASK-012 — Content Calendar UI

## Session Bootstrap
Skills needed: build-website-web-app, code-writing-software-development

## Objective
Build the weekly content calendar view auto-generated from the current session's assets, with clickable slots and plain-text export.

## Implementation Steps
1. Create `/components/sections/CalendarPanel.tsx`:
   - 5-column grid: Monday → Friday
   - Row headers: Blog, LinkedIn, Reddit, X Thread, Newsletter
   - Each slot populated from SessionContext assets:
     - Monday → blog asset title/summary
     - Tuesday → LinkedIn post summary
     - Wednesday → Reddit post summary
     - Thursday → X thread first tweet
     - Friday → Newsletter subject line
2. Clicking a slot navigates to that platform's panel (`router.push('/dashboard/...')`)
3. "Export as Text" button at top — generates plain-text schedule and copies to clipboard:
   ```
   Monday: [Blog title]
   Tuesday: [LinkedIn post]
   ...
   ```
4. Style: each slot is a rounded card with platform colour accent (X = black, LinkedIn = blue, etc.)
5. If an asset isn't generated yet, slot shows "Not generated" with a "Generate" link

## Acceptance Criteria
- Calendar renders Mon–Fri slots (Blog, LinkedIn, Reddit, X, Newsletter)
- Each slot populated with a summary of the relevant generated asset
- Clicking a slot opens the full asset in its platform panel
- Calendar is exportable as plain text (copy button)

## Key Patterns
[greenfield — no existing files to reference]

## Handoff — What Was Done
- Built a new `CalendarPanel` with five weekday slots (Monday-Friday) mapped to Blog, LinkedIn, Reddit, X Thread, and Newsletter.
- Added clickable slot navigation to platform pages and plain-text clipboard export using `Monday: ...` schedule lines.
- Implemented graceful missing-state behavior for each slot with `Not generated` and a visible `Generate` affordance.
- Ran `/verify`: build and type-check pass; lint reports pre-existing warnings; test phase is blocked because no `test` script exists in package scripts.

## Handoff — Patterns Learned
- Session assets are keyed by `assetType` (for social outputs: `social_linkedin`, `social_reddit`, `social_x`, `social_newsletter`), so panel extraction should normalize by latest matching asset type.
- Asset payload structures vary by engine, so robust fallbacks (title/summary/headline extraction and safe array reads) are needed for calendar summaries.

## Handoff — Files Changed
- components/sections/CalendarPanel.tsx
- app/dashboard/calendar/page.tsx
- package.json
- package-lock.json

## Status
COMPLETE
