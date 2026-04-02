import { PDFParse } from 'pdf-parse'
import { parsePdf } from '../pdf-parse'

const mockGetText = jest.fn<Promise<{ text?: string; total?: number }>, []>()
const mockDestroy = jest.fn<Promise<void>, []>().mockResolvedValue(undefined)
const mockedPDFParse = PDFParse as unknown as jest.Mock

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: mockGetText,
    destroy: mockDestroy,
  })),
}))

const IMAGE_ONLY_ERROR =
  'This PDF appears to contain only images. Please paste the text content directly.'

describe('parsePdf', () => {
  beforeEach(() => {
    mockedPDFParse.mockClear()
    mockGetText.mockReset()
    mockDestroy.mockClear()
    mockDestroy.mockResolvedValue(undefined)
  })

  it('returns structured output for a valid PDF parse result', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 mock')
    mockGetText.mockResolvedValueOnce({ text: 'Hello world', total: 2 })

    const result = await parsePdf(pdfBuffer)

    expect(result).toEqual({
      text: 'Hello world',
      pageCount: 2,
      wasTruncated: false,
    })
    expect(mockedPDFParse).toHaveBeenCalledTimes(1)
    expect(mockedPDFParse).toHaveBeenCalledWith({ data: pdfBuffer })
    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })

  it('truncates text over 80,000 chars and sets wasTruncated to true', async () => {
    const longText = 'a'.repeat(80001)
    mockGetText.mockResolvedValueOnce({ text: longText, total: 1 })

    const result = await parsePdf(Buffer.from('%PDF-1.4 mock'))

    expect(result.pageCount).toBe(1)
    expect(result.wasTruncated).toBe(true)
    expect(result.text).toHaveLength(80000)
    expect(result.text).toBe(longText.slice(0, 80000))
  })

  it.each(['', '   \n\t  '])(
    'throws image-only guidance when extracted text is "%s"',
    async (extractedText) => {
      mockGetText.mockResolvedValueOnce({ text: extractedText, total: 1 })

      await expect(parsePdf(Buffer.from('%PDF-1.4 mock'))).rejects.toThrow(IMAGE_ONLY_ERROR)
      expect(mockDestroy).toHaveBeenCalledTimes(1)
    }
  )

  it('throws an error when parser rejects non-PDF input', async () => {
    mockGetText.mockRejectedValueOnce(new Error('Invalid PDF structure'))

    await expect(parsePdf(Buffer.from('not-a-pdf'))).rejects.toThrow(
      'Failed to parse PDF: Invalid PDF structure'
    )
    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })

  it('throws an error when input buffer is empty', async () => {
    await expect(parsePdf(Buffer.from(''))).rejects.toThrow('Invalid PDF: buffer is empty')
  })
})
