import { ContentCard } from "@/components/dashboard/ContentCard";

export default function PinterestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Pinterest</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate Pinterest pin descriptions and board suggestions.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Pin Description" badge="Pinterest" />
        <ContentCard title="Board Suggestions" badge="Pinterest" />
      </div>
    </div>
  );
}
