---
task: "045"
feature: competitive-gaps-roadmap
rec: R8
title: "Add Clusters and Brand Voice nav links and GET /api/cluster list endpoint"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["033", "034"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`
- `.kit/skills/development/api-design/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Add nav links for Brand Voice and Clusters to the dashboard, and add a `GET /api/cluster` endpoint that lists all clusters for the user (needed by the clusters page).

## Files

### Modify
- `D:/content-engine/app/dashboard/layout.tsx`
- `D:/content-engine/app/api/cluster/route.ts`

## Implementation Steps

1. Add to dashboard nav:
   - "Brand Voice" → `/dashboard/brand-voice` (Lucide `Mic` or `Fingerprint` icon)
   - "Clusters" → `/dashboard/clusters` (Lucide `Network` or `GitBranch` icon)
   - "Workspace" → `/dashboard/workspace` (Lucide `Users` icon)

2. Add `GET` handler to `app/api/cluster/route.ts`:
```typescript
export async function GET(request: NextRequest) {
  // Auth
  // Query: SELECT id, pillar_keyword, name, total_articles, published_count, created_at
  //   FROM content_clusters WHERE user_id = auth.uid() ORDER BY created_at DESC
  // Return: { data: ClusterSummary[] }
}
```
This is a lightweight list (no articles array) to avoid large payloads.

3. Update `app/dashboard/clusters/page.tsx` to use `GET /api/cluster` for the left panel cluster list.

## Test Cases

- Dashboard layout shows 3 new nav links
- `GET /api/cluster` returns list without articles array (summary only)
- Unauthenticated `GET /api/cluster` → 401

## Decision Rules
- Cluster list response should NOT include the full `articles` JSONB array — return only summary fields.
- Nav links added in logical grouping (separate from core pipeline links).

## Acceptance Criteria
- Brand Voice, Clusters, Workspace nav links in dashboard.
- `GET /api/cluster` returns array of cluster summaries.
- `/dashboard/clusters` uses list endpoint for left panel.

Status: COMPLETE
Completed: 2026-04-28T10:30:00Z
