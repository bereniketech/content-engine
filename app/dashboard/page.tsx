"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Eye, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/StatCard";
import { AIInsightBar } from "@/components/ui/AIInsightBar";
import { SummaryPanel } from "@/components/dashboard/SummaryPanel";
import { useSessionContext } from "@/lib/context/SessionContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { ContentAsset, SessionInputData, SessionInputType } from "@/types";

interface SessionListItem {
  id: string;
  inputType: SessionInputType;
  inputData: SessionInputData;
  createdAt: string;
  assetCount: number;
}

const SUMMARY_THRESHOLD = 5;

export default function DashboardPage() {
  const [history, setHistory] = useState<SessionListItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [restoringSessionId, setRestoringSessionId] = useState<string | null>(null);
  const [showInsightBar, setShowInsightBar] = useState(true);
  const { assets, loadSession } = useSessionContext();
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    async function loadHistory() {
      setIsHistoryLoading(true);
      setHistoryError(null);

      try {
        const supabase = getSupabaseBrowserClient();

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          if (isActive) {
            setHistory([]);
            setHistoryError(sessionError?.message ?? "Sign in to load your session history.");
          }
          return;
        }

        const response = await fetch('/api/sessions', {
          headers: { authorization: `Bearer ${session.access_token}` },
        });

        if (!response.ok) {
          const body = await response.json() as { error?: { message?: string } };
          throw new Error(body.error?.message ?? "Failed to load session history.");
        }

        const body = await response.json() as {
          sessions: Array<{
            id: string;
            created_at: string;
            input_type: string;
            input_data: SessionInputData;
            assets: ContentAsset[];
          }>;
        };

        const withCounts = body.sessions.map((s) => ({
          id: s.id,
          inputType: s.input_type as SessionInputType,
          inputData: s.input_data,
          createdAt: s.created_at,
          assetCount: s.assets.length,
        }));

        if (isActive) {
          setHistory(withCounts);
        }
      } catch (error) {
        if (isActive) {
          setHistory([]);
          setHistoryError(
            error instanceof Error ? error.message : "Failed to load session history.",
          );
        }
      } finally {
        if (isActive) {
          setIsHistoryLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleRestoreSession(session: SessionListItem) {
    setHistoryError(null);
    setRestoringSessionId(session.id);

    try {
      const supabase = getSupabaseBrowserClient();

      const {
        data: { session: authSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !authSession) {
        throw new Error(sessionError?.message ?? "Sign in to restore a session.");
      }

      const response = await fetch(`/api/sessions?id=${encodeURIComponent(session.id)}`, {
        headers: { authorization: `Bearer ${authSession.access_token}` },
      });

      if (!response.ok) {
        const body = await response.json() as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Failed to restore session.");
      }

      const body = await response.json() as {
        sessions: Array<{
          id: string;
          created_at: string;
          input_type: string;
          input_data: SessionInputData;
          assets: ContentAsset[];
        }>;
      };

      const restored = body.sessions[0];
      const mappedAssets: ContentAsset[] = restored?.assets ?? [];

      loadSession({
        sessionId: session.id,
        inputType: session.inputType,
        inputData: session.inputData,
        assets: mappedAssets,
      });

      router.push(session.inputType === "data-driven" ? "/dashboard/data-driven" : "/dashboard");
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to restore session.");
    } finally {
      setRestoringSessionId(null);
    }
  }

  function getSessionLabel(session: SessionListItem): string {
    if (session.inputType === "upload") {
      const article = "article" in session.inputData ? session.inputData.article : "";
      const snippet = article.trim().slice(0, 80);
      return snippet || "Uploaded article";
    }

    if (session.inputType === "data-driven") {
      const topic =
        "topic" in session.inputData && typeof session.inputData.topic === "string"
          ? session.inputData.topic.trim()
          : "";
      if (topic) return topic;

      const sourceText =
        "sourceText" in session.inputData && typeof session.inputData.sourceText === "string"
          ? session.inputData.sourceText.trim()
          : "";
      if (sourceText) return sourceText.slice(0, 80);

      const sourceFileName =
        "sourceFileName" in session.inputData && typeof session.inputData.sourceFileName === "string"
          ? session.inputData.sourceFileName.trim()
          : "";
      return sourceFileName || "Data source";
    }

    const topic =
      "topic" in session.inputData && typeof session.inputData.topic === "string"
        ? session.inputData.topic
        : "";
    return topic.trim() || "Untitled topic";
  }

  function getDataDrivenSourceBadgeLabel(session: SessionListItem): "Data" | "Topic" | null {
    if (session.inputType !== "data-driven") return null;

    const hasSourceText =
      "sourceText" in session.inputData
      && typeof session.inputData.sourceText === "string"
      && session.inputData.sourceText.trim().length > 0;

    const hasSourceFileName =
      "sourceFileName" in session.inputData
      && typeof session.inputData.sourceFileName === "string"
      && session.inputData.sourceFileName.trim().length > 0;

    return hasSourceText || hasSourceFileName ? "Data" : "Topic";
  }

  if (assets.length >= SUMMARY_THRESHOLD) {
    return <SummaryPanel />;
  }

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-[32px] font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
          Content Studio Hub
        </h1>
        <p className="mt-2 text-base text-foreground-2">
          Real-time status of your pipeline.
        </p>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value="23"    label="Articles" icon={FileText}    change="+2"   changePositive={true}  iconColor="primary"   />
        <StatCard value="14.2k" label="Traffic"  icon={Eye}         change="+12%" changePositive={true}  iconColor="secondary" />
        <StatCard value="87"    label="SEO Avg"  icon={TrendingUp}  change="+4"   changePositive={true}  iconColor="primary"   />
        <StatCard value="842"   label="Credits"  icon={Zap}         change="-8"   changePositive={false} iconColor="secondary" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="rounded-full px-4 py-2.5 text-[13px] font-medium" onClick={() => router.push("/dashboard/new-session?tab=topic")}>
          New from Topic
        </Button>
        <Button variant="outline" className="rounded-full px-4 py-2.5 text-[13px] font-medium" onClick={() => router.push("/dashboard/new-session?tab=upload")}>
          Upload Article
        </Button>
        <Button variant="outline" className="rounded-full px-4 py-2.5 text-[13px] font-medium" onClick={() => router.push("/dashboard/new-session?tab=url")}>
          Repurpose URL
        </Button>
        <Button variant="outline" className="rounded-full px-4 py-2.5 text-[13px] font-medium" onClick={() => router.push("/dashboard/new-session?tab=data-driven")}>
          Data Pipeline
        </Button>
      </div>

      {/* Recent sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isHistoryLoading && (
            <div className="flex items-center gap-2 text-sm text-foreground-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading session history...
            </div>
          )}

          {!isHistoryLoading && historyError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {historyError}
            </p>
          )}

          {!isHistoryLoading && !historyError && history.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-foreground-3">
              No sessions yet — start your first generation above.
            </p>
          )}

          {!isHistoryLoading &&
            !historyError &&
            history.map((session) => {
              const isRestoring = restoringSessionId === session.id;
              const dataDrivenSourceBadge = getDataDrivenSourceBadgeLabel(session);

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => void handleRestoreSession(session)}
                  disabled={isRestoring}
                  className="w-full rounded-md bg-card px-3 py-3 text-left transition-colors duration-[120ms] hover:bg-surface-low disabled:opacity-70"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={session.inputType === "topic" ? "default" : "secondary"}>
                      {session.inputType === "topic"
                        ? "Topic"
                        : session.inputType === "data-driven"
                          ? "Data-Driven"
                          : "Upload"}
                    </Badge>
                    {dataDrivenSourceBadge && (
                      <Badge variant="outline" className="text-[11px] leading-none">
                        {dataDrivenSourceBadge}
                      </Badge>
                    )}
                    <span className="text-sm text-foreground-3">
                      {new Date(session.createdAt).toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {session.assetCount} assets
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{getSessionLabel(session)}</p>
                  {isRestoring && (
                    <p className="mt-2 text-xs text-foreground-3">Restoring session...</p>
                  )}
                </button>
              );
            })}
        </CardContent>
      </Card>

      {/* AI Insight Bar */}
      {showInsightBar && (
        <AIInsightBar
          title="AI Insight Engine"
          description='Your "RAG Architecture" guide is trending higher than expected. Click to apply this strategy to other topics.'
          onApply={() => console.log("Apply strategy")}
          onDismiss={() => setShowInsightBar(false)}
        />
      )}
    </div>
  );
}
