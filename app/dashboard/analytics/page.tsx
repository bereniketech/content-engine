import { TrafficPanel } from '@/components/sections/TrafficPanel'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Traffic Prediction</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estimate demand, competition, and monthly traffic range before publishing.
        </p>
      </div>

      <TrafficPanel />
    </div>
  )
}
