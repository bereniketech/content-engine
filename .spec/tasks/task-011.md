# TASK-011 — Distribution + Traffic + Flywheel APIs + UI

## Session Bootstrap
Skills needed: code-writing-software-development, api-design, claude-developer-platform

## Objective
Build three supporting engine API routes and their panel UIs: distribution sequence, traffic prediction, and content flywheel.

## Implementation Steps

### Distribution Engine
1. Create `/lib/prompts/distribute.ts` — Claude prompt that takes assets summary and returns:
   `{ sequence: [{ day, platform, assetType, instructions }], platformInstructions: {} }`
2. Create `/app/api/distribute/route.ts` — accept `{ assets }`, call Claude, return distribution plan
3. Create `/components/sections/DistributionPanel.tsx`:
   - Day 1/2/3 accordion sections
   - Each day lists platforms with expandable instructions
   - Copy full schedule button

### Traffic Prediction Engine
4. Create `/lib/prompts/traffic.ts` — Claude prompt returning:
   `{ demand, competition, clickPotential, seoStrength, label, estimatedRange }`
5. Create `/app/api/traffic/route.ts` — accept `{ topic, seo }`, call Claude, return prediction
6. Create `/components/sections/TrafficPanel.tsx`:
   - 4 metric cards: demand, competition, click potential, SEO strength
   - Traffic Potential label (Low/Medium/High) as large badge
   - Estimated monthly range displayed prominently

### Content Flywheel Engine
7. Create `/lib/prompts/flywheel.ts` — Claude prompt returning:
   `{ ideas: [{ topic, keywords[], cluster }] }` — 10+ items
8. Create `/app/api/flywheel/route.ts` — accept `{ topic, keywords }`, call Claude, return ideas
9. Create `/components/sections/FlywheelPanel.tsx`:
   - Grid of 10+ topic idea cards
   - Each card: topic title + keyword tags + cluster label
   - "Use this topic" button pre-fills the topic form in SessionContext

## Acceptance Criteria
- `POST /api/distribute` returns 3-day posting sequence + per-platform instructions
- `POST /api/traffic` returns demand, competition, click potential, SEO strength, label, estimated range
- `POST /api/flywheel` returns 10+ topic ideas with keyword clusters
- Distribution panel shows Day 1/2/3 sequence with expandable platform instructions
- Traffic panel shows labelled metrics and estimated monthly range
- Flywheel panel shows 10+ topic cards; clicking one pre-fills the topic form

## Key Patterns
[greenfield — no existing files to reference]

## Handoff — What Was Done
- Implemented three new prompt builders and APIs for distribution, traffic prediction, and flywheel ideation with Supabase auth/session handling, Claude JSON parsing, and persisted content assets.
- Built three new panel UIs: day-based expandable distribution scheduler with copy action, traffic metrics dashboard with potential label/range, and flywheel idea grid with one-click topic prefill.
- Wired dashboard navigation/pages for Distribution, Traffic Prediction, and Flywheel workflows; added SessionContext topic-prefill support consumed by TopicForm.

## Handoff — Patterns Learned
- Reuse the existing API route pattern: authenticate via Supabase service client, validate request body, normalize Claude JSON safely, then persist as `content_assets`.
- The repository has lint warnings and currently no `npm test` script; verification must document tests as unavailable instead of treating them as implementation regressions.
- React lint rule `react-hooks/set-state-in-effect` is enabled and enforced; synchronize editable draft fields through event handlers instead of direct `setState` inside `useEffect`.

## Handoff — Files Changed
- app/api/distribute/route.ts
- app/api/traffic/route.ts
- app/api/flywheel/route.ts
- lib/prompts/distribute.ts
- lib/prompts/traffic.ts
- lib/prompts/flywheel.ts
- components/sections/DistributionPanel.tsx
- components/sections/TrafficPanel.tsx
- components/sections/FlywheelPanel.tsx
- app/dashboard/calendar/page.tsx
- app/dashboard/analytics/page.tsx
- app/dashboard/flywheel/page.tsx
- components/dashboard/Sidebar.tsx
- lib/context/SessionContext.tsx
- components/input/TopicForm.tsx
- components/sections/SocialEditableBlock.tsx

## Status
COMPLETE
