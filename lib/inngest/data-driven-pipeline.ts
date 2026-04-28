import { inngest } from './client'

export const dataDrivenPipeline = inngest.createFunction(
  {
    id: 'data-driven-pipeline',
    name: 'Data-Driven Content Pipeline',
    retries: 3,
  },
  { event: 'content/pipeline.start' },
  async ({ event, step }) => {
    const { sessionId, userId, mode, sourceText, researchData, tone } = event.data as {
      sessionId: string
      userId: string
      mode: 'topic' | 'data'
      sourceText?: string
      researchData?: string
      tone?: string
    }

    const internalHeaders = {
      'Content-Type': 'application/json',
      'x-inngest-internal': process.env.INNGEST_INTERNAL_SECRET ?? '',
    }

    // Step 1: Assess
    const assessment = await step.run('assess', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/data-driven/assess`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({ sourceText, sessionId, userId }),
      })
      if (!response.ok) throw new Error(`Assess step failed: ${response.status}`)
      return response.json()
    })

    // Step 2: Research (conditional — only if assess says insufficient)
    const needsResearch = (assessment as { data?: { sufficient?: boolean } })?.data?.sufficient === false
    const research = needsResearch
      ? await step.run('research', async () => {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/data-driven/research`, {
            method: 'POST',
            headers: internalHeaders,
            body: JSON.stringify({
              topic: (assessment as { data?: { suggestedTopic?: string } })?.data?.suggestedTopic ?? '',
              sourceText,
              sessionId,
              userId,
            }),
          })
          if (!response.ok) throw new Error(`Research step failed: ${response.status}`)
          return response.json()
        })
      : null

    // Step 3: Article (SSE — collect full response)
    const article = await step.run('article', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/data-driven/article`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          sourceText,
          researchData: (research as { data?: { content?: string } } | null)?.data?.content ?? researchData,
          sessionId,
          userId,
        }),
      })
      if (!response.ok) throw new Error(`Article step failed: ${response.status}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Article stream has no body')

      const decoder = new TextDecoder()
      let markdown = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const events = chunk.split('\n\n').filter(Boolean)
        for (const ev of events) {
          if (!ev.startsWith('data:')) continue
          const payload = JSON.parse(ev.slice(5).trim()) as { text?: string; done?: boolean; error?: string }
          if (payload.text) markdown += payload.text
          if (payload.error) throw new Error(`Article streaming error: ${payload.error}`)
        }
      }
      return { markdown }
    })

    // Step 4: SEO + GEO
    const seoGeo = await step.run('seo-geo', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/data-driven/seo-geo`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({ article: (article as { markdown: string }).markdown, sessionId, userId }),
      })
      if (!response.ok) throw new Error(`SEO/GEO step failed: ${response.status}`)
      return response.json()
    })

    // Step 5: Distribution (parallel within single step)
    const distribution = await step.run('distribution', async () => {
      const [multiFormat, xCampaign, threadsCampaign] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/data-driven/multi-format`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({
            article: (article as { markdown: string }).markdown,
            seoGeo: (seoGeo as { data?: { content?: unknown } })?.data?.content,
            tone,
            sessionId,
            userId,
          }),
        }).then((r) => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/data-driven/x-campaign`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({
            article: (article as { markdown: string }).markdown,
            seoGeo: (seoGeo as { data?: { content?: unknown } })?.data?.content,
            tone,
            sessionId,
            userId,
          }),
        }).then((r) => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/data-driven/threads-campaign`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({
            article: (article as { markdown: string }).markdown,
            seoGeo: (seoGeo as { data?: { content?: unknown } })?.data?.content,
            tone,
            sessionId,
            userId,
          }),
        }).then((r) => r.json()),
      ])
      return { multiFormat, xCampaign, threadsCampaign }
    })

    return {
      sessionId,
      steps: {
        assess: assessment,
        research,
        article,
        seoGeo,
        distribution,
      },
    }
  }
)
