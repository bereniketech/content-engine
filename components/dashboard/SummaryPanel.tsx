"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  BookOpen,
  Mail,
  MessageSquare,
  Twitter,
  Linkedin,
  Instagram,
  Pin,
  Quote,
  HelpCircle,
  PlusCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/lib/context/SessionContext";
import type { ContentAsset } from "@/types";

interface AssetCatalogEntry {
  assetType: string;
  label: string;
  defaultCount: number;
  href: string;
  icon: React.ElementType;
  color: string;
}

const ASSET_CATALOG: AssetCatalogEntry[] = [
  {
    assetType: "blog",
    label: "Blog Article",
    defaultCount: 1,
    href: "/dashboard/blog",
    icon: FileText,
    color: "text-blue-500",
  },
  {
    assetType: "social_medium",
    label: "Medium Article",
    defaultCount: 1,
    href: "/dashboard/social/medium",
    icon: BookOpen,
    color: "text-green-600",
  },
  {
    assetType: "social_newsletter",
    label: "Newsletter",
    defaultCount: 1,
    href: "/dashboard/social/newsletter",
    icon: Mail,
    color: "text-orange-500",
  },
  {
    assetType: "social_reddit",
    label: "Reddit Post",
    defaultCount: 1,
    href: "/dashboard/social/reddit",
    icon: MessageSquare,
    color: "text-red-500",
  },
  {
    assetType: "social_x",
    label: "Tweets (X Thread)",
    defaultCount: 10,
    href: "/dashboard/social/x",
    icon: Twitter,
    color: "text-sky-500",
  },
  {
    assetType: "social_linkedin",
    label: "LinkedIn Posts",
    defaultCount: 3,
    href: "/dashboard/social/linkedin",
    icon: Linkedin,
    color: "text-blue-700",
  },
  {
    assetType: "social_instagram",
    label: "Instagram Captions",
    defaultCount: 4,
    href: "/dashboard/social/instagram",
    icon: Instagram,
    color: "text-pink-500",
  },
  {
    assetType: "social_pinterest",
    label: "Pinterest Pins",
    defaultCount: 5,
    href: "/dashboard/social/pinterest",
    icon: Pin,
    color: "text-red-600",
  },
];

function getActualCount(entry: AssetCatalogEntry, asset: ContentAsset): number {
  const content = asset.content;

  switch (entry.assetType) {
    case "social_x": {
      const thread = content.thread;
      return Array.isArray(thread) && thread.length > 0
        ? thread.length
        : entry.defaultCount;
    }
    case "social_linkedin": {
      let count = 0;
      if (content.storytelling) count++;
      if (content.authority) count++;
      if (content.carousel) count++;
      return count > 0 ? count : entry.defaultCount;
    }
    case "social_instagram": {
      const captions = content.carouselCaptions;
      const reelCaption = content.reelCaption;
      const base = Array.isArray(captions) ? captions.length : 0;
      return base + (reelCaption ? 1 : 0) || entry.defaultCount;
    }
    case "social_pinterest": {
      const pins = content.pins;
      return Array.isArray(pins) && pins.length > 0
        ? pins.length
        : entry.defaultCount;
    }
    default:
      return entry.defaultCount;
  }
}

function getExtrasData(assets: ContentAsset[]): {
  quotes: string[];
  questions: string[];
} {
  const extrasAsset = assets.find((a) => a.assetType === "social_extras");
  if (!extrasAsset) return { quotes: [], questions: [] };

  const quotes = Array.isArray(extrasAsset.content.quotes)
    ? (extrasAsset.content.quotes as string[])
    : [];
  const questions = Array.isArray(extrasAsset.content.discussionQuestions)
    ? (extrasAsset.content.discussionQuestions as string[])
    : [];

  return { quotes, questions };
}

function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCount(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

export function SummaryPanel() {
  const { assets, clearSession } = useSessionContext();
  const router = useRouter();

  const presentEntries = ASSET_CATALOG.filter((entry) =>
    assets.some((a) => a.assetType === entry.assetType),
  );

  const totalCount = presentEntries.reduce((sum, entry) => {
    const asset = assets.find((a) => a.assetType === entry.assetType)!;
    return sum + getActualCount(entry, asset);
  }, 0);

  const { quotes, questions } = getExtrasData(assets);
  const extrasTotal = quotes.length + questions.length;
  const grandTotal = totalCount + extrasTotal;

  const animatedTotal = useCountUp(grandTotal);

  function handleNewSession() {
    clearSession();
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Content Ready
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All engines have completed. Your assets are ready to review and
            distribute.
          </p>
        </div>
        <Button variant="outline" onClick={handleNewSession}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Start New Session
        </Button>
      </div>

      {/* Total count badge */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-6">
        <div className="text-6xl font-bold tabular-nums text-primary">
          {animatedTotal}
        </div>
        <div>
          <div className="text-lg font-semibold text-foreground">
            Assets Ready
          </div>
          <div className="text-sm text-muted-foreground">
            Across {presentEntries.length + (extrasTotal > 0 ? 1 : 0)} content
            formats
          </div>
        </div>
        <Badge variant="secondary" className="ml-auto text-sm">
          Session complete
        </Badge>
      </div>

      {/* Asset type cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {presentEntries.map((entry) => {
          const asset = assets.find((a) => a.assetType === entry.assetType)!;
          const count = getActualCount(entry, asset);
          const Icon = entry.icon;

          return (
            <Link key={entry.assetType} href={entry.href}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${entry.color}`} />
                    <CardTitle className="text-sm font-medium">
                      {entry.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tabular-nums text-foreground">
                    {count}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {count === 1 ? "piece" : "pieces"} generated
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Extras: quotes and discussion questions shown inline */}
      {(quotes.length > 0 || questions.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {quotes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Quote className="h-4 w-4 text-purple-500" />
                  <CardTitle className="text-sm font-medium">
                    Quotes{" "}
                    <Badge variant="secondary" className="ml-1">
                      {quotes.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {quotes.map((quote, i) => (
                    <li
                      key={i}
                      className="rounded-md bg-muted p-2 text-sm text-muted-foreground italic"
                    >
                      &ldquo;{quote}&rdquo;
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {questions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-indigo-500" />
                  <CardTitle className="text-sm font-medium">
                    Discussion Questions{" "}
                    <Badge variant="secondary" className="ml-1">
                      {questions.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 list-decimal list-inside">
                  {questions.map((q, i) => (
                    <li
                      key={i}
                      className="rounded-md bg-muted p-2 text-sm text-muted-foreground"
                    >
                      {q}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
