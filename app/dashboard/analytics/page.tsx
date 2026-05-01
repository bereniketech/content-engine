import { AnalyticsDashboard } from "@/components/sections/AnalyticsDashboard";
import { RefreshTriggerBanner } from "@/components/sections/RefreshTriggerBanner";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[32px] font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
          Analytics &amp; Insights
        </h1>
        <p className="mt-2 text-base text-foreground-2">
          Live data from Google Analytics 4 and Search Console.
        </p>
      </div>
      <RefreshTriggerBanner />
      <AnalyticsDashboard />
    </div>
  );
}
