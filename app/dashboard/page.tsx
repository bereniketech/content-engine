"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ArticleUpload } from "@/components/input/ArticleUpload";
import { TopicForm } from "@/components/input/TopicForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryPanel } from "@/components/dashboard/SummaryPanel";
import { useSessionContext } from "@/lib/context/SessionContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { ContentAsset, SessionInputData, SessionInputType } from "@/types";

type InputTab = "topic" | "upload";

interface SessionListItem {
  id: string;
  inputType: SessionInputType;
  inputData: SessionInputData;
  createdAt: string;
  assetCount: number;
}

interface ContentAssetRow {
  id: string;
  asset_type: string;
  content: Record<string, unknown>;
  version: number;
  created_at: string;
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
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (isActive) {
            setHistory([]);
            setHistoryError(userError?.message ?? "Sign in to load your session history.");
          }
          return;
        }

        const { data: sessions, error: sessionsError } = await supabase
          .from("sessions")
          .select("id, input_type, input_data, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (sessionsError) {
          throw new Error(sessionsError.message);
        }

        const sessionRows = sessions ?? [];

        const withCounts = await Promise.all(
          sessionRows.map(async (session) => {
            const { count } = await supabase
              .from("content_assets")
              .select("id", { count: "exact", head: true })
              .eq("session_id", session.id);

            return {
              id: session.id,
              inputType: session.input_type as SessionInputType,
              inputData: session.input_data as SessionInputData,
              createdAt: session.created_at,
              assetCount: count ?? 0,
            };
          }),
        );

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

      const { data, error } = await supabase
        .from("content_assets")
        .select("id, asset_type, content, version, created_at")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      const mappedAssets: ContentAsset[] = (data ?? []).map((asset: ContentAssetRow) => ({
        id: asset.id,
        assetType: asset.asset_type,
        content: asset.content,
        version: asset.version,
        createdAt: asset.created_at,
      }));

      loadSession({
        sessionId: session.id,
        inputType: session.inputType,
        inputData: session.inputData,
        assets: mappedAssets,
      });

      router.push("/dashboard");
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

    const topic =
      "topic" in session.inputData && typeof session.inputData.topic === "string"
        ? session.inputData.topic
        : "";
    return topic.trim() || "Untitled topic";
  }

  if (assets.length >= SUMMARY_THRESHOLD) {
    return <SummaryPanel />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Create New Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with a topic brief or upload an article to initialize your workflow.
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
      </div>

      {activeTab === "topic" ? <TopicForm /> : <ArticleUpload />}

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
                      {session.inputType === "topic" ? "Topic" : "Upload"}
                    </Badge>
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

