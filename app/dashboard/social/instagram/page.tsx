import { ContentCard } from "@/components/dashboard/ContentCard";

export default function InstagramPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Instagram</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate an Instagram caption and hashtag set.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Caption" badge="Instagram" />
        <ContentCard title="Hashtags" badge="Instagram" />
      </div>
    </div>
  );
}
