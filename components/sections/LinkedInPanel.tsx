'use client'

import type { SocialOutput } from '@/lib/prompts/social'
import { SocialEditableBlock } from '@/components/sections/SocialEditableBlock'

interface LinkedInPanelProps {
  data: SocialOutput['linkedin']
  onSaveBlock: (path: string, value: string) => void
  onRegenerateBlock: (path: string) => Promise<void>
  regeneratingPath?: string | null
}

export function LinkedInPanel({ data, onSaveBlock, onRegenerateBlock, regeneratingPath }: LinkedInPanelProps) {
  return (
    <div className="space-y-4">
      <SocialEditableBlock
        title="Storytelling Format"
        value={data.storytelling}
        onSave={(value) => onSaveBlock('storytelling', value)}
        onRegenerate={() => onRegenerateBlock('storytelling')}
        isRegenerating={regeneratingPath === 'storytelling'}
        rows={5}
      />

      <SocialEditableBlock
        title="Authority Format"
        value={data.authority}
        onSave={(value) => onSaveBlock('authority', value)}
        onRegenerate={() => onRegenerateBlock('authority')}
        isRegenerating={regeneratingPath === 'authority'}
        rows={5}
      />

      <SocialEditableBlock
        title="Carousel Text"
        value={data.carousel}
        onSave={(value) => onSaveBlock('carousel', value)}
        onRegenerate={() => onRegenerateBlock('carousel')}
        isRegenerating={regeneratingPath === 'carousel'}
        rows={5}
      />
    </div>
  )
}
