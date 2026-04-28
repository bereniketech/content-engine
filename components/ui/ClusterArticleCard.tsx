'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ClusterArticle } from '@/lib/cluster'

interface ClusterArticleCardProps {
  article: ClusterArticle
  onGenerate: (articleId: string, keyword: string) => void
  onStatusChange: (articleId: string, status: ClusterArticle['status']) => void
}

function formatVolume(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function difficultyColor(d: number): string {
  if (d <= 33) return 'bg-green-500'
  if (d <= 66) return 'bg-amber-500'
  return 'bg-red-500'
}

function intentColor(intent: string): string {
  switch (intent) {
    case 'commercial': return 'bg-blue-100 text-blue-800'
    case 'transactional': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export function ClusterArticleCard({ article, onGenerate, onStatusChange }: ClusterArticleCardProps) {
  return (
    <div className={`border rounded-lg p-4 space-y-3 bg-white ${article.isPillar ? 'border-indigo-400 ring-1 ring-indigo-200' : ''}`}>
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono text-muted-foreground">#{article.publishOrder}</span>
        {article.isPillar && <span title="Pillar article">👑</span>}
        <span className="font-semibold text-sm leading-tight flex-1">{article.keyword}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${intentColor(article.searchIntent)}`}>
          {article.searchIntent}
        </span>
        <span className="text-xs text-muted-foreground">{formatVolume(article.estimatedVolume)} / mo</span>
        <div className="flex items-center gap-1">
          <div className={`h-1.5 rounded-full ${difficultyColor(article.difficulty)}`} style={{ width: `${Math.max(8, article.difficulty)}px` }} />
          <span className="text-xs text-muted-foreground">{article.difficulty}</span>
        </div>
      </div>

      <div>
        <select
          value={article.status}
          onChange={(e) => onStatusChange(article.id, e.target.value as ClusterArticle['status'])}
          className="w-full text-xs border rounded px-2 py-1 bg-white"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div>
        {article.sessionId ? (
          <a
            href={`/dashboard?sessionId=${article.sessionId}`}
            className="text-xs text-indigo-600 hover:underline"
          >
            View Article →
          </a>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={article.status === 'published'}
            className="w-full text-xs h-7"
            onClick={() => onGenerate(article.id, article.keyword)}
          >
            Generate Article
          </Button>
        )}
      </div>

      {article.internalLinkTarget && (
        <p className="text-xs text-muted-foreground truncate" title={article.internalLinkTarget}>
          Links to: {article.internalLinkTarget}
        </p>
      )}
    </div>
  )
}
