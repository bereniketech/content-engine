"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Eye, TrendingUp, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [seoAvg, setSeoAvg] = useState<number | null>(null);
  const [traffic, setTraffic] = useState<number | null>(null);
  const [restoringSessionId, setRestoringSessionId] = useState<string | null>(null);
  const [showInsightBar, setShowInsightBar] = useState(true);
  const { assets, loadSession } = useSessionContext();
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
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
            setHistoryError(sessionError?.message ?? "Sign in to load your article history.");
          }
          return;
        }

        const authHeader = { authorization: `Bearer ${session.access_token}` };

        const [sessionsResponse, creditsResponse, statsResponse] = await Promise.all([
          fetch('/api/sessions', { headers: authHeader }),
          fetch('/api/credits/balance', { headers: authHeader }),
          fetch('/api/stats', { headers: authHeader }),
        ]);

        if (!sessionsResponse.ok) {
          let message = "Failed to load article history.";
          try {
            const body = await sessionsResponse.json() as { error?: { message?: string } };
            message = body.error?.message ?? message;
          } catch {
            // response was not JSON (e.g. a server error page)
          }
          throw new Error(message);
        }

        const sessionsBody = await sessionsResponse.json() as {
          sessions: Array<{
            id: string;
            created_at: string;
            input_type: string;
            input_data: SessionInputData;
            assets: ContentAsset[];
          }>;
        };

        const withCounts = sessionsBody.sessions.map((s) => ({
          id: s.id,
          inputType: s.input_type as SessionInputType,
          inputData: s.input_data,
          createdAt: s.created_at,
          assetCount: s.assets.length,
        }));

        if (isActive) {
          setHistory(withCounts);
        }

        if (creditsResponse.ok) {
          const creditsBody = await creditsResponse.json() as { balance: number };
          if (isActive) setCreditsBalance(creditsBody.balance);
        }

        if (statsResponse.ok) {
          const statsBody = await statsResponse.json() as { seoAvg: number; traffic: number };
          if (isActive) {
            setSeoAvg(statsBody.seoAvg);
            setTraffic(statsBody.traffic);
          }
        }
      } catch (error) {
        if (isActive) {
          setHistory([]);
          setHistoryError(
            error instanceof Error ? error.message : "Failed to load article history.",
          );
        }
      } finally {
        if (isActive) {
          setIsHistoryLoading(false);
        }
      }
    }

    void loadDashboardData();

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard value={String(history.length)}                                                                      label="Articles" icon={FileText}   iconColor="primary"   />
        <StatCard value={traffic !== null ? (traffic >= 1000 ? `${(traffic / 1000).toFixed(1)}k` : String(traffic)) : "0"} label="Traffic"  icon={Eye}        iconColor="secondary" />
        <StatCard value={seoAvg !== null ? String(seoAvg) : "0"}                                                       label="SEO Avg"  icon={TrendingUp} iconColor="primary"   />
        <StatCard value={creditsBalance !== null ? String(creditsBalance) : "0"}                                       label="Credits"  icon={Zap}        iconColor="secondary" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="rounded-full px-4 py-2.5 text-[13px] font-medium" onClick={() => router.push("/dashboard/new-session?tab=topic")}>
          New Article from Topic
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
          <CardTitle className="text-lg">Recent Articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isHistoryLoading && (
            <div className="flex items-center gap-2 text-sm text-foreground-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading article history...
            </div>
          )}

          {!isHistoryLoading && historyError && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-muted-foreground">Unable to load articles.</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}

          {!isHistoryLoading && !historyError && history.length === 0 && (
            <EmptyState
              icon={FileText}
              heading="No articles yet"
              body="Create your first article to start building your content library."
              cta={{ label: "Create your first article", href: "/dashboard/new-session" }}
            />
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
                    <p className="mt-2 text-xs text-foreground-3">Loading article...</p>
                  )}
                </button>
              );
            })}
        </CardContent>
      </Card>

      {/* AI Insight Bar */}
      {showInsightBar && history.length > 0 && (
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
