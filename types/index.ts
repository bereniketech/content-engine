export type SessionInputType = "topic" | "upload";

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

export type SessionInputData = TopicInputData | UploadInputData;

export interface ContentAsset {
	id: string;
	assetType: string;
	content: Record<string, unknown>;
	version: number;
	createdAt: string;
}
