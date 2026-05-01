import { CalendarPanel } from "@/components/sections/CalendarPanel";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Calendar</h2>
        <p className="mt-1 text-sm text-foreground-2">
          Preview your weekday publishing cadence and jump directly into each channel editor.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow-md overflow-hidden">
        <CalendarPanel />
      </div>
    </div>
  );
}
