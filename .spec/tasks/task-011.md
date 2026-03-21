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

## Handoff
- Completed: [ ]
- Next task: task-012.md
- Notes: ___
