'use client'

import { Badge } from '@/components/ui/badge'
import { useAppConfig } from '@/lib/hooks/useAppConfig'

interface DetectionBadgeProps {
  originalityScore: number | null
  aiScore: number | null
  isLoading?: boolean
  apiKeyMissing?: boolean
}

function originalityClass(score: number, high: number, med: number): string {
  if (score >= high) return 'bg-green-100 text-green-800 border-green-200'
  if (score >= med) return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function aiClass(score: number, low: number, med: number): string {
  if (score <= low) return 'bg-green-100 text-green-800 border-green-200'
  if (score <= med) return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

export function DetectionBadge({ originalityScore, aiScore, isLoading, apiKeyMissing }: DetectionBadgeProps) {
  const config = useAppConfig()
  const t = config.detection_score_thresholds

  if (apiKeyMissing) {
    return (
      <a href="/dashboard/settings" className="text-sm text-blue-600 underline">
        Connect Originality.ai for plagiarism detection
      </a>
    )
  }

  if (isLoading) {
    return <span className="animate-pulse text-sm text-gray-400">Checking originality…</span>
  }

  return (
    <div className="flex gap-2 items-center">
      <Badge
        variant="outline"
        className={originalityScore !== null ? originalityClass(originalityScore, t?.originality_high ?? 90, t?.originality_med ?? 70) : ''}
      >
        Original: {originalityScore?.toFixed(0) ?? '—'}%
      </Badge>
      <Badge
        variant="outline"
        className={aiScore !== null ? aiClass(aiScore, t?.ai_low ?? 20, t?.ai_med ?? 40) : ''}
      >
        AI: {aiScore?.toFixed(0) ?? '—'}%
      </Badge>
    </div>
  )
}
