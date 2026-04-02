import {
	buildDataDrivenInputData,
	getDataDrivenFileKind,
	getDataDrivenValidationError,
} from "./data-driven-form";

describe("data-driven form helpers", () => {
	it("classifies supported file types", () => {
		expect(getDataDrivenFileKind("notes.txt")).toBe("text");
		expect(getDataDrivenFileKind("outline.MD")).toBe("text");
		expect(getDataDrivenFileKind("report.pdf")).toBe("pdf");
		expect(getDataDrivenFileKind("archive.docx")).toBe("unsupported");
	});

	it("requires tone for every mode", () => {
		expect(
			getDataDrivenValidationError({
				mode: "data",
				sourceText: "Market data",
				sourceFileName: "",
				topic: "",
				tone: "  ",
			}),
		).toBe("Add tone guidance before creating the session.");
	});

	it("requires a topic in topic mode", () => {
		expect(
			getDataDrivenValidationError({
				mode: "topic",
				sourceText: "",
				sourceFileName: "",
				topic: " ",
				tone: "Direct and analytical.",
			}),
		).toBe("Enter a topic before creating the session.");
	});

	it("accepts either source text or a file name in data mode", () => {
		expect(
			getDataDrivenValidationError({
				mode: "data",
				sourceText: "  ",
				sourceFileName: "dataset.pdf",
				topic: "",
				tone: "Crisp and practical.",
			}),
		).toBeNull();
	});

	it("builds topic-mode payloads without data-mode fields", () => {
		expect(
			buildDataDrivenInputData({
				mode: "topic",
				sourceText: "ignored",
				sourceFileName: "ignored.pdf",
				topic: " AI data moat ",
				tone: " Dry and sharp. ",
			}),
		).toEqual({
			topic: "AI data moat",
			tone: "Dry and sharp.",
		});
	});

	it("builds data-mode payloads with trimmed optional values", () => {
		expect(
			buildDataDrivenInputData({
				mode: "data",
				sourceText: " Survey findings ",
				sourceFileName: " report.pdf ",
				topic: "ignored",
				tone: " Conversational but skeptical. ",
			}),
		).toEqual({
			sourceText: "Survey findings",
			sourceFileName: "report.pdf",
			tone: "Conversational but skeptical.",
		});
	});
});