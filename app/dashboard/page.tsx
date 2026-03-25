"use client";

import { useState } from "react";
import { ArticleUpload } from "@/components/input/ArticleUpload";
import { TopicForm } from "@/components/input/TopicForm";
import { Button } from "@/components/ui/button";
import { SummaryPanel } from "@/components/dashboard/SummaryPanel";
import { useSessionContext } from "@/lib/context/SessionContext";

type InputTab = "topic" | "upload";

const SUMMARY_THRESHOLD = 5;

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<InputTab>("topic");
  const { assets } = useSessionContext();

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
    </div>
  );
}

