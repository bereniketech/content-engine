import { fal } from '@fal-ai/client'
import { IngestionError } from './errors'

const TRANSCRIPTION_TIMEOUT_MS = 120_000

interface WhisperResult {
  text: string
}

export async function transcribeAudio(url: string): Promise<string> {
  if (!url) {
    throw new IngestionError('audio', 'Invalid audio URL')
  }

  const falKey = process.env.FAL_API_KEY
  if (!falKey) {
    throw new IngestionError('audio', 'FAL_API_KEY not configured')
  }

  fal.config({ credentials: falKey })

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new IngestionError('audio', 'Transcription timed out')),
      TRANSCRIPTION_TIMEOUT_MS
    )
  )

  let result: WhisperResult
  try {
    result = await Promise.race([
      fal.run('fal-ai/whisper', { input: { audio_url: url } }) as Promise<WhisperResult>,
      timeoutPromise,
    ])
  } catch (err) {
    if (err instanceof IngestionError) throw err
    throw new IngestionError('audio', `Transcription failed: ${(err as Error).message}`)
  }

  if (!result.text) {
    throw new IngestionError('audio', 'Transcription returned no text')
  }

  return result.text
}
