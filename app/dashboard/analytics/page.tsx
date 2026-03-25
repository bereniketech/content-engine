import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ANALYTICS_CARDS = [
  {
    title: "Traffic Overview",
    message: "Connect Google Analytics - coming soon",
  },
  {
    title: "Top Performing Content",
    message: "Connect Google Analytics - coming soon",
  },
  {
    title: "CTR by Platform",
    message: "Connect Google Analytics - coming soon",
  },
  {
    title: "Search Visibility",
    message: "Connect Search Console - coming soon",
  },
] as const;

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Phase 2 integrations for analytics and attribution will appear here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ANALYTICS_CARDS.map((card) => (
          <Card key={card.title} className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-muted-foreground" />
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
