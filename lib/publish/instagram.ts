import { getInstagramSecrets } from './secrets'

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

interface ContainerResponse {
  id: string
}

interface PublishResponse {
  id: string
}

export async function publishToInstagram(caption: string, imageUrl: string): Promise<string> {
  const { accessToken, businessAccountId } = getInstagramSecrets()

  // Step 1: Create media container
  const containerUrl = `${GRAPH_BASE}/${businessAccountId}/media`
  const containerParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  })

  const containerResponse = await fetch(`${containerUrl}?${containerParams.toString()}`, {
    method: 'POST',
  })

  if (!containerResponse.ok) {
    const errBody = await containerResponse.json() as { error?: { message: string } }
    throw new Error(`Instagram container error: ${errBody.error?.message ?? containerResponse.status}`)
  }

  const container = (await containerResponse.json()) as ContainerResponse
  const containerId = container.id

  // Step 2: Wait for container to process (Instagram recommendation)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Step 3: Publish media container
  const publishUrl = `${GRAPH_BASE}/${businessAccountId}/media_publish`
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  })

  const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, {
    method: 'POST',
  })

  if (!publishResponse.ok) {
    const errBody = await publishResponse.json() as { error?: { message: string } }
    throw new Error(`Instagram publish error: ${errBody.error?.message ?? publishResponse.status}`)
  }

  const published = (await publishResponse.json()) as PublishResponse
  return published.id
}
