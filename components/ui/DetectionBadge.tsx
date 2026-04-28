'use client'

import { Badge } from '@/components/ui/badge'

interface DetectionBadgeProps {
  originalityScore: number | null
  aiScore: number | null
  isLoading?: boolean
  apiKeyMissing?: boolean
}

function originalityClass(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-800 border-green-200'
  if (score >= 70) return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function aiClass(score: number): string {
  if (score <= 20) return 'bg-green-100 text-green-800 border-green-200'
  if (score <= 40) return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

export function DetectionBadge({ originalityScore, aiScore, isLoading, apiKeyMissing }: DetectionBadgeProps) {
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
        className={originalityScore !== null ? originalityClass(originalityScore) : ''}
      >
        Original: {originalityScore?.toFixed(0) ?? '—'}%
      </Badge>
      <Badge
        variant="outline"
        className={aiScore !== null ? aiClass(aiScore) : ''}
      >
        AI: {aiScore?.toFixed(0) ?? '—'}%
      </Badge>
    </div>
  )
}
