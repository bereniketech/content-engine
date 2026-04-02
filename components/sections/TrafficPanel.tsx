'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/lib/context/SessionContext'
import { getLatestAssetByType } from '@/lib/session-assets'
import { isTopicInputData } from '@/types'

interface TrafficPrediction {
  demand: number
  competition: number
  clickPotential: number
  seoStrength: number
  label: 'Low' | 'Medium' | 'High'
  estimatedRange: string
}

const DEFAULT_SEO = JSON.stringify(
  {
    title: 'AI content workflows for marketing teams',
    primaryKeyword: 'ai content workflow',
    rankingPotential: 'Medium',
  },
  null,
  2
)

function getLabelVariant(label: TrafficPrediction['label']) {
  if (label === 'High') {
    return 'default' as const
  }

  if (label === 'Low') {
    return 'destructive' as const
  }

  return 'secondary' as const
}

function parseSeo(seoRaw: string): Record<string, unknown> {
  const parsed = JSON.parse(seoRaw)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('SEO context must be a JSON object')
  }
  return parsed as Record<string, unknown>
}

export function TrafficPanel() {
  const { sessionId, inputData, assets, upsertAsset } = useSessionContext()
  const latestSeoAsset = useMemo(() => getLatestAssetByType(assets, 'seo'), [assets])
  const [topic, setTopic] = useState('')
  const [seoRaw, setSeoRaw] = useState(DEFAULT_SEO)
  const [traffic, setTraffic] = useState<TrafficPrediction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const nextTopic = isTopicInputData(inputData) ? inputData.topic : ''
    setTopic(nextTopic)
  }, [inputData])

  useEffect(() => {
    if (latestSeoAsset) {
      setSeoRaw(JSON.stringify(latestSeoAsset.content, null, 2))
    }
  }, [latestSeoAsset])

  const handleGenerate = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const seo = parseSeo(seoRaw)

      const response = await fetch('/api/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, topic: topic.trim(), seo }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to generate traffic prediction')
      }

      const result = payload?.data?.traffic as TrafficPrediction | undefined
      if (!result) {
        throw new Error('Malformed traffic response')
      }

      setTraffic(result)
      if (payload?.data?.asset) {
        upsertAsset({
          id: payload.data.asset.id,
          assetType: payload.data.asset.assetType,
          content: payload.data.asset.content,
          version: payload.data.asset.version,
          createdAt: payload.data.asset.createdAt,
        })
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to generate traffic prediction'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Traffic Prediction Engine</CardTitle>
          <CardDescription>Estimate demand and ranking potential for a topic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="traffic-topic">
              Topic
            </label>
            <input
              id="traffic-topic"
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
              placeholder="e.g. AI SEO strategy for B2B SaaS"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="traffic-seo">
              SEO Context (JSON)
            </label>
            <textarea
              id="traffic-seo"
              value={seoRaw}
              onChange={(event) => setSeoRaw(event.target.value)}
              className="h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={handleGenerate} disabled={isLoading || topic.trim().length === 0}>
            {isLoading ? 'Predicting Traffic...' : 'Predict Traffic'}
          </Button>
        </CardContent>
      </Card>

      {traffic ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-6">
              <div>
                <p className="text-sm text-muted-foreground">Traffic Potential</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{traffic.estimatedRange}</p>
              </div>
              <Badge variant={getLabelVariant(traffic.label)} className="px-4 py-2 text-base">
                {traffic.label}
              </Badge>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Demand', value: traffic.demand },
              { label: 'Competition', value: traffic.competition },
              { label: 'Click Potential', value: traffic.clickPotential },
              { label: 'SEO Strength', value: traffic.seoStrength },
            ].map((metric) => (
              <Card key={metric.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{metric.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-foreground">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">Score out of 100</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
