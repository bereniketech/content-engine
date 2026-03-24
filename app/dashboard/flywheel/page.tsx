import { FlywheelPanel } from '@/components/sections/FlywheelPanel'

export default function FlywheelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Flywheel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate connected topic clusters and push top ideas into the topic workflow.
        </p>
      </div>

      <FlywheelPanel />
    </div>
  )
}
