import { parseSseChunk } from '../sse-parser'

describe('parseSseChunk', () => {
  it('parses a single SSE event', () => {
    const chunk = 'data: {"text":"hello"}\n\n'
    expect(parseSseChunk(chunk)).toEqual([{ text: 'hello' }])
  })

  it('parses multiple SSE events in one chunk', () => {
    const chunk = 'data: {"text":"a"}\n\ndata: {"text":"b"}\n\n'
    expect(parseSseChunk(chunk)).toEqual([{ text: 'a' }, { text: 'b' }])
  })

  it('ignores partial/unparseable events', () => {
    const chunk = 'data: {incomplete\n\ndata: {"done":true}\n\n'
    expect(parseSseChunk(chunk)).toEqual([{ done: true }])
  })

  it('returns empty array for empty input', () => {
    expect(parseSseChunk('')).toEqual([])
  })
})
