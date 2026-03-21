import { ContentCard } from "@/components/dashboard/ContentCard";

export default function LinkedInPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">LinkedIn</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Craft a professional LinkedIn post from your content.
        </p>
      </div>
      <div className="grid gap-4">
        <ContentCard title="LinkedIn Post" badge="LinkedIn" />
      </div>
    </div>
  );
}
