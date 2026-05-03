import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { dataDrivenPipeline } from '@/lib/inngest/data-driven-pipeline'
import { scheduledPublish } from '@/lib/inngest/schedule-publish'
import { runDetection } from '@/lib/inngest/detection-hook'
import { aiosDailyStandup } from '@/lib/inngest/aios-daily-standup'
import { aiosWeeklyReview } from '@/lib/inngest/aios-weekly-review'
import { aiosAnalyticsSnapshot } from '@/lib/inngest/aios-analytics-snapshot'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dataDrivenPipeline, scheduledPublish, runDetection, aiosDailyStandup, aiosWeeklyReview, aiosAnalyticsSnapshot],
})
