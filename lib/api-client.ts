export async function postJson<TResponse>(
  url: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let message: string
    try {
      const data = (await response.json()) as { error?: { message?: string } }
      message = data?.error?.message ?? response.statusText
    } catch {
      message = response.statusText
    }
    throw new Error(message)
  }

  return (await response.json()) as TResponse
}
