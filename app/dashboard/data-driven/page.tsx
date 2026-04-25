"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { DataDrivenStepper, type StepConfig } from "@/components/sections/DataDrivenStepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	buildRestoredPipelineState,
	buildStepKeys,
	createEmptyStepStateMap,
	getDownstreamAssetTypesForRegenerate,
	getNextPendingStepIndex,
	resetForRegenerate,
	type StepKey,
	type StepRuntimeState,
	type StepStateMap,
} from "@/lib/data-driven-pipeline";
import { useSessionContext } from "@/lib/context/SessionContext";
import { getLatestAssetByType } from "@/lib/session-assets";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { isRecord } from "@/lib/type-guards";
import { isDataDrivenInputData, type ContentAsset, type DataDrivenInputData } from "@/types";
import { parseSseChunk } from "@/lib/sse-parser";
import { postJson } from "@/lib/api-client";

interface AssessData {
	sufficient: boolean;
	missingAreas: string[];
	suggestedTopic: string;
}

interface ResearchAssetData {
	summary?: string;
	keyFindings?: string[];
	sourceUrls?: string[];
}

interface ArticleStateData {
	markdown: string;
	wordCount?: number;
}

interface SeoGeoStateData {
	seo?: {
		title?: string;
		slug?: string;
		primaryKeyword?: string;
	};
	geo?: {
		sourceAttribution?: string;
	};
}

interface DistributionStateData {
	blogReady: boolean;
	xCampaignReady: boolean;
	threadsCampaignReady: boolean;
	generatedAssets: string[];
}

interface StepResponse<TData> {
	data?: TData;
	error?: {
		message?: string;
	};
}

interface StreamEvent {
	text?: string;
	done?: boolean;
	error?: string;
	wordCount?: number;
	asset?: ContentAsset;
}

const STEP_LABELS: Record<StepKey, string> = {
	assess: "Assess Source Data",
	research: "Deep Research",
	article: "Draft Article",
	seoGeo: "SEO + GEO Optimization",
	distribution: "Multi-format + Campaigns",
};

function isAssessData(value: unknown): value is AssessData {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.sufficient === "boolean"
		&& Array.isArray(value.missingAreas)
		&& typeof value.suggestedTopic === "string"
	);
}

function isArticleStateData(value: unknown): value is ArticleStateData {
	if (!isRecord(value)) {
		return false;
	}

	return typeof value.markdown === "string";
}

function isDistributionStateData(value: unknown): value is DistributionStateData {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.blogReady === "boolean"
		&& typeof value.xCampaignReady === "boolean"
		&& typeof value.threadsCampaignReady === "boolean"
		&& Array.isArray(value.generatedAssets)
	);
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return "Unexpected request failure";
}

async function parseErrorMessage(response: Response): Promise<string> {
	let fallbackMessage = `Request failed with status ${response.status}`;

	try {
		const payload = (await response.json()) as StepResponse<unknown>;
		if (payload.error?.message) {
			fallbackMessage = payload.error.message;
		}
	} catch {
		// Use status fallback if error response is not valid JSON.
	}

	return fallbackMessage;
}


function getArticleMarkdownFromAsset(assets: ContentAsset[]): string {
	const articleAsset = getLatestAssetByType(assets, "dd_article");
	if (!articleAsset || !isRecord(articleAsset.content)) {
		return "";
	}

	const markdownCandidate = articleAsset.content.markdown;
	return typeof markdownCandidate === "string" ? markdownCandidate : "";
}

function getSeoGeoPayloadFromAsset(assets: ContentAsset[]): Record<string, unknown> | null {
	const seoAsset = getLatestAssetByType(assets, "dd_seo_geo");
	if (!seoAsset || !isRecord(seoAsset.content)) {
		return null;
	}

	return seoAsset.content;
}

export default function DataDrivenDashboardPage() {
	const { inputData, inputType, pendingDataDrivenFile, sessionId, assets, setAssets, upsertAsset } = useSessionContext();
	const [includeResearch, setIncludeResearch] = useState(false);
	const [stepKeys, setStepKeys] = useState<StepKey[]>([]);
	const [stepState, setStepState] = useState<StepStateMap>(createEmptyStepStateMap);
	const [isReady, setIsReady] = useState(false);
	const runningStepRef = useRef<StepKey | null>(null);

	const isValidSession = inputType === "data-driven" && isDataDrivenInputData(inputData) && Boolean(sessionId);
	const dataInput: DataDrivenInputData | null = isDataDrivenInputData(inputData) ? inputData : null;

	const mode = useMemo(() => {
		if (!isValidSession || !inputData) {
			return "topic" as const;
		}

		return inputData.topic ? "topic" : "data";
	}, [inputData, isValidSession]);

	useEffect(() => {
		if (!isValidSession || !dataInput) {
			setStepState(createEmptyStepStateMap());
			setStepKeys([]);
			setIsReady(false);
			setIncludeResearch(false);
			return;
		}

		const restored = buildRestoredPipelineState({
			mode,
			assets,
		});

		const articleMarkdown = getArticleMarkdownFromAsset(assets);
		const seoGeoPayload = getSeoGeoPayloadFromAsset(assets);

		setIncludeResearch(restored.includeResearch);
		setStepKeys(restored.stepKeys);
		setStepState({
			...restored.stepStates,
			article:
				articleMarkdown.length > 0
					? {
						status: "complete",
						content: {
							markdown: articleMarkdown,
						} satisfies ArticleStateData,
					}
					: restored.stepStates.article,
			seoGeo:
				seoGeoPayload
					? {
						status: "complete",
						content: seoGeoPayload,
					}
					: restored.stepStates.seoGeo,
		});
		setIsReady(true);
	}, [assets, dataInput, isValidSession, mode]);

	useEffect(() => {
		if (!sessionId) return;

		void (async () => {
			const supabase = getSupabaseBrowserClient();
			const { data: { session } } = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) return;

			void fetch(`/api/pipeline/state?sessionId=${sessionId}`, {
				headers: { authorization: `Bearer ${token}` },
			})
				.then((res) => res.json())
				.then((body: { steps?: Record<string, { status: string; assetId: string }> }) => {
					if (!body.steps) return;
					setStepState((current) => {
						const updated = { ...current };
						for (const [key, val] of Object.entries(body.steps ?? {})) {
							if (val.status === "complete") {
								updated[key as StepKey] = {
									...current[key as StepKey],
									status: "complete",
								} as never;
							}
						}
						return updated;
					});
				})
				.catch(() => { /* ignore — fall back to client-derived state */ });
		})();
	}, [sessionId]);

	const setStepRuntimeState = useCallback((stepKey: StepKey, nextState: StepRuntimeState) => {
		setStepState((currentState) => ({
			...currentState,
			[stepKey]: nextState,
		}));
	}, []);

	const executeAssess = useCallback(async (): Promise<void> => {
		if (!dataInput || !sessionId) {
			throw new Error("Session data is missing");
		}

		const sourceText = dataInput.sourceText?.trim() ?? "";
		if (!sourceText) {
			throw new Error("Assessment requires source text from data mode input");
		}

		const response = await postJson<StepResponse<AssessData>>("/api/data-driven/assess", {
			sourceText,
			sessionId,
		});

		if (!response.data) {
			throw new Error("Assessment did not return data");
		}

		const assessData = response.data;
		setStepRuntimeState("assess", {
			status: "complete",
			content: assessData,
		});

		if (assessData.sufficient) {
			setIncludeResearch(false);
			setStepKeys(buildStepKeys("data", false));
		} else {
			setIncludeResearch(true);
			setStepKeys(buildStepKeys("data", true));
		}
	}, [dataInput, sessionId, setStepRuntimeState]);

	const executeResearch = useCallback(async (): Promise<void> => {
		if (!dataInput || !sessionId) {
			throw new Error("Session data is missing");
		}

		const assessContent = stepState.assess.content as AssessData | undefined;
		const topic = dataInput.topic?.trim() || assessContent?.suggestedTopic || "";

		const response = await postJson<StepResponse<ContentAsset>>("/api/data-driven/research", {
			topic,
			sourceText: dataInput.sourceText,
			sessionId,
		});

		if (!response.data) {
			throw new Error("Research did not return an asset");
		}

		upsertAsset(response.data);
		setStepRuntimeState("research", {
			status: "complete",
			content: response.data.content as ResearchAssetData,
		});
	}, [dataInput, sessionId, setStepRuntimeState, stepState.assess.content, upsertAsset]);

	const executeArticle = useCallback(async (): Promise<void> => {
		if (!dataInput || !sessionId) {
			throw new Error("Session data is missing");
		}

		const response = await fetch("/api/data-driven/article", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				sourceText: dataInput.sourceText,
				researchData: stepState.research.content,
				sessionId,
			}),
		});

		if (!response.ok) {
			throw new Error(await parseErrorMessage(response));
		}

		if (!response.body) {
			throw new Error("Article response did not stream content");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let markdown = "";
		let streamBuffer = "";
		let finalWordCount = 0;

		const processEvents = (rawEventBlock: string) => {
			const events = parseSseChunk(rawEventBlock);
			for (const event of events) {
				if (event.text) {
					markdown += event.text;
					setStepRuntimeState("article", {
						status: "in-progress",
						content: {
							markdown,
						} satisfies ArticleStateData,
					});
				}

				if (event.error) {
					throw new Error(event.error);
				}

				if (event.asset) {
					upsertAsset(event.asset as ContentAsset);
				}

				if (event.done) {
					finalWordCount = event.wordCount ?? 0;
				}
			}
		};

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			streamBuffer += decoder.decode(value, { stream: true });
			const completeEvents = streamBuffer.split("\n\n");
			streamBuffer = completeEvents.pop() ?? "";

			for (const rawEvent of completeEvents) {
				processEvents(rawEvent);
			}
		}

		if (streamBuffer.trim().length > 0) {
			processEvents(streamBuffer);
		}

		setStepRuntimeState("article", {
			status: "complete",
			content: {
				markdown,
				wordCount: finalWordCount,
			} satisfies ArticleStateData,
		});
	}, [dataInput, sessionId, setStepRuntimeState, stepState.research.content, upsertAsset]);

	const executeSeoGeo = useCallback(async (): Promise<void> => {
		if (!sessionId) {
			throw new Error("Session ID is missing");
		}

		const articleContent = stepState.article.content as ArticleStateData | undefined;
		const article = articleContent?.markdown?.trim() ?? "";

		if (!article) {
			throw new Error("SEO + GEO requires generated article content");
		}

		const response = await postJson<StepResponse<ContentAsset>>("/api/data-driven/seo-geo", {
			article,
			sessionId,
		});

		if (!response.data) {
			throw new Error("SEO + GEO did not return an asset");
		}

		upsertAsset(response.data);
		setStepRuntimeState("seoGeo", {
			status: "complete",
			content: response.data.content,
		});
	}, [sessionId, setStepRuntimeState, stepState.article.content, upsertAsset]);

	const executeDistribution = useCallback(async (): Promise<void> => {
		if (!dataInput || !sessionId) {
			throw new Error("Session data is missing");
		}

		const articleContent = stepState.article.content as ArticleStateData | undefined;
		const article = articleContent?.markdown?.trim() ?? "";
		if (!article) {
			throw new Error("Distribution requires generated article content");
		}

		const seoGeoPayload = stepState.seoGeo.content;
		if (!isRecord(seoGeoPayload)) {
			throw new Error("Distribution requires SEO + GEO output");
		}

		const [multiFormatResponse, xCampaignResponse, threadsCampaignResponse] = await Promise.all([
			postJson<
				StepResponse<{
					blog: ContentAsset;
					linkedin: ContentAsset;
					medium: ContentAsset;
					newsletter: ContentAsset;
				}>
			>("/api/data-driven/multi-format", {
				article,
				seoGeo: seoGeoPayload,
				tone: dataInput.tone,
				sessionId,
			}),
			postJson<StepResponse<ContentAsset>>("/api/data-driven/x-campaign", {
				article,
				seoGeo: seoGeoPayload,
				tone: dataInput.tone,
				sessionId,
			}),
			postJson<StepResponse<ContentAsset>>("/api/data-driven/threads-campaign", {
				article,
				seoGeo: seoGeoPayload,
				tone: dataInput.tone,
				sessionId,
			}),
		]);

		if (!multiFormatResponse.data || !xCampaignResponse.data || !threadsCampaignResponse.data) {
			throw new Error("Distribution step did not return all expected assets");
		}

		upsertAsset(multiFormatResponse.data.blog);
		upsertAsset(multiFormatResponse.data.linkedin);
		upsertAsset(multiFormatResponse.data.medium);
		upsertAsset(multiFormatResponse.data.newsletter);
		upsertAsset(xCampaignResponse.data);
		upsertAsset(threadsCampaignResponse.data);

		setStepRuntimeState("distribution", {
			status: "complete",
			content: {
				blogReady: true,
				xCampaignReady: true,
				threadsCampaignReady: true,
				generatedAssets: ["Blog", "LinkedIn", "Medium", "Newsletter", "X Campaign", "Threads Campaign"],
			} satisfies DistributionStateData,
		});
	}, [dataInput, sessionId, setStepRuntimeState, stepState.article.content, stepState.seoGeo.content, upsertAsset]);

	const executeStep = useCallback(
		async (stepKey: StepKey): Promise<void> => {
			switch (stepKey) {
				case "assess":
					await executeAssess();
					break;
				case "research":
					await executeResearch();
					break;
				case "article":
					await executeArticle();
					break;
				case "seoGeo":
					await executeSeoGeo();
					break;
				case "distribution":
					await executeDistribution();
					break;
				default:
					throw new Error(`Unknown step ${stepKey}`);
			}
		},
		[executeArticle, executeAssess, executeDistribution, executeResearch, executeSeoGeo],
	);

	const runStep = useCallback(
		async (stepKey: StepKey): Promise<void> => {
			if (runningStepRef.current) {
				return;
			}

			runningStepRef.current = stepKey;
			setStepRuntimeState(stepKey, {
				status: "in-progress",
				content: stepState[stepKey].content,
			});

			try {
				await executeStep(stepKey);
			} catch (error) {
				setStepRuntimeState(stepKey, {
					status: "error",
					content: stepState[stepKey].content,
					error: getErrorMessage(error),
				});
			} finally {
				runningStepRef.current = null;
			}
		},
		[executeStep, setStepRuntimeState, stepState],
	);

	useEffect(() => {
		if (!isReady || stepKeys.length === 0 || runningStepRef.current) {
			return;
		}

		const hasInProgress = stepKeys.some((stepKey) => stepState[stepKey].status === "in-progress");
		if (hasInProgress) {
			return;
		}

		const nextPendingStepIndex = getNextPendingStepIndex(stepKeys, stepState);
		if (nextPendingStepIndex < 0) {
			return;
		}

		void runStep(stepKeys[nextPendingStepIndex]);
	}, [isReady, runStep, stepKeys, stepState]);

	const currentStepIndex = useMemo(() => {
		const inProgressStepIndex = stepKeys.findIndex((stepKey) => stepState[stepKey].status === "in-progress");
		if (inProgressStepIndex >= 0) {
			return inProgressStepIndex;
		}

		const nextPendingStepIndex = getNextPendingStepIndex(stepKeys, stepState);
		if (nextPendingStepIndex >= 0) {
			return nextPendingStepIndex;
		}

		return Math.max(stepKeys.length - 1, 0);
	}, [stepKeys, stepState]);

	const stepConfigs = useMemo<StepConfig[]>(() => {
		return stepKeys.map((stepKey) => {
			const state = stepState[stepKey];
			const errorNode = state.error ? <p className="text-sm text-red-600">{state.error}</p> : null;

			if (stepKey === "assess" && isAssessData(state.content)) {
				const content = state.content;
				return {
					label: STEP_LABELS[stepKey],
					status: state.status,
					content: (
						<div className="space-y-2 text-sm">
							<p>
								Assessment result: <span className="font-medium">{content.sufficient ? "Sufficient" : "Insufficient"}</span>
							</p>
							{content.missingAreas.length > 0 ? (
								<p className="text-muted-foreground">Missing areas: {content.missingAreas.join(", ")}</p>
							) : null}
							{content.suggestedTopic ? (
								<p className="text-muted-foreground">Suggested topic: {content.suggestedTopic}</p>
							) : null}
							{errorNode}
						</div>
					),
				};
			}

			if (stepKey === "research" && isRecord(state.content)) {
				const content = state.content as ResearchAssetData;
				return {
					label: STEP_LABELS[stepKey],
					status: state.status,
					content: (
						<div className="space-y-2 text-sm">
							{content.summary ? <p className="text-muted-foreground">{content.summary}</p> : null}
							{Array.isArray(content.keyFindings) && content.keyFindings.length > 0 ? (
								<p className="text-muted-foreground">Key findings: {content.keyFindings.slice(0, 3).join(" | ")}</p>
							) : null}
							{errorNode}
						</div>
					),
				};
			}

			if (stepKey === "article" && isArticleStateData(state.content)) {
				const content = state.content;
				return {
					label: STEP_LABELS[stepKey],
					status: state.status,
					content: (
						<div className="space-y-3 text-sm">
							{typeof content.wordCount === "number" && content.wordCount > 0 ? (
								<p className="text-muted-foreground">Word count: {content.wordCount}</p>
							) : null}
							<div className="max-h-96 overflow-y-auto rounded border bg-muted/20 p-3">
								<ReactMarkdown>{content.markdown}</ReactMarkdown>
							</div>
							{errorNode}
						</div>
					),
				};
			}

			if (stepKey === "seoGeo" && isRecord(state.content)) {
				const content = state.content as SeoGeoStateData;
				return {
					label: STEP_LABELS[stepKey],
					status: state.status,
					content: (
						<div className="space-y-2 text-sm text-muted-foreground">
							{content.seo?.title ? <p>Title: {content.seo.title}</p> : null}
							{content.seo?.slug ? <p>Slug: {content.seo.slug}</p> : null}
							{content.seo?.primaryKeyword ? <p>Primary keyword: {content.seo.primaryKeyword}</p> : null}
							{content.geo?.sourceAttribution ? <p>Attribution: {content.geo.sourceAttribution}</p> : null}
							{errorNode}
						</div>
					),
				};
			}

			if (stepKey === "distribution" && isDistributionStateData(state.content)) {
				const content = state.content;
				return {
					label: STEP_LABELS[stepKey],
					status: state.status,
					content: (
						<div className="space-y-2 text-sm text-muted-foreground">
							<p>Blog: {content.blogReady ? "Ready" : "Pending"}</p>
							<p>X Campaign: {content.xCampaignReady ? "Ready" : "Pending"}</p>
							<p>Threads Campaign: {content.threadsCampaignReady ? "Ready" : "Pending"}</p>
							{content.generatedAssets.length > 0 ? (
								<p>Assets: {content.generatedAssets.join(", ")}</p>
							) : null}
							{errorNode}
						</div>
					),
				};
			}

			return {
				label: STEP_LABELS[stepKey],
				status: state.status,
				content: errorNode,
			};
		});
	}, [stepKeys, stepState]);

	const handleRegenerate = useCallback(
		(stepIndex: number) => {
			const stepKey = stepKeys[stepIndex];
			if (!stepKey) {
				return;
			}

			setStepState((currentState) => resetForRegenerate(stepKeys, currentState, stepKey));
			runningStepRef.current = null;

			const downstreamAssetTypes = new Set(getDownstreamAssetTypesForRegenerate(stepKey));
			setAssets(assets.filter((asset) => !downstreamAssetTypes.has(asset.assetType)));

			if (mode === "data" && stepKey === "assess" && includeResearch) {
				setIncludeResearch(false);
				setStepKeys(buildStepKeys("data", false));
			}
		},
		[assets, includeResearch, mode, setAssets, stepKeys],
	);

	if (!isValidSession || !dataInput || !sessionId) {
		return (
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-semibold text-foreground">Data-Driven Pipeline</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Create a data-driven session from the dashboard to begin this workflow.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>No active data-driven session</CardTitle>
						<CardDescription>
							Start from source material or a topic brief, then return here to continue.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild>
							<Link href="/dashboard">Go to session launcher</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const sourceSummary = dataInput.topic
		? dataInput.topic
		: dataInput.sourceText
			? `${dataInput.sourceText.slice(0, 180)}${dataInput.sourceText.length > 180 ? "..." : ""}`
			: dataInput.sourceFileName ?? "Waiting for source input";

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold text-foreground">Data-Driven Pipeline</h2>
				<p className="text-sm text-muted-foreground">
					This page orchestrates the full workflow and resumes progress from your saved assets.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Session Context</CardTitle>
					<CardDescription>Pipeline mode and source summary</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge>{mode === "topic" ? "Topic mode" : "Data mode"}</Badge>
						{pendingDataDrivenFile ? <Badge variant="secondary">PDF staged</Badge> : null}
						{includeResearch ? <Badge variant="outline">Research required</Badge> : null}
					</div>

					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">Session ID</p>
						<p className="text-sm text-muted-foreground">{sessionId}</p>
					</div>

					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">Source</p>
						<p className="whitespace-pre-wrap text-sm text-muted-foreground">{sourceSummary}</p>
					</div>

					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">Tone guidance</p>
						<p className="whitespace-pre-wrap text-sm text-muted-foreground">{dataInput.tone}</p>
					</div>
				</CardContent>
			</Card>

			<DataDrivenStepper
				steps={stepConfigs}
				currentStepIndex={currentStepIndex}
				onRegenerate={handleRegenerate}
			/>
		</div>
	);
}