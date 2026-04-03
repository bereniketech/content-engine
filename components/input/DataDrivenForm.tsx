"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	buildDataDrivenInputData,
	getDataDrivenFileKind,
	getDataDrivenValidationError,
	type DataDrivenFormMode,
} from "@/lib/data-driven-form";
import { useSessionContext } from "@/lib/context/SessionContext";
import { isDataDrivenInputData } from "@/types";

const TONE_PLACEHOLDER =
	"Write in a witty, conversational tone with dry humor. Sound like a seasoned founder talking to other founders.";

function readTextFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
				return;
			}

			reject(new Error("The selected file could not be read as text."));
		};

		reader.onerror = () => {
			reject(new Error("Failed to read the selected file."));
		};

		reader.readAsText(file);
	});
}

export function DataDrivenForm() {
	const {
		createSession,
		error: sessionError,
		inputData,
		inputType,
		isSubmitting,
		loadSession,
		pendingDataDrivenFile,
		setPendingDataDrivenFile,
	} = useSessionContext();
	const router = useRouter();
	const prefilledInput =
		inputType === "data-driven" && isDataDrivenInputData(inputData) ? inputData : null;
	const [mode, setMode] = useState<DataDrivenFormMode>(prefilledInput?.topic ? "topic" : "data");
	const [sourceText, setSourceText] = useState(prefilledInput?.sourceText ?? "");
	const [sourceFileName, setSourceFileName] = useState(prefilledInput?.sourceFileName ?? "");
	const [topic, setTopic] = useState(prefilledInput?.topic ?? "");
	const [tone, setTone] = useState(prefilledInput?.tone ?? "");
	const [error, setError] = useState<string | null>(null);

	const handleModeChange = (nextMode: DataDrivenFormMode) => {
		setMode(nextMode);
		setError(null);
	};

	const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		setError(null);
		try {
			if (!file) {
				setSourceFileName("");
				setPendingDataDrivenFile(null);
				return;
			}

			const fileKind = getDataDrivenFileKind(file.name);

			if (fileKind === "unsupported") {
				setSourceFileName("");
				setPendingDataDrivenFile(null);
				setError("Only .txt, .md, and .pdf files are supported.");
				return;
			}

			setSourceFileName(file.name);

			if (fileKind === "pdf") {
				setPendingDataDrivenFile(file);
				setSourceText("");
				return;
			}

			setPendingDataDrivenFile(null);
			const text = await readTextFile(file);
			setSourceText(text);
		} catch (fileError) {
			setSourceFileName("");
			setSourceText("");
			setPendingDataDrivenFile(null);
			setError(
				fileError instanceof Error ? fileError.message : "Failed to read the selected file.",
			);
		} finally {
			event.target.value = "";
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (mode === "topic") {
			setPendingDataDrivenFile(null);
		}

		const validationError = getDataDrivenValidationError({
			mode,
			sourceText,
			sourceFileName,
			topic,
			tone,
		});

		if (validationError) {
			setError(validationError);
			return;
		}

		setError(null);
		const payload = buildDataDrivenInputData({
			mode,
			sourceText,
			sourceFileName,
			topic,
			tone,
		});
		const result = await createSession("data-driven", payload);

		if (result.error || !result.sessionId) {
			return;
		}

		loadSession({
			sessionId: result.sessionId,
			inputType: "data-driven",
			inputData: payload,
			assets: [],
			preservePendingDataDrivenFile: true,
		});
		router.push("/dashboard/data-driven");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Start Data-Driven Pipeline</CardTitle>
				<CardDescription>
					Choose whether you are starting from source material or a topic brief, then define the
					voice for the pipeline.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<p className="text-sm font-medium text-foreground">Starting point</p>
						<div className="inline-flex rounded-md border border-border bg-card p-1">
							<Button
								type="button"
								variant={mode === "data" ? "default" : "ghost"}
								onClick={() => handleModeChange("data")}
								aria-pressed={mode === "data"}
							>
								I have data
							</Button>
							<Button
								type="button"
								variant={mode === "topic" ? "default" : "ghost"}
								onClick={() => handleModeChange("topic")}
								aria-pressed={mode === "topic"}
							>
								I have a topic
							</Button>
						</div>
					</div>

					{mode === "data" ? (
						<div className="space-y-4">
							<div className="space-y-1.5">
								<label className="text-sm font-medium text-foreground" htmlFor="data-driven-source">
									Paste source text
								</label>
								<textarea
									id="data-driven-source"
									value={sourceText}
									onChange={(event) => setSourceText(event.target.value)}
									className="min-h-52 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
									placeholder="Paste stats, survey findings, transcripts, or other source material here..."
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-sm font-medium text-foreground" htmlFor="data-driven-file">
									Upload file (.txt, .md, .pdf)
								</label>
								<input
									id="data-driven-file"
									type="file"
									accept=".txt,.md,.pdf"
									onChange={(event) => void handleFileSelection(event)}
									className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm file:text-foreground"
								/>
								{sourceFileName ? (
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<span>Selected:</span>
										<Badge variant="secondary">{sourceFileName}</Badge>
										{pendingDataDrivenFile?.type === "application/pdf" ? (
											<Badge variant="outline">PDF ready for pipeline</Badge>
										) : null}
									</div>
								) : null}
							</div>
						</div>
					) : (
						<div className="space-y-1.5">
							<label className="text-sm font-medium text-foreground" htmlFor="data-driven-topic">
								Topic
							</label>
							<input
								id="data-driven-topic"
								type="text"
								value={topic}
								onChange={(event) => setTopic(event.target.value)}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
								placeholder="e.g. What fintech founders can learn from failed PLG launches"
							/>
						</div>
					)}

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-foreground" htmlFor="data-driven-tone">
							Tone guidance
						</label>
						<textarea
							id="data-driven-tone"
							value={tone}
							onChange={(event) => setTone(event.target.value)}
							className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
							placeholder={TONE_PLACEHOLDER}
						/>
					</div>

					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					{!error && sessionError ? <p className="text-sm text-destructive">{sessionError}</p> : null}

					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Creating session..." : "Create Data-Driven Session"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}