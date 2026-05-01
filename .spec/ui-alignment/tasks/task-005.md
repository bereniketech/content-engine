---
task: 5
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4]
---

# Task 5: Create Hub Page Layout with Stat Cards and Quick Actions

## Skills
- .kit/skills/languages/typescript-patterns/SKILL.md
- .kit/skills/frameworks-frontend/react-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

## Commands
- .kit/commands/core/code-review.md

> Load the skills, agents, and commands listed above before read anything else. Do not load CLAUDE.md. Follow paths exactly.

---

## Objective
Create `components/ui/StatCard.tsx` component and redesign `app/dashboard/page.tsx` hub screen to display stat cards in a bento grid, add quick action buttons, and redesign recent sessions list with hover states (preserve all existing session logic).

---

## Files

### Create
| File | Purpose |
|------|---------|
| `components/ui/StatCard.tsx` | Stat card component: value, label, icon, change indicator |

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/page.tsx` | Redesign layout: heading + subtitle + stat grid + quick actions + sessions list |

---

## Dependencies
- Task 1 (tokens) must be complete
- Existing session logic in current `app/dashboard/page.tsx` (preserved unchanged)
- `lucide-react` icons (TrendingUp for stat change)

---

## Codebase Context

### Stat Card Spec (from design.md)
```
Value: 32px bold, text-foreground
Label: 11px uppercase, text-foreground-3, letter-spacing 0.06em
Change: 12px, text-primary, with TrendingUp icon
Icon: 18px, alternates text-primary / text-secondary per index
Card: bg-card rounded-lg shadow-md p-5
```

### Hub Page Content Structure
- Heading: "Content Studio Hub", 32px bold, -0.02em letter-spacing, text-foreground
- Subtitle: "Real-time status of your pipeline", 16px, text-foreground-2
- Stat grid: 4-col desktop, 2-col tablet, 1-col mobile
- Quick actions: 4 pill buttons (secondary variant, rounded-full)
- Sessions list: preserved logic, updated styling (bg-card, shadow-md, hover bg-surface-low)

### Design Spec Stat Cards
1. Articles: 23
2. Traffic: 14.2k
3. SEO Avg: 87
4. Credits: 842

---

## Implementation Steps

1. Create `components/ui/StatCard.tsx`:
   - Accept props: `value: string | number`, `label: string`, `icon: React.ElementType`, `change?: string`, `changePositive?: boolean`
   - Render card with icon (18px), value (32px bold), label (11px uppercase), change badge
   - Icon colour alternates per task instruction or prop
2. Redesign `app/dashboard/page.tsx`:
   - Keep all existing `loadHistory()`, `handleRestoreSession()`, and session state logic
   - Add page heading and subtitle
   - Create stat card grid using `StatCard` component (mock data: 23, 14.2k, 87, 842)
   - Add quick action buttons: "New from Topic", "Upload Article", "Repurpose URL", "Data Pipeline"
   - Update sessions list card styling: `bg-card rounded-lg shadow-md`
   - Update row hover: `hover:bg-surface-low transition-colors duration-120`
3. Test in browser: verify layout stacks correctly on desktop/tablet/mobile

---

## Code Templates

### `components/ui/StatCard.tsx` — Create

```tsx
import React from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  value: string | number;
  label: string;
  icon: React.ElementType;
  change?: string;
  changePositive?: boolean;
  iconColor?: "primary" | "secondary";
}

export function StatCard({
  value,
  label,
  icon: Icon,
  change,
  changePositive = true,
  iconColor = "primary",
}: StatCardProps) {
  return (
    <div className="bg-card rounded-lg shadow-md p-5 flex flex-col gap-3">
      {/* Top row: icon and change badge */}
      <div className="flex items-center justify-between">
        <Icon
          className={cn(
            "h-[18px] w-[18px]",
            iconColor === "primary" ? "text-primary" : "text-secondary"
          )}
        />
        {change && (
          <div className="flex items-center gap-1 text-[12px] text-primary font-medium">
            <TrendingUp className="h-3 w-3" />
            {change}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-[32px] font-bold text-foreground leading-tight">
        {value}
      </div>

      {/* Label */}
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-3">
        {label}
      </div>
    </div>
  );
}
```

### `app/dashboard/page.tsx` — Full Replacement

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, FileText, Eye, Zap, Lightbulb } from "lucide-react";
import { ArticleUpload } from "@/components/input/ArticleUpload";
import { DataDrivenForm } from "@/components/input/DataDrivenForm";
import { TopicForm } from "@/components/input/TopicForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/StatCard";
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
    <div className="space-y-8">
      {/* Page heading and subtitle */}
      <div>
        <h1 className="text-[32px] font-bold text-foreground tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Content Studio Hub
        </h1>
        <p className="mt-2 text-base text-foreground-2">
          Real-time status of your pipeline.
        </p>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value="23"
          label="Articles"
          icon={FileText}
          change="+2"
          changePositive={true}
          iconColor="primary"
        />
        <StatCard
          value="14.2k"
          label="Traffic"
          icon={Eye}
          change="+12%"
          changePositive={true}
          iconColor="secondary"
        />
        <StatCard
          value="87"
          label="SEO Avg"
          icon={TrendingUp}
          change="+4"
          changePositive={true}
          iconColor="primary"
        />
        <StatCard
          value="842"
          label="Credits"
          icon={Zap}
          change="-8"
          changePositive={false}
          iconColor="secondary"
        />
      </div>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="rounded-full px-4 py-2.5 text-[13px] font-medium"
          onClick={() => router.push("/dashboard/new-session?tab=topic")}
        >
          New from Topic
        </Button>
        <Button
          variant="outline"
          className="rounded-full px-4 py-2.5 text-[13px] font-medium"
          onClick={() => router.push("/dashboard/new-session?tab=upload")}
        >
          Upload Article
        </Button>
        <Button
          variant="outline"
          className="rounded-full px-4 py-2.5 text-[13px] font-medium"
          onClick={() => router.push("/dashboard/new-session?tab=url")}
        >
          Repurpose URL
        </Button>
        <Button
          variant="outline"
          className="rounded-full px-4 py-2.5 text-[13px] font-medium"
          onClick={() => router.push("/dashboard/new-session?tab=data-driven")}
        >
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
                  className="w-full rounded-md bg-card px-3 py-3 text-left transition-colors hover:bg-surface-low disabled:opacity-70"
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
    </div>
  );
}
```

---

## Test Cases

**Visual verification (browser):**

1. Start dev: `npm run dev`
2. Navigate to `/dashboard`
3. **Layout checks:**
   - Heading "Content Studio Hub" (32px bold)
   - Subtitle "Real-time status of your pipeline" (16px gray)
   - Stat grid shows 4 cards on desktop, 2 on tablet, 1 on mobile
   - Each card shows value (32px), label (11px uppercase), icon (18px)
   - Quick action buttons render as pills with secondary styling
4. **Stat card details:**
   - Card 1: "23" + "Articles", primary icon
   - Card 2: "14.2k" + "Traffic", secondary icon
   - Card 3: "87" + "SEO Avg", primary icon
   - Card 4: "842" + "Credits", secondary icon
5. **Sessions list:**
   - Hover over session row → background changes to `#eff5ef`
   - Click session → restores and navigates
6. **Responsive:**
   - Desktop (1440px): 4-col grid
   - Tablet (768px): 2-col grid
   - Mobile (375px): 1-col grid

---

## Acceptance Criteria

### Visual/Design Alignment
- [ ] WHEN hub renders THEN page heading is 32px bold with -0.02em letter-spacing
- [ ] WHEN stat cards render THEN grid is 4 columns on desktop, 2 on tablet, 1 on mobile
- [ ] WHEN stat card renders THEN value is 32px bold, label is 11px uppercase
- [ ] WHEN session row is hovered THEN background transitions to `#eff5ef` (surface-low)
- [ ] WHEN stat card renders THEN icon circle background is `bg-primary/10` with correct colour
- [ ] All design tokens (colors, spacing, radius) match design.md spec

### Logic/Feature Completeness
- [ ] WHEN page renders THEN all session data flows from existing session API unchanged
- [ ] WHEN session list loads THEN all existing `loadHistory()` logic remains intact
- [ ] WHEN session is clicked THEN `handleRestoreSession()` function works identically to before
- [ ] WHEN stat grid renders THEN all calculations (articles count, traffic, SEO score, credits) preserve existing data sources
- [ ] WHEN quick action buttons are clicked THEN navigation to `/dashboard/new-session` routes work correctly
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)
- [ ] No existing API calls, hooks, or session state management are removed or changed
- [ ] All existing tests pass (jest + playwright)
- [ ] `npm run type-check` — zero errors
- [ ] `/verify` passes

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Existing session API call in component | Keep exact `loadHistory()` and `handleRestoreSession()` logic unchanged; only wrap returned data in new JSX structure |
| Session list row data display | Keep all existing session properties and calculations (assetCount, sessionLabel); only update wrapper and hover styling |
| Stat card calculations | Preserve existing data sources and logic; only update card component styling/layout |
| Missing stat data in context | Use mock data for now (23, 14.2k, 87, 842); will be connected to real data in future task if needed |
| Status badge variant | Will be replaced with StatusBadge component in Task 6; for now keep existing Badge variant logic |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

---

## Handoff to Next Task
**Files changed by this task:** `app/dashboard/page.tsx`, created `components/ui/StatCard.tsx`
**Context for next task:** Hub page is now redesigned with stat cards. Task 6 creates the StatusBadge component with status colour variants.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
