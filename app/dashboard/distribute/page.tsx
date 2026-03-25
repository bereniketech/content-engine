import { DistributionPanel } from '@/components/sections/DistributionPanel'

export default function DistributePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Distribute</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn the active session assets into a practical 3-day distribution plan.
        </p>
      </div>

      <DistributionPanel />
    </div>
  )
}