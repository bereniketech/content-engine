import { ContentCard } from "@/components/dashboard/ContentCard";

export default function RedditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Reddit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Write a community-native Reddit post for relevant subreddits.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Reddit Post" badge="Reddit" />
        <ContentCard title="Suggested Subreddits" badge="Reddit" />
      </div>
    </div>
  );
}
