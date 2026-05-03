"use client";

import { useState } from "react";
import { TopicForm } from "@/components/input/TopicForm";
import { ArticleUpload } from "@/components/input/ArticleUpload";
import { DataDrivenForm } from "@/components/input/DataDrivenForm";
import { Button } from "@/components/ui/button";

type SessionTab = "topic" | "upload" | "url" | "data-driven";

export default function NewSessionPage() {
  const [activeTab, setActiveTab] = useState<SessionTab>("topic");
  const [url, setUrl] = useState("");

  const tabs: Array<{ id: SessionTab; label: string }> = [
    { id: "topic",       label: "Start from Topic" },
    { id: "upload",      label: "Upload Article" },
    { id: "url",         label: "Repurpose URL" },
    { id: "data-driven", label: "Data Pipeline" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">New Article</h2>
        <p className="mt-1 text-sm text-foreground-2">
          Start with a topic brief, source material, or an uploaded article to create a new article.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="inline-flex rounded-md bg-surface-mid p-1 gap-1 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-sm px-4 py-2 text-sm transition-all ${
              activeTab === tab.id
                ? "bg-card shadow-sm font-semibold text-foreground"
                : "font-normal text-foreground-3 hover:text-foreground-2"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div>
        {activeTab === "topic"       && <TopicForm />}
        {activeTab === "upload"      && <ArticleUpload />}
        {activeTab === "data-driven" && <DataDrivenForm />}

        {activeTab === "url" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="url-input" className="block text-sm font-medium text-foreground mb-2">
                Article URL
              </label>
              <input
                id="url-input"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-md bg-card text-foreground placeholder:text-foreground-3 focus:border-secondary focus:ring-2 focus:ring-secondary/10 outline-none transition-colors"
              />
            </div>
            <Button className="w-full h-[52px] rounded-sm text-[15px] font-semibold bg-primary text-primary-foreground hover:opacity-90">
              Fetch &amp; Create Article
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
