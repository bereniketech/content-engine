import { ContentCard } from "@/components/dashboard/ContentCard";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Calendar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan and schedule your content publishing cadence.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Content Schedule" badge="Calendar" />
        <ContentCard title="Publishing Plan" badge="Calendar" />
      </div>
    </div>
  );
}
