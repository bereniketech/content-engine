'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ClusterArticleCard } from '@/components/ui/ClusterArticleCard'
import type { ContentCluster, ClusterArticle } from '@/lib/cluster'

interface TopicalAuthorityPlannerProps {
  clusters: ContentCluster[]
  selectedCluster?: ContentCluster
  onClusterSelect: (clusterId: string) => void
  onClusterGenerate: (pillarKeyword: string) => Promise<void>
  onArticleGenerate: (clusterId: string, articleId: string, keyword: string) => void
  onArticleStatusChange: (clusterId: string, articleId: string, status: ClusterArticle['status']) => void
}

export function TopicalAuthorityPlanner({
  clusters,
  selectedCluster,
  onClusterSelect,
  onClusterGenerate,
  onArticleGenerate,
  onArticleStatusChange,
}: TopicalAuthorityPlannerProps) {
  const [showNewCluster, setShowNewCluster] = useState(false)
  const [pillarKeyword, setPillarKeyword] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  async function handleBuildCluster() {
    if (!pillarKeyword.trim()) return
    setGenerating(true)
    setGenError(null)
    try {
      await onClusterGenerate(pillarKeyword.trim())
      setPillarKeyword('')
      setShowNewCluster(false)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate cluster')
    } finally {
      setGenerating(false)
    }
  }

  const sortedArticles = selectedCluster
    ? [...selectedCluster.articles].sort((a, b) => a.publishOrder - b.publishOrder)
    : []

  const completionPct = selectedCluster && selectedCluster.totalArticles > 0
    ? Math.round((selectedCluster.publishedCount / selectedCluster.totalArticles) * 100)
    : 0

  return (
    <div className="flex gap-6 h-full">
      {/* Left panel: cluster list */}
      <div className="w-72 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Clusters</h2>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => setShowNewCluster((v) => !v)}
          >
            + New
          </Button>
        </div>

        {showNewCluster && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Pillar keyword (e.g. email marketing)"
              value={pillarKeyword}
              onChange={(e) => setPillarKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleBuildCluster() }}
            />
            {genError && <p className="text-xs text-red-500">{genError}</p>}
            <Button
              size="sm"
              disabled={generating || !pillarKeyword.trim()}
              className="w-full text-xs h-7"
              onClick={handleBuildCluster}
            >
              {generating ? 'Generating articles...' : 'Build Cluster'}
            </Button>
          </div>
        )}

        <div className="space-y-1">
          {clusters.length === 0 && !showNewCluster && (
            <p className="text-xs text-muted-foreground py-2">No clusters yet. Create one to start planning topical authority.</p>
          )}
          {clusters.map((c) => {
            const pct = c.totalArticles > 0 ? Math.round((c.publishedCount / c.totalArticles) * 100) : 0
            const isSelected = selectedCluster?.id === c.id
            return (
              <button
                key={c.id}
                onClick={() => onClusterSelect(c.id)}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${isSelected ? 'border-indigo-400 bg-indigo-50' : 'hover:bg-muted/50 border-transparent'}`}
              >
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{pct}% complete · {c.publishedCount}/{c.totalArticles} published</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel: selected cluster */}
      <div className="flex-1 min-w-0">
        {!selectedCluster ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Select a cluster to view articles
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-semibold">{selectedCluster.pillarKeyword}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedCluster.publishedCount} / {selectedCluster.totalArticles} articles published
              </p>
              <div className="h-2 bg-muted rounded-full overflow-hidden w-48">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedArticles.map((article) => (
                <ClusterArticleCard
                  key={article.id}
                  article={article}
                  onGenerate={(articleId, keyword) => onArticleGenerate(selectedCluster.id, articleId, keyword)}
                  onStatusChange={(articleId, status) => onArticleStatusChange(selectedCluster.id, articleId, status)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
