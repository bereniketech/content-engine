'use client'

import { useState } from 'react'
import { useAppConfig } from '@/lib/hooks/useAppConfig'

interface BrandScoreCardProps {
  score: number
  violations: string[]
  voiceName: string
  isLoading?: boolean
}

function scoreColor(score: number, good: number, fair: number): string {
  if (score >= good) return '#22c55e'
  if (score >= fair) return '#f59e0b'
  return '#ef4444'
}

export function BrandScoreCard({ score, violations, voiceName, isLoading }: BrandScoreCardProps) {
  const [showViolations, setShowViolations] = useState(false)
  const config = useAppConfig()
  const thresholds = config.brand_score_thresholds
  const color = scoreColor(score, thresholds?.good ?? 80, thresholds?.fair ?? 60)

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm w-fit" data-testid="brand-score-card">
      {isLoading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full border-4 border-muted animate-spin border-t-primary" />
          <span className="text-xs text-muted-foreground">Scoring…</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: `conic-gradient(${color} ${score}%, #e5e7eb ${score}%)`,
            }}
          >
            <span
              className="w-12 h-12 rounded-full bg-card flex items-center justify-center text-sm font-semibold"
              style={{ color }}
            >
              <span data-testid="brand-score-value">{score}</span>
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{voiceName}</span>
          {violations.length > 0 && (
            <div className="w-full">
              <button
                className="text-xs text-muted-foreground underline"
                onClick={() => setShowViolations((v) => !v)}
              >
                {showViolations ? 'Hide issues' : `Show issues (${violations.length})`}
              </button>
              {showViolations && (
                <ul className="mt-1 space-y-0.5">
                  {violations.map((v, i) => (
                    <li key={i} className="text-xs text-destructive">
                      • {v}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
