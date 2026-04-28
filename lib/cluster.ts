export interface ClusterArticle {
  id: string
  keyword: string
  searchIntent: string
  estimatedVolume: number
  difficulty: number
  internalLinkTarget?: string
  publishOrder: number
  isPillar: boolean
  status: 'pending' | 'in_progress' | 'published'
  sessionId: string | null
}

export interface ContentCluster {
  id: string
  userId: string
  pillarKeyword: string
  name: string
  totalArticles: number
  publishedCount: number
  articles: ClusterArticle[]
  createdAt: string
  updatedAt: string
}

interface RawArticle {
  keyword?: string
  searchIntent?: string
  estimatedVolume?: number
  difficulty?: number
  internalLinkTarget?: string
  publishOrder?: number
}

interface ClusterRaw {
  pillarArticle: RawArticle
  supportingArticles: RawArticle[]
}

export function mapCluster(row: Record<string, unknown>): ContentCluster {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    pillarKeyword: row.pillar_keyword as string,
    name: row.name as string,
    totalArticles: row.total_articles as number,
    publishedCount: row.published_count as number,
    articles: (row.articles as ClusterArticle[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

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
- difficulty: 1-100 (estimated SEO competition)
- searchIntent must be one of: informational, commercial, transactional`
}

export function normalizeClusterArticles(parsed: ClusterRaw): ClusterArticle[] {
  const { pillarArticle, supportingArticles } = parsed
  return [
    {
      id: crypto.randomUUID(),
      keyword: pillarArticle.keyword ?? '',
      searchIntent: pillarArticle.searchIntent ?? 'informational',
      estimatedVolume: pillarArticle.estimatedVolume ?? 0,
      difficulty: pillarArticle.difficulty ?? 0,
      publishOrder: pillarArticle.publishOrder ?? 1,
      isPillar: true,
      status: 'pending',
      sessionId: null,
    },
    ...(supportingArticles ?? []).map((a, i) => ({
      id: crypto.randomUUID(),
      keyword: a.keyword ?? '',
      searchIntent: a.searchIntent ?? 'informational',
      estimatedVolume: a.estimatedVolume ?? 0,
      difficulty: a.difficulty ?? 0,
      internalLinkTarget: a.internalLinkTarget,
      publishOrder: a.publishOrder ?? i + 2,
      isPillar: false,
      status: 'pending' as const,
      sessionId: null,
    })),
  ]
}
