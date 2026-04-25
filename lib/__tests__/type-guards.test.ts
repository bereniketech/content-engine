import { isRecord, asStringArray } from '../type-guards'

describe('isRecord', () => {
  it('returns true for a plain object', () => {
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false)
  })

  it('returns true for an array', () => {
    expect(isRecord([1, 2, 3])).toBe(true)  // arrays ARE objects — this is the actual behavior
  })

  it('returns false for a string', () => {
    expect(isRecord('hello')).toBe(false)
  })
})

describe('asStringArray', () => {
  it('returns strings from a mixed array', () => {
    expect(asStringArray(['a', 1, 'b', null])).toEqual(['a', 'b'])
  })

  it('returns empty array for non-array input', () => {
    expect(asStringArray(null)).toEqual([])
    expect(asStringArray(42)).toEqual([])
  })

  it('trims and filters empty strings', () => {
    expect(asStringArray(['  hello  ', '', '  '])).toEqual(['hello'])
  })
})
