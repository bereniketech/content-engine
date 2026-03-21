import { ContentCard } from "@/components/dashboard/ContentCard";

export default function NewsletterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Newsletter</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Write a subscriber-ready email newsletter from your article.
        </p>
      </div>
      <div className="grid gap-4">
        <ContentCard title="Email Newsletter" badge="Newsletter" />
      </div>
    </div>
  );
}
