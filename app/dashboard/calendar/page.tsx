import { DistributionPanel } from '@/components/sections/DistributionPanel'

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Distribution</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan your 3-day publishing sequence across channels.
        </p>
      </div>

      <DistributionPanel />
    </div>
  )
}
