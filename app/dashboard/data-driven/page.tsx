"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionContext } from "@/lib/context/SessionContext";
import { isDataDrivenInputData } from "@/types";

export default function DataDrivenDashboardPage() {
	const { inputData, inputType, pendingDataDrivenFile, sessionId } = useSessionContext();

	if (inputType !== "data-driven" || !isDataDrivenInputData(inputData) || !sessionId) {
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

	const sourceSummary = inputData.topic
		? inputData.topic
		: inputData.sourceText
			? `${inputData.sourceText.slice(0, 180)}${inputData.sourceText.length > 180 ? "..." : ""}`
			: inputData.sourceFileName ?? "Waiting for source input";

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-semibold text-foreground">Data-Driven Pipeline</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Session created successfully. The full pipeline stepper will build on this route next.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Session ready</CardTitle>
					<CardDescription>
						This page now acts as the pipeline landing point for the data-driven workflow.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge>{inputData.topic ? "Topic mode" : "Data mode"}</Badge>
						{pendingDataDrivenFile ? <Badge variant="secondary">PDF staged</Badge> : null}
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
						<p className="whitespace-pre-wrap text-sm text-muted-foreground">{inputData.tone}</p>
					</div>

					{pendingDataDrivenFile ? (
						<p className="text-sm text-muted-foreground">
							Staged PDF: <span className="font-medium text-foreground">{pendingDataDrivenFile.name}</span>
						</p>
					) : null}

					<Button asChild variant="outline">
						<Link href="/dashboard">Create another session</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}