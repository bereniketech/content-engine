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

## Handoff
- Completed: [ ]
- Next task: task-013.md
- Notes: ___
