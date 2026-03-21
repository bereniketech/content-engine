import { ContentCard } from "@/components/dashboard/ContentCard";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track content performance across all distribution channels.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Performance Summary" badge="Analytics" />
        <ContentCard title="Top Performing Content" badge="Analytics" />
      </div>
    </div>
  );
}
