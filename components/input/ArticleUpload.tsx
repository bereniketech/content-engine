"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionContext } from "@/lib/context/SessionContext";

interface ImproveApiResponse {
	id?: string;
	sessionId?: string;
	assetType?: string;
	version?: number;
	createdAt?: string;
	original: string;
	improved: string;
	changes: Array<{ type: string; description: string }>;
	data?: {
		id: string;
		sessionId: string;
		assetType: string;
		content: Record<string, unknown>;
		version: number;
		createdAt: string;
	};
}

const ARTICLE_MIN_LENGTH = 101;
const COMING_SOON_EXTENSIONS = ["pdf", "doc", "docx"];
const SUPPORTED_EXTENSIONS = ["txt", "md"];

function getFileExtension(fileName: string): string {
	const segments = fileName.toLowerCase().split(".");
	return segments.length > 1 ? segments.at(-1) ?? "" : "";
}

export function ArticleUpload() {
	const { createSession, isSubmitting, error: sessionError, sessionId, upsertAsset, applyImprovedArticle } = useSessionContext();

	const [article, setArticle] = useState("");
	const [fileName, setFileName] = useState<string | null>(null);
	const [showComingSoon, setShowComingSoon] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isImproving, setIsImproving] = useState(false);

	const isArticleValid = useMemo(
		() => article.trim().length >= ARTICLE_MIN_LENGTH,
		[article],
	);

	const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		setError(null);
		setSuccess(null);

		if (!file) {
			return;
		}

		const extension = getFileExtension(file.name);

		if (COMING_SOON_EXTENSIONS.includes(extension)) {
			setShowComingSoon(true);
			setFileName(file.name);
			return;
		}

		if (!SUPPORTED_EXTENSIONS.includes(extension)) {
			setError("Only .txt and .md files are supported right now.");
			return;
		}

		try {
			const text = await file.text();
			setArticle(text);
			setFileName(file.name);
			setShowComingSoon(false);
		} catch {
			setError("Failed to read the selected file.");
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSuccess(null);

		if (!isArticleValid) {
			setError("Article content must be longer than 100 characters.");
			return;
		}

		setError(null);
		const normalizedArticle = article.trim();
		const result = await createSession("upload", { article: normalizedArticle });

		if (result.error) {
			return;
		}

		setIsImproving(true);

		try {
			const response = await fetch("/api/improve", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ article: normalizedArticle, sessionId: result.sessionId }),
			});

			if (!response.ok) {
				const payload = (await response.json()) as { error?: { message?: string } };
				throw new Error(payload.error?.message ?? "Failed to improve article.");
			}

			const improvedPayload = (await response.json()) as ImproveApiResponse;
			applyImprovedArticle(improvedPayload.improved);
			if (improvedPayload.data) {
				upsertAsset({
					id: improvedPayload.data.id,
					assetType: improvedPayload.data.assetType,
					content: improvedPayload.data.content,
					version: improvedPayload.data.version,
					createdAt: improvedPayload.data.createdAt,
				});
			}
			setSuccess("Session created and article improved successfully.");
		} catch (improveError) {
			setError(
				improveError instanceof Error
					? improveError.message
					: "Failed to improve article. Please try again.",
			);
		} finally {
			setIsImproving(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Upload Or Paste Article</CardTitle>
				<CardDescription>
					Paste full text or upload a .txt/.md file to seed downstream content.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-foreground" htmlFor="article">
							Article text
						</label>
						<textarea
							id="article"
							value={article}
							onChange={(event) => setArticle(event.target.value)}
							className="min-h-52 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
							placeholder="Paste your article here..."
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-foreground" htmlFor="article-file">
							Upload file (.txt or .md)
						</label>
						<input
							id="article-file"
							type="file"
							onChange={handleFileSelection}
							accept=".txt,.md,.pdf,.doc,.docx"
							className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm file:text-foreground"
						/>
						{fileName ? (
							<p className="text-xs text-muted-foreground">Selected: {fileName}</p>
						) : null}
						{showComingSoon ? (
							<Badge variant="secondary" className="mt-1">
								PDF/Doc upload coming soon
							</Badge>
						) : null}
					</div>

					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					{!error && sessionError ? <p className="text-sm text-destructive">{sessionError}</p> : null}
					{success && sessionId ? (
						<p className="text-sm text-primary">
							{success} Session ID: <span className="font-mono">{sessionId}</span>
						</p>
					) : null}

					<Button type="submit" disabled={isSubmitting || isImproving}>
						{isSubmitting
							? "Creating session..."
							: isImproving
								? "Improving article..."
								: "Create Upload Session"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
