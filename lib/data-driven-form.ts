import type { DataDrivenInputData } from "@/types";
import { VALIDATION_CONSTANTS } from "@/lib/validation";

export type DataDrivenFormMode = "data" | "topic";
export type DataDrivenFileKind = "text" | "pdf" | "unsupported";

interface DataDrivenDraftInput {
	mode: DataDrivenFormMode;
	sourceText: string;
	sourceFileName: string;
	topic: string;
	tone: string;
}

const TEXT_FILE_EXTENSIONS = new Set(VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS.filter(
  (ext) => ext !== 'pdf'
) as string[]);
const PDF_FILE_EXTENSION = "pdf";

export function getDataDrivenFileKind(fileName: string): DataDrivenFileKind {
	const normalizedFileName = fileName.trim().toLowerCase();
	const extension = normalizedFileName.includes(".")
		? normalizedFileName.split(".").at(-1) ?? ""
		: "";

	if (TEXT_FILE_EXTENSIONS.has(extension)) {
		return "text";
	}

	if (extension === PDF_FILE_EXTENSION) {
		return "pdf";
	}

	return "unsupported";
}

export function getDataDrivenValidationError(input: DataDrivenDraftInput): string | null {
	const tone = input.tone.trim();
	const sourceText = input.sourceText.trim();
	const sourceFileName = input.sourceFileName.trim();
	const topic = input.topic.trim();

	if (!tone) {
		return "Add tone guidance before creating the session.";
	}

	if (input.mode === "topic") {
		return topic ? null : "Enter a topic before creating the session.";
	}

	if (!sourceText && !sourceFileName) {
		return "Add source text or select a file before creating the session.";
	}

	if (sourceText && sourceText.length < VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH) {
		return `Source text must be at least ${VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH} characters.`;
	}

	return null;
}

export function buildDataDrivenInputData(input: DataDrivenDraftInput): DataDrivenInputData {
	const normalizedTone = input.tone.trim();

	if (input.mode === "topic") {
		return {
			topic: input.topic.trim(),
			tone: normalizedTone,
		};
	}

	const normalizedSourceText = input.sourceText.trim();
	const normalizedSourceFileName = input.sourceFileName.trim();

	return {
		...(normalizedSourceText ? { sourceText: normalizedSourceText } : {}),
		...(normalizedSourceFileName ? { sourceFileName: normalizedSourceFileName } : {}),
		tone: normalizedTone,
	};
}