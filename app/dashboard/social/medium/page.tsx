import { ContentCard } from "@/components/dashboard/ContentCard";

export default function MediumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Medium</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Adapt your article for the Medium publishing format.
        </p>
      </div>
      <div className="grid gap-4">
        <ContentCard title="Medium Article" badge="Medium" />
      </div>
    </div>
  );
}
