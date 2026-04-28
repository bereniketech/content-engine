---
task: "025"
feature: competitive-gaps-roadmap
rec: R2
title: "Create POST/GET /api/brief and PATCH /api/brief/[id] routes"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["024"]
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create all brief API routes: generate a brief from research data (POST), fetch by sessionId (GET), and update/approve (PATCH).

## Files

### Create
- `D:/content-engine/app/api/brief/route.ts`
- `D:/content-engine/app/api/brief/[id]/route.ts`
- `D:/content-engine/lib/brief.ts`

## Dependencies
- TASK-024: `briefs` table exists
- `lib/auth.ts`, `lib/ai.ts`, `lib/extract-json.ts`

## API Contracts

**POST /api/brief:**
```typescript
// Request
{ sessionId: string }
// Response 201: { data: Brief }
// Upserts — updates if already exists for session
```

**GET /api/brief?sessionId=:**
```typescript
// Response 200: { data: Brief }
// Response 404: { error: { code: 'not_found' } }
```

**PATCH /api/brief/[id]:**
```typescript
// Request
{
  keyword?: string; searchIntent?: string; audience?: string
  suggestedH1?: string; h2Outline?: string[]; competitorGaps?: string[]
  recommendedWordCount?: number; ctas?: string[]; status?: 'draft' | 'approved'
}
// Response 200: { data: Brief }
// Response 404: not found/not owned
```

## Codebase Context

Research data is stored in `content_assets` as `asset_type = 'research'`. To generate a brief, the route must:
1. Query `content_assets` WHERE `session_id = sessionId AND asset_type = 'research'` ORDER BY created_at DESC LIMIT 1
2. Extract research data from `content.intent`, `content.keywords`, `content.faqs`, `content.competitors`, `content.gaps`
3. Pass to Claude prompt

`lib/extract-json.ts` exports `extractJsonPayload(text: string): unknown` — use to parse Claude response.

## Implementation Steps

1. Create `lib/brief.ts`:

```typescript
export function generateBriefPrompt(researchData: ResearchAsset, topic: string): string {
  return `Generate a structured content brief as JSON for the topic: "${topic}"

Research findings:
- Intent: ${researchData.intent}
- Keywords: ${researchData.keywords?.join(', ')}
- Audience signals: ${researchData.faqs?.map(f => f.question).join('; ').slice(0, 500)}
- Content gaps: ${researchData.gaps?.join('; ')}
- Competitors: ${researchData.competitors?.map(c => c.name).join(', ')}

Return JSON:
{
  "keyword": "primary keyword",
  "search_intent": "informational|commercial|transactional",
  "audience": "target audience description",
  "suggested_h1": "H1 title suggestion",
  "h2_outline": ["Section 1", "Section 2", "Section 3", "Section 4", "Section 5"],
  "competitor_gaps": ["gap 1", "gap 2"],
  "recommended_word_count": 1500,
  "ctas": ["CTA 1", "CTA 2"]
}`
}

export function injectBriefIntoGenerationContext(brief: Brief): string {
  const text = `
## Content Brief
**Target Keyword:** ${brief.keyword}
**Search Intent:** ${brief.searchIntent}
**Target Audience:** ${brief.audience}
**Suggested H1:** ${brief.suggestedH1}
**Recommended Word Count:** ${brief.recommendedWordCount}

**Article Outline (H2s):**
${brief.h2Outline.map((h, i) => `${i+1}. ${h}`).join('\n')}

**Competitor Gaps to Address:**
${brief.competitorGaps.map(g => `- ${g}`).join('\n')}

**Calls to Action:**
${brief.ctas.map(c => `- ${c}`).join('\n')}
`.trim()
  // Guard: max 4000 tokens (~16000 chars)
  return text.slice(0, 16000)
}
```

2. Create `app/api/brief/route.ts`:

**POST:**
- Auth
- Parse `{ sessionId }`
- Fetch research asset from `content_assets`
- Fetch session to get topic from `input_data.topic`
- Call `generateBriefPrompt`, then `createMessage` (haiku, max 800 tokens)
- Parse JSON with `extractJsonPayload`
- Upsert into `briefs` using `INSERT ... ON CONFLICT (session_id) DO UPDATE`
- Return 201 with brief

**GET:**
- Auth
- Parse `sessionId` from query params
- Fetch brief WHERE `session_id = sessionId AND user_id = auth.uid()`
- Return 200 or 404

3. Create `app/api/brief/[id]/route.ts` — PATCH:
- Auth
- Build update object from provided camelCase fields → snake_case DB columns
- Supabase UPDATE WHERE id = params.id (RLS enforces user_id)
- Return updated row or 404

## Test Cases

- POST with valid sessionId that has research data → generates and stores brief → 201
- POST with sessionId that has no research data → 422 with 'no research data found'
- POST for existing brief → updates existing row (upsert) → 201
- GET by sessionId → 200 with brief
- GET by sessionId with no brief → 404
- PATCH status='approved' → brief status updated
- All routes → 401 when unauthenticated

## Decision Rules
- POST always upserts — never creates duplicate briefs per session.
- `injectBriefIntoGenerationContext` enforces 16000 char limit (≈4000 tokens).
- Use haiku for brief generation — keep cost low.
- Snake_case ↔ camelCase transformation in route layer.

## Acceptance Criteria
- `POST /api/brief` generates brief from research data and upserts.
- `GET /api/brief?sessionId=` returns brief or 404.
- `PATCH /api/brief/[id]` partially updates brief.
- `lib/brief.ts` exports both prompt builder and context injector.
- Auth required on all routes.

Status: COMPLETE
Completed: 2026-04-28T07:29:28Z
