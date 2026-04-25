import { extractJsonPayload } from '../extract-json'

describe('extractJsonPayload', () => {
  it('parses a plain JSON string', () => {
    expect(extractJsonPayload('{"key":"value"}')).toEqual({ key: 'value' })
  })

  it('parses a fenced JSON block', () => {
    const raw = '```json\n{"key":"value"}\n```'
    expect(extractJsonPayload(raw)).toEqual({ key: 'value' })
  })

  it('extracts an object embedded in prose', () => {
    const raw = 'Here is the result: {"score":42} and that is it.'
    expect(extractJsonPayload(raw)).toEqual({ score: 42 })
  })

  it('throws on unparseable input', () => {
    expect(() => extractJsonPayload('not json at all')).toThrow(
      'Response did not contain valid JSON',
    )
  })
})
