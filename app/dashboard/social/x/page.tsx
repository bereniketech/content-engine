import { ContentCard } from "@/components/dashboard/ContentCard";

export default function XPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">X (Twitter)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a Twitter/X thread from your article.
        </p>
      </div>
      <div className="grid gap-4">
        <ContentCard title="X Thread" badge="X" />
      </div>
    </div>
  );
}
