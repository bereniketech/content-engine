'use client'

import type { SocialOutput } from '@/lib/prompts/social'
import { SocialEditableBlock } from '@/components/sections/SocialEditableBlock'

interface InstagramPanelProps {
  data: SocialOutput['instagram']
  onSaveBlock: (path: string, value: string) => void
  onRegenerateBlock: (path: string) => Promise<void>
  regeneratingPath?: string | null
}

export function InstagramPanel({ data, onSaveBlock, onRegenerateBlock, regeneratingPath }: InstagramPanelProps) {
  return (
    <div className="space-y-4">
      {data.carouselCaptions.map((item, index) => (
        <SocialEditableBlock
          key={`caption-${index}`}
          title={`Carousel Caption ${index + 1}`}
          value={item}
          onSave={(value) => onSaveBlock(`carouselCaptions.${index}`, value)}
          onRegenerate={() => onRegenerateBlock(`carouselCaptions.${index}`)}
          isRegenerating={regeneratingPath === `carouselCaptions.${index}`}
          rows={3}
        />
      ))}

      <SocialEditableBlock
        title="Reel Caption"
        value={data.reelCaption}
        onSave={(value) => onSaveBlock('reelCaption', value)}
        onRegenerate={() => onRegenerateBlock('reelCaption')}
        isRegenerating={regeneratingPath === 'reelCaption'}
        rows={4}
      />

      {data.hooks.map((item, index) => (
        <SocialEditableBlock
          key={`hook-${index}`}
          title={`Hook ${index + 1}`}
          value={item}
          onSave={(value) => onSaveBlock(`hooks.${index}`, value)}
          onRegenerate={() => onRegenerateBlock(`hooks.${index}`)}
          isRegenerating={regeneratingPath === `hooks.${index}`}
          rows={2}
        />
      ))}

      <SocialEditableBlock
        title="Call To Action"
        value={data.cta}
        onSave={(value) => onSaveBlock('cta', value)}
        onRegenerate={() => onRegenerateBlock('cta')}
        isRegenerating={regeneratingPath === 'cta'}
        rows={2}
      />
    </div>
  )
}
