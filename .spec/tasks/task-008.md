# TASK-008 — Grammar & Improvement Engine API + UI

## Session Bootstrap
Skills needed: code-writing-software-development, api-design, claude-developer-platform

## Objective
Build `POST /api/improve` and the improvement panel for upload mode with side-by-side original vs improved view and toggle.

## Implementation Steps
1. Create `/lib/prompts/improve.ts` — Claude prompt that takes raw article text and returns JSON:
   `{ improved: string, changes: Array<{ type: string, description: string }> }`
   Prompt instructs: fix grammar, restructure sentences, improve clarity, ensure tone consistency
2. Create `/app/api/improve/route.ts`:
   - Accept `{ article: string }`
   - Validate: article > 100 chars
   - Call Claude with improve prompt; parse JSON
   - Save to `content_assets` (`asset_type = 'improved'`)
   - Return `{ original: article, improved, changes }`
3. Update `/components/input/ArticleUpload.tsx`:
   - On submit, call `/api/improve` automatically
   - Show loading state during improvement
4. Create improvement result view in `/app/dashboard/blog/page.tsx` (upload mode):
   - Two-column layout: Original (left) | Improved (right)
   - Toggle button: "Show Original" / "Show Improved"
   - Changes list below: bullet points from `changes[]`
   - "Use Improved Version" button — stores improved text in SessionContext for downstream engines

## Acceptance Criteria
- `POST /api/improve` returns `{ original, improved, changes[] }`
- Upload mode shows side-by-side diff view (original vs improved)
- Toggle button switches between original and improved
- Improved version is used as input for SEO + multi-platform engines
- Result saved to `content_assets` with `asset_type = 'improved'`

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [x]
- Next task: task-009.md
- Notes: Implemented improve prompt/API, upload auto-improve flow, upload-mode side-by-side improvement UI, and SessionContext improved-article handoff for downstream engines.
