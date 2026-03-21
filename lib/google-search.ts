interface SearchResult {
  title: string
  link: string
  snippet: string
}

interface GoogleSearchResponse {
  items?: Array<{
    title: string
    link: string
    snippet: string
  }>
}

export async function googleSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID

  if (!apiKey || !searchEngineId) {
    throw new Error('Missing Google Search API credentials')
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('q', query)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('cx', searchEngineId)
  url.searchParams.set('num', '10')

  try {
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.statusText}`)
    }

    const data: GoogleSearchResponse = await response.json()
    
    if (!data.items) {
      return []
    }

    return data.items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    }))
  } catch (error) {
    console.error('Google Search error:', error)
    throw error
  }
}
