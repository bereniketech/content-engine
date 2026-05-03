"use client";

import Link from "next/link";
import { useSessionContext } from "@/lib/context/SessionContext";
import { CircleDot } from "lucide-react";

export function DashboardHeader() {
  const { sessionId, sessionTitle } = useSessionContext();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-2" />

      {sessionId && sessionTitle && (
        <Link
          href={`/dashboard/workspace?session=${sessionId}`}
          className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary transition-colors hover:bg-primary/20"
        >
          <CircleDot className="h-3 w-3 animate-pulse text-green-500" />
          <span className="max-w-[200px] truncate font-medium">
            Editing: &quot;{sessionTitle}&quot;
          </span>
          <span className="text-xs text-primary/70">Open →</span>
        </Link>
      )}
    </header>
  );
}
