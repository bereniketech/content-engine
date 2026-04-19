import { getTwitterSecrets, ConfigError } from '../secrets'

describe('getTwitterSecrets', () => {
  it('throws ConfigError when TWITTER_API_KEY is missing', () => {
    const orig = process.env.TWITTER_API_KEY
    delete process.env.TWITTER_API_KEY
    expect(() => getTwitterSecrets()).toThrow(ConfigError)
    process.env.TWITTER_API_KEY = orig
  })

  it('returns all keys when env vars are set', () => {
    process.env.TWITTER_API_KEY = 'k'
    process.env.TWITTER_API_SECRET = 's'
    process.env.TWITTER_ACCESS_TOKEN = 'at'
    process.env.TWITTER_ACCESS_SECRET = 'as'
    const secrets = getTwitterSecrets()
    expect(secrets.apiKey).toBe('k')
  })
})
