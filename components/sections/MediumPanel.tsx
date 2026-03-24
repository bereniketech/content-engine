'use client'

import type { SocialOutput } from '@/lib/prompts/social'
import { SocialEditableBlock } from '@/components/sections/SocialEditableBlock'

interface MediumPanelProps {
  data: SocialOutput['medium']
  onSaveBlock: (path: string, value: string) => void
  onRegenerateBlock: (path: string) => Promise<void>
  regeneratingPath?: string | null
}

export function MediumPanel({ data, onSaveBlock, onRegenerateBlock, regeneratingPath }: MediumPanelProps) {
  return (
    <div className="space-y-4">
      <SocialEditableBlock
        title="Reformatted Medium Article"
        value={data.article}
        onSave={(value) => onSaveBlock('article', value)}
        onRegenerate={() => onRegenerateBlock('article')}
        isRegenerating={regeneratingPath === 'article'}
        rows={8}
      />

      <SocialEditableBlock
        title="Canonical Link Suggestion"
        value={data.canonicalSuggestion}
        onSave={(value) => onSaveBlock('canonicalSuggestion', value)}
        onRegenerate={() => onRegenerateBlock('canonicalSuggestion')}
        isRegenerating={regeneratingPath === 'canonicalSuggestion'}
        rows={3}
      />
    </div>
  )
}
