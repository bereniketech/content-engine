interface SearchResult {
  title: string
  link: string
  snippet: string
}

import { runNotebookLmCliResearch } from '@/lib/notebooklm-cli'

const NOTEBOOKLM_SOURCE_LINK = 'https://notebooklm.google.com/'

export async function googleSearch(query: string): Promise<SearchResult[]> {
  try {
    const synthesized = await runNotebookLmCliResearch(query)
    const snippet = synthesized.replace(/\s+/g, ' ').trim()

    if (!snippet) {
      return []
    }

    return [
      {
        title: `${query} (NotebookLM synthesis)`,
        link: NOTEBOOKLM_SOURCE_LINK,
        snippet,
      },
    ]
  } catch (error) {
    console.error('NotebookLM search synthesis error:', error)
    throw error
  }
}
