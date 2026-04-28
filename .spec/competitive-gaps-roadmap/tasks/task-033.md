---
task: "033"
feature: competitive-gaps-roadmap
rec: R8
title: "Create POST /api/cluster and GET/PATCH cluster routes"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["032"]
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
Create all cluster API routes: generate a topical cluster with Claude (POST), fetch by ID (GET), and update individual article status (PATCH).

## Files

### Create
- `D:/content-engine/app/api/cluster/route.ts`
- `D:/content-engine/app/api/cluster/[id]/route.ts`
- `D:/content-engine/app/api/cluster/[id]/article/[articleId]/route.ts`
- `D:/content-engine/lib/cluster.ts`

## Dependencies
- TASK-032: `content_clusters` table
- `lib/auth.ts`, `lib/ai.ts`, `lib/extract-json.ts`
- `GOOGLE_SEARCH_API_KEY` for volume estimates

## API Contracts

**POST /api/cluster:**
```typescript
// Request
{ pillarKeyword: string; name?: string }
// Response 201 (SSE stream or JSON after completion)
{ data: { clusterId: string; articles: ClusterArticle[] } }
// Response 409: max 20 clusters reached
```

**GET /api/cluster/[id]:**
```typescript
// Response 200: { data: ContentCluster }
// Response 404
```

**PATCH /api/cluster/[id]/article/[articleId]:**
```typescript
// Request
{ status: 'pending' | 'in_progress' | 'published'; sessionId?: string }
// Response 200: { data: ContentCluster }
```

## Codebase Context

Google Search API for volume estimates — use `lib/google-search.ts` which already wraps the API. The volume can be a rough estimate from search results count or a dedicated keyword API if available.

`lib/extract-json.ts` parses Claude JSON responses. Use it to parse the cluster generation output.

Claude cluster generation prompt must produce structured JSON:
```json
{
  "pillarArticle": { "keyword": "...", "searchIntent": "informational", "estimatedVolume": 5000, "difficulty": 45, "publishOrder": 1 },
  "supportingArticles": [
    { "keyword": "...", "searchIntent": "...", "estimatedVolume": 1200, "difficulty": 30, "internalLinkTarget": "pillar article", "publishOrder": 2 }
  ]
}
```

## Implementation Steps

1. Create `lib/cluster.ts`:

```typescript
export function buildClusterPrompt(pillarKeyword: string): string {
  return `Generate a topical authority content cluster for the keyword: "${pillarKeyword}"

Return JSON with exactly this structure:
{
  "pillarArticle": {
    "keyword": "the exact pillar keyword",
    "searchIntent": "informational",
    "estimatedVolume": 0,
    "difficulty": 0,
    "publishOrder": 1
  },
  "supportingArticles": [
    // 8-12 items
    {
      "keyword": "supporting keyword",
      "searchIntent": "informational|commercial|transactional",
      "estimatedVolume": 0,
      "difficulty": 0,
      "internalLinkTarget": "brief description of the page this links to",
      "publishOrder": 2
    }
  ]
}

Rules:
- Include 8-12 supporting articles
- Each should target a unique keyword related to ${pillarKeyword}
- publishOrder: 1 = pillar first, then supporting in logical sequence
- difficulty: 1-100 (estimated SEO competition)`
}

export function normalizeClusterArticles(parsed: ClusterRaw): ClusterArticle[] {
  const { pillarArticle, supportingArticles } = parsed
  return [
    { id: crypto.randomUUID(), ...pillarArticle, isPillar: true, status: 'pending', sessionId: null },
    ...supportingArticles.map(a => ({ id: crypto.randomUUID(), ...a, isPillar: false, status: 'pending', sessionId: null }))
  ]
}
```

2. Create `app/api/cluster/route.ts` (POST):
   - Auth
   - Parse `{ pillarKeyword, name }`
   - Count user's clusters; if ≥20 return 409
   - Call `buildClusterPrompt`, then `createMessage` (haiku, max 2000 tokens)
   - Parse with `extractJsonPayload`, normalize with `normalizeClusterArticles`
   - Insert into `content_clusters`
   - Return 201

3. Create `app/api/cluster/[id]/route.ts` (GET):
   - Auth
   - Query `content_clusters WHERE id = params.id` (RLS enforces user_id)
   - Return 200 or 404

4. Create `app/api/cluster/[id]/article/[articleId]/route.ts` (PATCH):
   - Auth
   - Fetch cluster by `params.id`
   - Find article in `articles` JSONB array by `id === params.articleId`
   - Update article status (and sessionId if provided)
   - Update `published_count` if status changes to/from 'published'
   - Supabase UPDATE with new `articles` array
   - Return updated cluster

## Test Cases

- POST valid pillarKeyword → 201 with 9-13 articles
- POST when 20 clusters exist → 409
- GET by id → 200 with cluster
- GET non-existent id → 404
- PATCH article status to 'published' → published_count incremented
- PATCH article status from 'published' to 'in_progress' → published_count decremented

## Decision Rules
- Cluster articles get UUIDs at generation time (server-side `crypto.randomUUID()`).
- PATCH must atomically read-modify-write the JSONB articles array.
- `published_count` is always recomputed from articles array (count where status='published'), not incremented/decremented.
- Volume estimates can be 0 if Google Search API doesn't return them — acceptable for MVP.

## Acceptance Criteria
- `POST /api/cluster` generates 9-13 articles with Claude and stores cluster.
- `GET /api/cluster/[id]` returns cluster with articles array.
- `PATCH /api/cluster/[id]/article/[articleId]` updates article status and recomputes published_count.
- All routes auth-required.
- Max 20 clusters enforced with 409 response.

Status: COMPLETE
Completed: 2026-04-28T10:00:00Z
