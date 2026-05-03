import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Search, Share2 } from "lucide-react";

export const metadata = {
  title: "Home",
  description: "Turn any topic into publish-ready content with AI research, writing, and distribution.",
};

export default async function LandingPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border px-6 md:px-12">
        <span className="text-lg font-semibold tracking-tight">Content Studio</span>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">Get started free</Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center md:px-12">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Turn any topic into{" "}
            <span className="text-primary">publish-ready content</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Research, write, and distribute articles across every channel — powered by AI, guided by your brand voice.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </main>

      <section className="border-t border-border bg-muted/30 px-6 py-16 md:px-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-semibold">
            Everything you need to create great content
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <FeatureCard
              icon={Search}
              title="Research"
              description="AI-powered research that finds authoritative sources and synthesizes key insights for your topic."
            />
            <FeatureCard
              icon={FileText}
              title="Write"
              description="Generate full articles in your brand voice, with SEO optimization and readability scoring built in."
            />
            <FeatureCard
              icon={Share2}
              title="Distribute"
              description="Publish to X/Twitter, LinkedIn, Instagram, Newsletter, Medium, Reddit, and Pinterest from one place."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10 text-center md:px-12">
        <p className="text-sm text-muted-foreground">
          Ready to start?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Create your free account →
          </Link>
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Search;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
