"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ArticleUpload } from "@/components/input/ArticleUpload";
import { DataDrivenForm } from "@/components/input/DataDrivenForm";
import { TopicForm } from "@/components/input/TopicForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryPanel } from "@/components/dashboard/SummaryPanel";
import { useSessionContext } from "@/lib/context/SessionContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { ContentAsset, SessionInputData, SessionInputType } from "@/types";

type InputTab = "topic" | "upload" | "data-driven";

interface SessionListItem {
  id: string;
  inputType: SessionInputType;
  inputData: SessionInputData;
  createdAt: string;
  assetCount: number;
}

const SUMMARY_THRESHOLD = 5;

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<InputTab>("topic");
  const [history, setHistory] = useState<SessionListItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [restoringSessionId, setRestoringSessionId] = useState<string | null>(null);
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
      if (topic) {
        return topic;
      }

      const sourceText =
        "sourceText" in session.inputData && typeof session.inputData.sourceText === "string"
          ? session.inputData.sourceText.trim()
          : "";
      if (sourceText) {
        return sourceText.slice(0, 80);
      }

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
    if (session.inputType !== "data-driven") {
      return null;
    }

    const hasSourceText =
      "sourceText" in session.inputData
      && typeof session.inputData.sourceText === "string"
      && session.inputData.sourceText.trim().length > 0;

    const hasSourceFileName =
      "sourceFileName" in session.inputData
      && typeof session.inputData.sourceFileName === "string"
      && session.inputData.sourceFileName.trim().length > 0;

    if (hasSourceText || hasSourceFileName) {
      return "Data";
    }

    return "Topic";
  }

  if (assets.length >= SUMMARY_THRESHOLD) {
    return <SummaryPanel />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Create New Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with a topic brief, source material, or an uploaded article to initialize your workflow.
        </p>
      </div>

      <div className="inline-flex rounded-md border border-border bg-card p-1">
        <Button
          type="button"
          variant={activeTab === "topic" ? "default" : "ghost"}
          onClick={() => setActiveTab("topic")}
        >
          Topic
        </Button>
        <Button
          type="button"
          variant={activeTab === "upload" ? "default" : "ghost"}
          onClick={() => setActiveTab("upload")}
        >
          Upload Article
        </Button>
        <Button
          type="button"
          variant={activeTab === "data-driven" ? "default" : "ghost"}
          onClick={() => setActiveTab("data-driven")}
        >
          Data-Driven
        </Button>
      </div>

      {activeTab === "topic" ? (
        <TopicForm />
      ) : activeTab === "upload" ? (
        <ArticleUpload />
      ) : (
        <DataDrivenForm />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isHistoryLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              No sessions yet - start your first generation above
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
                  className="w-full rounded-md border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-70"
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
                    <span className="text-sm text-muted-foreground">
                      {new Date(session.createdAt).toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {session.assetCount} assets
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{getSessionLabel(session)}</p>
                  {isRestoring && (
                    <p className="mt-2 text-xs text-muted-foreground">Restoring session...</p>
                  )}
                </button>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}

