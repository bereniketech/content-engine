import { CalendarPanel } from '@/components/sections/CalendarPanel'

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Calendar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview your weekday publishing cadence and jump directly into each channel editor.
        </p>
      </div>

      <CalendarPanel />
    </div>
  )
}
