import { Sidebar } from "@/components/dashboard/Sidebar";
import { SessionProvider } from "@/lib/context/SessionContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-6 md:px-8">
            <h1 className="text-sm font-semibold text-foreground md:text-base">
              AI Content Engine
            </h1>
          </header>
          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
