export class IngestionError extends Error {
  constructor(
    public readonly source: 'youtube' | 'audio' | 'web',
    message: string
  ) {
    super(message)
    this.name = 'IngestionError'
  }
}
