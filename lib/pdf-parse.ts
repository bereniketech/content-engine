import pdfParse from 'pdf-parse'

export interface ParsedPdfResult {
  text: string
  pageCount: number
  wasTruncated: boolean
}

const MAX_TEXT_LENGTH = 80000
type PdfParseCallable = (buffer: Buffer) => Promise<{ text?: string; numpages?: number }>
const parseWithPdfLib = pdfParse as unknown as PdfParseCallable

/**
 * Parses a PDF buffer and extracts text content.
 *
 * @param buffer - The PDF buffer to parse
 * @returns Promise<ParsedPdfResult> containing extracted text, page count, and truncation status
 * @throws Error if PDF is invalid, contains only images, or parsing fails
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPdfResult> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Invalid PDF: buffer is empty')
  }

  let data: { text?: string; numpages?: number }

  try {
    data = await parseWithPdfLib(buffer)
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`)
  }

  const text = (data.text ?? '').trim()

  if (!text) {
    throw new Error('This PDF appears to contain only images. Please paste the text content directly.')
  }

  const wasTruncated = text.length > MAX_TEXT_LENGTH
  const finalText = wasTruncated ? text.slice(0, MAX_TEXT_LENGTH) : text

  return {
    text: finalText,
    pageCount: data.numpages || 1,
    wasTruncated,
  }
}
