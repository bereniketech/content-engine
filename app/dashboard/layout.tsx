"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SessionProvider } from "@/lib/context/SessionContext";

function getPageTitle(pathname: string): string {
  const routeTitleMap: Record<string, string> = {
    "/dashboard": "Content Studio Hub",
    "/dashboard/new-session": "New Session",
    "/dashboard/research": "Research",
    "/dashboard/seo": "SEO",
    "/dashboard/blog": "Blog Editor",
    "/dashboard/images": "Images",
    "/dashboard/social/x": "X (Twitter)",
    "/dashboard/social/linkedin": "LinkedIn",
    "/dashboard/social/instagram": "Instagram",
    "/dashboard/social/newsletter": "Newsletter",
    "/dashboard/social/medium": "Medium",
    "/dashboard/social/reddit": "Reddit",
    "/dashboard/social/pinterest": "Pinterest",
    "/dashboard/analytics": "Analytics & Insights",
    "/dashboard/calendar": "Calendar",
    "/dashboard/library": "Content Library",
    "/dashboard/brand-voice": "Brand Voice",
    "/dashboard/schedule": "Schedule",
    "/dashboard/clusters": "Clusters",
    "/dashboard/workspace": "Workspace",
    "/dashboard/data-driven": "Data Pipeline",
    "/dashboard/distribute": "Distribute",
    "/dashboard/traffic": "Traffic",
    "/dashboard/flywheel": "Flywheel",
  };

  return routeTitleMap[pathname] || "Dashboard";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          {/* Content area */}
          <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
