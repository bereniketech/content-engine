'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopicalAuthorityPlanner } from '@/components/sections/TopicalAuthorityPlanner'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { ContentCluster, ClusterArticle } from '@/lib/cluster'

export default function ClustersPage() {
  const router = useRouter()
  const [clusters, setClusters] = useState<ContentCluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<ContentCluster | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? ''
  }, [])

  const fetchClusters = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/cluster', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = (await res.json()) as { data?: ContentCluster[]; error?: { message: string } }
      if (!res.ok || !json.data) {
        setError(json.error?.message ?? 'Failed to load clusters')
        return
      }
      setClusters(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clusters')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    void fetchClusters()
  }, [fetchClusters])

  const handleClusterSelect = useCallback(async (clusterId: string) => {
    // If already in clusters list, use that; otherwise fetch full detail
    const existing = clusters.find((c) => c.id === clusterId)
    if (existing) {
      setSelectedCluster(existing)
      return
    }
    try {
      const token = await getToken()
      const res = await fetch(`/api/cluster/${clusterId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = (await res.json()) as { data?: ContentCluster }
      if (json.data) setSelectedCluster(json.data)
    } catch {
      // ignore — cluster stays unselected
    }
  }, [clusters, getToken])

  const handleClusterGenerate = useCallback(async (pillarKeyword: string) => {
    const token = await getToken()
    const res = await fetch('/api/cluster', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ pillarKeyword }),
    })
    const json = (await res.json()) as { data?: ContentCluster; error?: { message: string } }
    if (!res.ok || !json.data) {
      throw new Error(json.error?.message ?? 'Cluster generation failed')
    }
    setClusters((prev) => [json.data!, ...prev])
    setSelectedCluster(json.data)
  }, [getToken])

  const handleArticleGenerate = useCallback((clusterId: string, articleId: string, keyword: string) => {
    router.push(`/dashboard?clusterArticle=${articleId}&keyword=${encodeURIComponent(keyword)}&clusterId=${clusterId}`)
  }, [router])

  const handleArticleStatusChange = useCallback(async (clusterId: string, articleId: string, status: ClusterArticle['status']) => {
    try {
      const token = await getToken()
      const res = await fetch(`/api/cluster/${clusterId}/article/${articleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      })
      const json = (await res.json()) as { data?: ContentCluster }
      if (json.data) {
        setClusters((prev) => prev.map((c) => (c.id === clusterId ? json.data! : c)))
        setSelectedCluster((prev) => (prev?.id === clusterId ? json.data : prev))
      }
    } catch {
      // ignore — UI stays optimistic; user can retry
    }
  }, [getToken])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Topical Authority Planner</h1>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Topical Authority Planner</h1>
        <p className="text-destructive">{error}</p>
        <button className="text-sm underline text-primary" onClick={() => void fetchClusters()}>Retry</button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 h-full">
      <div>
        <h1 className="text-2xl font-semibold">Topical Authority Planner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build content clusters around pillar keywords to establish topical authority.
        </p>
      </div>

      <TopicalAuthorityPlanner
        clusters={clusters}
        selectedCluster={selectedCluster}
        onClusterSelect={(id) => void handleClusterSelect(id)}
        onClusterGenerate={handleClusterGenerate}
        onArticleGenerate={handleArticleGenerate}
        onArticleStatusChange={(cId, aId, s) => void handleArticleStatusChange(cId, aId, s)}
      />
    </div>
  )
}
