import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { dataDrivenPipeline } from '@/lib/inngest/data-driven-pipeline'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dataDrivenPipeline],
})
