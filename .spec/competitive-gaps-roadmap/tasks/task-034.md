---
task: "034"
feature: competitive-gaps-roadmap
rec: R8
title: "Create TopicalAuthorityPlanner component and /dashboard/clusters page"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["033"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`
- `.kit/skills/development/build-website-web-app/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Build `TopicalAuthorityPlanner` component with pillar keyword input, cluster generation, and cluster article grid. Create `ClusterArticleCard` and the `/dashboard/clusters` page.

## Files

### Create
- `D:/content-engine/components/sections/TopicalAuthorityPlanner.tsx`
- `D:/content-engine/components/ui/ClusterArticleCard.tsx`
- `D:/content-engine/app/dashboard/clusters/page.tsx`

## Dependencies
- TASK-033: All cluster API routes

## API Contracts (consumed)

```typescript
interface ClusterArticle {
  id: string
  keyword: string
  searchIntent: string
  estimatedVolume: number
  difficulty: number
  internalLinkTarget?: string
  publishOrder: number
  isPillar: boolean
  status: 'pending' | 'in_progress' | 'published'
  sessionId?: string | null
}

interface ContentCluster {
  id: string
  pillarKeyword: string
  name: string
  totalArticles: number
  publishedCount: number
  articles: ClusterArticle[]
  createdAt: string
}
```

## Implementation Steps

1. Create `components/ui/ClusterArticleCard.tsx`:

```typescript
interface ClusterArticleCardProps {
  article: ClusterArticle
  onGenerate: (articleId: string, keyword: string) => void
  onStatusChange: (articleId: string, status: ClusterArticle['status']) => void
}
```

Card layout:
- Header: `#{publishOrder}` badge + keyword (bold) + pillar crown icon if isPillar
- Row 1: search intent badge (color-coded), volume (1.2K format), difficulty bar (colored 1-33=green, 34-66=amber, 67-100=red)
- Row 2: status select dropdown (pending/in_progress/published)
- Footer: "Generate Article" button (disabled if status='published')
- If sessionId: "View Article →" link instead of Generate button

2. Create `components/sections/TopicalAuthorityPlanner.tsx`:

```typescript
interface TopicalAuthorityPlannerProps {
  clusters: ContentCluster[]
  selectedCluster?: ContentCluster
  onClusterSelect: (clusterId: string) => void
  onClusterGenerate: (pillarKeyword: string) => Promise<void>
  onArticleGenerate: (clusterId: string, articleId: string, keyword: string) => void
  onArticleStatusChange: (clusterId: string, articleId: string, status: string) => void
}
```

Left panel: list of clusters (name, completion %, createdAt)
Right panel (when cluster selected):
- Header: pillar keyword + "X/Y articles published" + completion progress bar
- Grid: 3-column card grid of `ClusterArticleCard` sorted by publishOrder
- Pillar article shown first with distinct styling (wider card or highlighted border)

Cluster input (shown when no clusters or "Add new" button clicked):
- Text input for pillar keyword
- "Build Cluster" button → calls `onClusterGenerate`
- Progress indicator (spinner + "Generating X articles...") during generation

3. Create `app/dashboard/clusters/page.tsx`:
   - `'use client'`
   - Fetch `GET /api/cluster/list` (implement `GET /api/cluster` to return list — add to route.ts from TASK-033)
   - Fetch selected cluster details on selection
   - Wire `onArticleGenerate`: `router.push(`/dashboard?clusterArticle=${articleId}&keyword=${keyword}`)` — parent dashboard handles pre-loading brief
   - Wire `onArticleStatusChange`: PATCH `/api/cluster/[id]/article/[articleId]`

## Test Cases

- ClusterArticleCard with status='pending' shows "Generate Article" button enabled
- ClusterArticleCard with status='published' shows "View Article" link
- Difficulty 80 → red bar color
- TopicalAuthorityPlanner shows cluster list on left, article grid on right
- "Build Cluster" → POST API called → cluster appears in list
- Progress bar shows correct % (publishedCount / totalArticles)

## Decision Rules
- Completion % = `(publishedCount / totalArticles) * 100`, rounded to integer.
- Volume format: 1200 → "1.2K", 15000 → "15K".
- Difficulty color: ≤33 green, 34-66 amber, 67-100 red.
- Pillar article card must be visually distinct (full-width row or different background).

## Acceptance Criteria
- TopicalAuthorityPlanner shows clusters and article grid.
- ClusterArticleCard shows keyword, volume, difficulty, status, generate button.
- "Build Cluster" calls API and shows generated cluster.
- Article "Generate" navigates to dashboard with keyword pre-filled.
- `/dashboard/clusters` page accessible.

Status: COMPLETE
Completed: 2026-04-28T10:05:00Z
