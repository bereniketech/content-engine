import { TrafficPanel } from '@/components/sections/TrafficPanel'

export default function TrafficPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Traffic</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Forecast traffic potential for the active topic and SEO strategy.
        </p>
      </div>

      <TrafficPanel />
    </div>
  )
}