import { ContentCard } from "@/components/dashboard/ContentCard";

export default function BlogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Blog</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Draft full-length blog articles optimised for SEO and readability.
        </p>
      </div>
      <div className="grid gap-4">
        <ContentCard title="Blog Article" badge="Draft" />
      </div>
    </div>
  );
}
