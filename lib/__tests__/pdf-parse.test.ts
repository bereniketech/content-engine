import pdfParse from 'pdf-parse'
import { parsePdf } from '../pdf-parse'

jest.mock('pdf-parse', () => jest.fn())

const mockedPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>

const IMAGE_ONLY_ERROR =
  'This PDF appears to contain only images. Please paste the text content directly.'

describe('parsePdf', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns structured output for a valid PDF parse result', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 mock')
    mockedPdfParse.mockResolvedValueOnce({ text: 'Hello world', numpages: 2 } as never)

    const result = await parsePdf(pdfBuffer)

    expect(result).toEqual({
      text: 'Hello world',
      pageCount: 2,
      wasTruncated: false,
    })
    expect(mockedPdfParse).toHaveBeenCalledTimes(1)
    expect(mockedPdfParse).toHaveBeenCalledWith(pdfBuffer)
  })

  it('truncates text over 80,000 chars and sets wasTruncated to true', async () => {
    const longText = 'a'.repeat(80001)
    mockedPdfParse.mockResolvedValueOnce({ text: longText, numpages: 1 } as never)

    const result = await parsePdf(Buffer.from('%PDF-1.4 mock'))

    expect(result.pageCount).toBe(1)
    expect(result.wasTruncated).toBe(true)
    expect(result.text).toHaveLength(80000)
    expect(result.text).toBe(longText.slice(0, 80000))
  })

  it.each(['', '   \n\t  '])(
    'throws image-only guidance when extracted text is "%s"',
    async (extractedText) => {
      mockedPdfParse.mockResolvedValueOnce({ text: extractedText, numpages: 1 } as never)

      await expect(parsePdf(Buffer.from('%PDF-1.4 mock'))).rejects.toThrow(IMAGE_ONLY_ERROR)
    }
  )

  it('throws an error when parser rejects non-PDF input', async () => {
    mockedPdfParse.mockRejectedValueOnce(new Error('Invalid PDF structure'))

    await expect(parsePdf(Buffer.from('not-a-pdf'))).rejects.toThrow(
      'Failed to parse PDF: Invalid PDF structure'
    )
  })

  it('throws an error when input buffer is empty', async () => {
    await expect(parsePdf(Buffer.from(''))).rejects.toThrow('Invalid PDF: buffer is empty')
  })
})
