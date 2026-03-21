"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionContext } from "@/lib/context/SessionContext";
import type { TopicInputData, TopicTone } from "@/types";

const TOPIC_MIN_LENGTH = 6;

const toneOptions: Array<{ label: string; value: TopicTone }> = [
	{ label: "Authority", value: "authority" },
	{ label: "Casual", value: "casual" },
	{ label: "Storytelling", value: "storytelling" },
];

export function TopicForm() {
	const { createSession, isSubmitting, error: sessionError, sessionId } = useSessionContext();

	const [formData, setFormData] = useState<TopicInputData>({
		topic: "",
		audience: "",
		tone: "authority",
		keywords: "",
		geography: "",
	});
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const isTopicValid = useMemo(
		() => formData.topic.trim().length >= TOPIC_MIN_LENGTH,
		[formData.topic],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSuccess(null);

		if (!isTopicValid) {
			setError("Topic must be longer than 5 characters.");
			return;
		}

		setError(null);
		const payload: TopicInputData = {
			topic: formData.topic.trim(),
			audience: formData.audience.trim(),
			tone: formData.tone,
			keywords: formData.keywords?.trim() || undefined,
			geography: formData.geography?.trim() || undefined,
		};

		const result = await createSession("topic", payload);
		if (result.error) {
			return;
		}

		setSuccess("Session created successfully for topic workflow.");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Start From Topic</CardTitle>
				<CardDescription>
					Define your topic and audience to kick off content generation.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-foreground" htmlFor="topic">
							Topic
						</label>
						<input
							id="topic"
							type="text"
							value={formData.topic}
							onChange={(event) =>
								setFormData((prev) => ({ ...prev, topic: event.target.value }))
							}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
							placeholder="e.g. AI marketing strategy for SaaS"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-foreground" htmlFor="audience">
							Audience
						</label>
						<input
							id="audience"
							type="text"
							value={formData.audience}
							onChange={(event) =>
								setFormData((prev) => ({ ...prev, audience: event.target.value }))
							}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
							placeholder="e.g. Founders and growth teams"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-foreground" htmlFor="tone">
							Tone
						</label>
						<select
							id="tone"
							value={formData.tone}
							onChange={(event) =>
								setFormData((prev) => ({ ...prev, tone: event.target.value as TopicTone }))
							}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
						>
							{toneOptions.map((tone) => (
								<option key={tone.value} value={tone.value}>
									{tone.label}
								</option>
							))}
						</select>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-1.5">
							<label className="text-sm font-medium text-foreground" htmlFor="keywords">
								Keywords (optional)
							</label>
							<input
								id="keywords"
								type="text"
								value={formData.keywords}
								onChange={(event) =>
									setFormData((prev) => ({ ...prev, keywords: event.target.value }))
								}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
								placeholder="e.g. pipeline, ARR, conversion"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-sm font-medium text-foreground" htmlFor="geography">
								Geography (optional)
							</label>
							<input
								id="geography"
								type="text"
								value={formData.geography}
								onChange={(event) =>
									setFormData((prev) => ({ ...prev, geography: event.target.value }))
								}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
								placeholder="e.g. North America"
							/>
						</div>
					</div>

					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					{!error && sessionError ? <p className="text-sm text-destructive">{sessionError}</p> : null}
					{success && sessionId ? (
						<p className="text-sm text-primary">
							{success} Session ID: <span className="font-mono">{sessionId}</span>
						</p>
					) : null}

					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Creating session..." : "Create Topic Session"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
