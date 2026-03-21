import { ContentCard } from "@/components/dashboard/ContentCard";

export default function ImagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Images</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate AI image prompts and visual content briefs.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Hero Image Prompt" badge="Images" />
        <ContentCard title="Social Image Prompts" badge="Images" />
      </div>
    </div>
  );
}
