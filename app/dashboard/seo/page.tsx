import { ContentCard } from "@/components/dashboard/ContentCard";

export default function SEOPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">SEO</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate keyword targets, meta descriptions, and structured data.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Meta Title & Description" badge="SEO" />
        <ContentCard title="Keyword Targets" badge="SEO" />
        <ContentCard title="Schema Markup" badge="SEO" />
      </div>
    </div>
  );
}
