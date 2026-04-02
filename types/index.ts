export type SessionInputType = "topic" | "upload" | "data-driven";

export type TopicTone = "authority" | "casual" | "storytelling";

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

export interface DeepResearchResult {
	[key: string]: unknown;
}

export interface AssessmentResult {
	[key: string]: unknown;
}

export interface SeoGeoResult {
	seo: Record<string, unknown>;
	geo: Record<string, unknown>;
}

export interface XCampaignPost {
	[key: string]: unknown;
}

export interface XCampaignOutput {
	posts: XCampaignPost[];
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
