import { ContentCard } from "@/components/dashboard/ContentCard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI content workspace. Select a section from the sidebar to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ContentCard title="Latest Research" badge="Research">
          Run a research pass on any topic to surface key facts and talking points.
        </ContentCard>
        <ContentCard title="SEO Analysis" badge="SEO">
          Generate keyword targets, meta descriptions, and SEO-optimised headings.
        </ContentCard>
        <ContentCard title="Blog Draft" badge="Blog">
          Produce a full blog article from your research and SEO findings.
        </ContentCard>
        <ContentCard title="X Thread" badge="X">
          Convert your article into a punchy Twitter/X thread.
        </ContentCard>
        <ContentCard title="LinkedIn Post" badge="LinkedIn">
          Craft a professional LinkedIn post from your content.
        </ContentCard>
        <ContentCard title="Newsletter" badge="Newsletter">
          Write a subscriber-ready email newsletter from your article.
        </ContentCard>
      </div>
    </div>
  );
}

