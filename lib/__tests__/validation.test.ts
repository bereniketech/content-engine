import { VALIDATION_CONSTANTS } from '../validation'

describe('VALIDATION_CONSTANTS', () => {
  it('MIN_SOURCE_TEXT_LENGTH is a positive number', () => {
    expect(typeof VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH).toBe('number')
    expect(VALIDATION_CONSTANTS.MIN_SOURCE_TEXT_LENGTH).toBeGreaterThan(0)
  })

  it('MIN_ARTICLE_IMPROVE_LENGTH is 101', () => {
    expect(VALIDATION_CONSTANTS.MIN_ARTICLE_IMPROVE_LENGTH).toBe(101)
  })

  it('ALLOWED_FILE_EXTENSIONS includes txt, md, pdf', () => {
    expect(VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS).toContain('txt')
    expect(VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS).toContain('md')
    expect(VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS).toContain('pdf')
  })
})
