import { ContentCard } from "@/components/dashboard/ContentCard";

export default function ResearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Research</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate in-depth research reports on any topic.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Research Summary" badge="AI Generated" />
        <ContentCard title="Key Takeaways" badge="AI Generated" />
      </div>
    </div>
  );
}
