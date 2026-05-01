'use client'

import { useEffect, useState } from 'react'

export interface AppConfig {
  brand_score_thresholds?: { good: number; fair: number }
  detection_score_thresholds?: {
    originality_high: number
    originality_med: number
    ai_low: number
    ai_med: number
  }
  seo_rank_thresholds?: { top: number; mid: number }
}

let cache: AppConfig | null = null

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(cache ?? {})

  useEffect(() => {
    if (cache) return
    fetch('/api/config')
      .then((r) => r.json())
      .then((d: AppConfig) => {
        cache = d
        setConfig(d)
      })
      .catch(() => {})
  }, [])

  return config
}
