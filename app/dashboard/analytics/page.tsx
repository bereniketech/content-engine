import { AnalyticsDashboard } from '@/components/sections/AnalyticsDashboard'
import { RefreshTriggerBanner } from '@/components/sections/RefreshTriggerBanner'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live data from Google Analytics 4 and Search Console.
        </p>
      </div>
      <RefreshTriggerBanner />
      <AnalyticsDashboard />
    </div>
  )
}
