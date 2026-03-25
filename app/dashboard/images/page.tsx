"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagesPanel } from "@/components/sections/ImagesPanel";
import { useSessionContext } from "@/lib/context/SessionContext";
import { getLatestAssetByType } from "@/lib/session-assets";
import type { ImagePromptsOutput } from "@/lib/prompts/images";

export default function ImagesPage() {
  const { sessionId, inputData, assets, upsertAsset } = useSessionContext();
  const latestBlogAsset = useMemo(() => getLatestAssetByType(assets, "blog"), [assets]);
  const latestImageAsset = useMemo(() => getLatestAssetByType(assets, "images"), [assets]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePrompts, setImagePrompts] = useState<ImagePromptsOutput | null>(
    latestImageAsset?.content
      ? {
          hero: typeof latestImageAsset.content.hero === "string" ? latestImageAsset.content.hero : "",
          sections: Array.isArray(latestImageAsset.content.sections)
            ? latestImageAsset.content.sections.filter((value): value is string => typeof value === "string")
            : [],
          infographic:
            typeof latestImageAsset.content.infographic === "string"
              ? latestImageAsset.content.infographic
              : "",
          social: typeof latestImageAsset.content.social === "string" ? latestImageAsset.content.social : "",
          pinterest:
            typeof latestImageAsset.content.pinterest === "string"
              ? latestImageAsset.content.pinterest
              : "",
        }
      : null,
  );

  const topic = inputData && "topic" in inputData ? inputData.topic : "";
  const blog = typeof latestBlogAsset?.content.markdown === "string" ? latestBlogAsset.content.markdown : "";

  useEffect(() => {
    if (!latestImageAsset) {
      return;
    }

    setImagePrompts({
      hero: typeof latestImageAsset.content.hero === "string" ? latestImageAsset.content.hero : "",
      sections: Array.isArray(latestImageAsset.content.sections)
        ? latestImageAsset.content.sections.filter((value): value is string => typeof value === "string")
        : [],
      infographic:
        typeof latestImageAsset.content.infographic === "string"
          ? latestImageAsset.content.infographic
          : "",
      social: typeof latestImageAsset.content.social === "string" ? latestImageAsset.content.social : "",
      pinterest:
        typeof latestImageAsset.content.pinterest === "string"
          ? latestImageAsset.content.pinterest
          : "",
    });
  }, [latestImageAsset]);

  const handleGenerate = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, topic, blog, style: "realistic" }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to generate image prompts");
      }

      setImagePrompts(payload.data.images as ImagePromptsOutput);
      if (payload?.data?.asset) {
        upsertAsset({
          id: payload.data.asset.id,
          assetType: payload.data.asset.assetType,
          content: payload.data.asset.content,
          version: payload.data.asset.version,
          createdAt: payload.data.asset.createdAt,
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to generate image prompts");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Images</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate visual prompt packs from the active blog draft.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Image Prompt Engine</CardTitle>
          <CardDescription>
            Uses the active topic and latest blog markdown to prepare hero, section, infographic, and social prompts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!topic || !blog ? (
            <p className="text-sm text-muted-foreground">
              Generate the topic, research, SEO, and blog assets first, then return here for image prompts.
            </p>
          ) : (
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? "Generating Image Prompts..." : "Generate Image Prompts"}
            </Button>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {imagePrompts ? <ImagesPanel data={imagePrompts} isLoading={isLoading} /> : null}
    </div>
  );
}
