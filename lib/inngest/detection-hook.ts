import { createClient } from '@supabase/supabase-js'
import { inngest } from './client'
import { runDetectionWithRewrite } from '@/lib/detect'

export const runDetection = inngest.createFunction(
  { id: 'run-detection', name: 'Post-Generation Detection' },
  { event: 'content/detect.run' },
  async ({ event, step }) => {
    const { sessionId, articleText } = event.data as { sessionId: string; articleText: string }
    await step.run('detect-and-rewrite', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      return runDetectionWithRewrite(sessionId, articleText, supabase)
    })
  }
)
