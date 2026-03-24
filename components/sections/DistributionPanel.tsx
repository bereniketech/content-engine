'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DistributionSequenceItem {
  day: 1 | 2 | 3
  platform: string
  assetType: string
  instructions: string
}

interface DistributionResult {
  sequence: DistributionSequenceItem[]
  platformInstructions: Record<string, string>
}

function buildInitialExpandedState() {
  return {
    day1: true,
    day2: false,
    day3: false,
  }
}

function buildScheduleText(distribution: DistributionResult): string {
  const grouped = new Map<number, DistributionSequenceItem[]>()

  distribution.sequence.forEach((item) => {
    const existing = grouped.get(item.day) ?? []
    grouped.set(item.day, [...existing, item])
  })

  const dayBlocks = [1, 2, 3].map((day) => {
    const entries = grouped.get(day) ?? []
    const lines = entries.map(
      (entry, index) =>
        `${index + 1}. ${entry.platform} | ${entry.assetType}\n   ${entry.instructions}`
    )

    return `Day ${day}\n${lines.length > 0 ? lines.join('\n') : 'No scheduled posts.'}`
  })

  const platformLines = Object.entries(distribution.platformInstructions).map(
    ([platform, instructions]) => `- ${platform}: ${instructions}`
  )

  return `${dayBlocks.join('\n\n')}\n\nPlatform Instructions\n${platformLines.join('\n')}`
}

export function DistributionPanel() {
  const [assetsInput, setAssetsInput] = useState('')
  const [distribution, setDistribution] = useState<DistributionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedDays, setExpandedDays] = useState(buildInitialExpandedState)
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({})

  const groupedByDay = useMemo(() => {
    if (!distribution) {
      return { 1: [], 2: [], 3: [] } as Record<1 | 2 | 3, DistributionSequenceItem[]>
    }

    return {
      1: distribution.sequence.filter((item) => item.day === 1),
      2: distribution.sequence.filter((item) => item.day === 2),
      3: distribution.sequence.filter((item) => item.day === 3),
    }
  }, [distribution])

  const handleGenerate = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: assetsInput.trim() }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to generate distribution plan')
      }

      const result = payload?.data?.distribution as DistributionResult | undefined
      if (!result) {
        throw new Error('Malformed distribution response')
      }

      setDistribution(result)
      setExpandedDays(buildInitialExpandedState())
      setExpandedInstructions({})
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to generate distribution plan'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopySchedule = async () => {
    if (!distribution) {
      return
    }

    await navigator.clipboard.writeText(buildScheduleText(distribution))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Distribution Engine</CardTitle>
          <CardDescription>
            Generate a 3-day platform posting schedule from your content assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="assets-input">
              Assets Summary
            </label>
            <textarea
              id="assets-input"
              value={assetsInput}
              onChange={(event) => setAssetsInput(event.target.value)}
              className="h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
              placeholder="Paste your key assets, channels, and campaign priorities..."
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={handleGenerate} disabled={isLoading || assetsInput.trim().length === 0}>
            {isLoading ? 'Generating Schedule...' : 'Generate Distribution Schedule'}
          </Button>
        </CardContent>
      </Card>

      {distribution ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>3-Day Distribution Plan</CardTitle>
              <CardDescription>Expand each day to review platform instructions.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopySchedule}>
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy Full Schedule
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((day) => {
              const dayKey = `day${day}` as 'day1' | 'day2' | 'day3'
              const items = groupedByDay[day as 1 | 2 | 3]

              return (
                <div key={day} className="rounded-md border border-border">
                  <button
                    onClick={() =>
                      setExpandedDays((current) => ({ ...current, [dayKey]: !current[dayKey] }))
                    }
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="font-medium text-foreground">Day {day}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expandedDays[dayKey] ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {expandedDays[dayKey] ? (
                    <div className="space-y-3 border-t border-border px-4 py-3">
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No items scheduled for this day.</p>
                      ) : (
                        items.map((item, index) => {
                          const instructionKey = `${day}-${item.platform}-${index}`
                          const isExpanded = expandedInstructions[instructionKey]

                          return (
                            <div key={instructionKey} className="rounded border border-border">
                              <button
                                onClick={() =>
                                  setExpandedInstructions((current) => ({
                                    ...current,
                                    [instructionKey]: !current[instructionKey],
                                  }))
                                }
                                className="flex w-full items-center justify-between px-3 py-2 text-left"
                              >
                                <span className="text-sm font-medium text-foreground">
                                  {item.platform} • {item.assetType}
                                </span>
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                              {isExpanded ? (
                                <p className="border-t border-border px-3 py-2 text-sm text-muted-foreground">
                                  {item.instructions}
                                </p>
                              ) : null}
                            </div>
                          )
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
