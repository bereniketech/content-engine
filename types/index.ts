export type SessionInputType = "topic" | "upload" | "data-driven";

export type TopicTone = "authority" | "casual" | "storytelling";

export const TOPIC_TONES: TopicTone[] = ["authority", "casual", "storytelling"];

export interface TopicInputData {
	topic: string;
	audience: string;
	tone: TopicTone;
	keywords?: string;
	geography?: string;
}

export interface UploadInputData {
	article: string;
}

export interface DataDrivenInputData {
	sourceText?: string;
	sourceFileName?: string;
	topic?: string;
	tone: string;
}

export function isDataDrivenInputData(value: unknown): value is DataDrivenInputData {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as {
		sourceText?: unknown;
		sourceFileName?: unknown;
		topic?: unknown;
		tone?: unknown;
	};

	return (
		typeof candidate.tone === "string"
		&& (candidate.sourceText === undefined || typeof candidate.sourceText === "string")
		&& (candidate.sourceFileName === undefined || typeof candidate.sourceFileName === "string")
		&& (candidate.topic === undefined || typeof candidate.topic === "string")
	);
}

export function isTopicInputData(value: unknown): value is TopicInputData {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as {
		topic?: unknown;
		audience?: unknown;
		tone?: unknown;
	};

	return (
		typeof candidate.topic === "string"
		&& typeof candidate.audience === "string"
		&& typeof candidate.tone === "string"
		&& TOPIC_TONES.includes(candidate.tone as TopicTone)
	);
}

export interface DeepResearchResult {
	summary: string;
	keyFindings: string[];
	statistics: string[];
	expertInsights: string[];
	caseStudies: string[];
	controversies: string[];
	trends: string[];
	gaps: string[];
	sourceUrls: string[];
	capabilitiesUsed: string[];
}

export interface AssessmentResult {
	[key: string]: unknown;
}

export interface SeoGeoResult {
	seo: {
		title: string;
		metaDescription: string;
		slug: string;
		primaryKeyword: string;
		secondaryKeywords: string[];
		headingStructure: {
			h2: string[];
			h3: string[];
		};
		faqSchema: Array<{
			question: string;
			answer: string;
		}>;
		seoScore: number;
	};
	geo: {
		citationOptimization: string[];
		entityMarking: Array<{
			entity: string;
			description: string;
		}>;
		conciseAnswers: Array<{
			question: string;
			answer: string;
		}>;
		structuredClaims: string[];
		sourceAttribution: string;
	};
}

export interface XCampaignPost {
	[key: string]: unknown;
}

export interface XCampaignOutput {
	posts: XCampaignPost[];
}

export interface ThreadsCampaignPost {
	[key: string]: unknown;
}

export interface ThreadsCampaignOutput {
	posts: ThreadsCampaignPost[];
}

export interface MultiFormatOutput {
	[key: string]: unknown;
}

export type SessionInputData = TopicInputData | UploadInputData | DataDrivenInputData;

export interface ContentAsset {
	id: string;
	assetType: string;
	content: Record<string, unknown>;
	version: number;
	createdAt: string;
}

export interface SeoResult {
	title: string;
	metaDescription: string;
	slug: string;
	primaryKeyword: string;
	secondaryKeywords: string[];
	snippetAnswer: string;
	headingStructure: {
		h1: string;
		h2: string[];
		h3: string[];
	};
	faqSchema: Array<{ question: string; answer: string }>;
	articleSchema: {
		headline: string;
		description: string;
		author: string;
		datePublished: string;
	};
	seoScore: number;
	keywordScore: number;
	rankingPotential: "Low" | "Medium" | "High";
}
