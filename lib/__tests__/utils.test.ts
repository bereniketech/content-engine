import { getWordCount } from '../utils'

describe('getWordCount', () => {
  it('returns 0 for empty string', () => {
    expect(getWordCount('')).toBe(0)
  })

  it('returns 1 for a single word', () => {
    expect(getWordCount('hello')).toBe(1)
  })

  it('counts words in a normal sentence', () => {
    expect(getWordCount('the quick brown fox')).toBe(4)
  })

  it('handles leading, trailing, and multiple spaces', () => {
    expect(getWordCount('  hello   world  ')).toBe(2)
  })
})
