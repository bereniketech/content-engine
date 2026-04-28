import { detectUrlType } from './detect-url-type'

describe('detectUrlType', () => {
  it('classifies youtube.com/watch URL as youtube', () => {
    expect(detectUrlType('https://youtube.com/watch?v=abc123')).toBe('youtube')
  })

  it('classifies youtu.be short URL as youtube', () => {
    expect(detectUrlType('https://youtu.be/abc123')).toBe('youtube')
  })

  it('classifies youtube shorts URL as youtube', () => {
    expect(detectUrlType('https://youtube.com/shorts/abc123')).toBe('youtube')
  })

  it('classifies mp3 URL as audio', () => {
    expect(detectUrlType('https://example.com/podcast.mp3')).toBe('audio')
  })

  it('classifies wav URL with query params as audio', () => {
    expect(detectUrlType('https://example.com/audio.wav?t=123')).toBe('audio')
  })

  it('classifies regular webpage as web', () => {
    expect(detectUrlType('https://example.com/article')).toBe('web')
  })

  it('classifies non-http string as invalid', () => {
    expect(detectUrlType('not-a-url')).toBe('invalid')
  })

  it('classifies ftp scheme as invalid', () => {
    expect(detectUrlType('ftp://example.com')).toBe('invalid')
  })

  it('classifies empty string as invalid', () => {
    expect(detectUrlType('')).toBe('invalid')
  })
})
