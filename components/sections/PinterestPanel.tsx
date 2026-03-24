'use client'

import type { SocialOutput } from '@/lib/prompts/social'
import { SocialEditableBlock } from '@/components/sections/SocialEditableBlock'

interface PinterestPanelProps {
  data: SocialOutput['pinterest']
  onSaveBlock: (path: string, value: string) => void
  onRegenerateBlock: (path: string) => Promise<void>
  regeneratingPath?: string | null
}

export function PinterestPanel({ data, onSaveBlock, onRegenerateBlock, regeneratingPath }: PinterestPanelProps) {
  return (
    <div className="space-y-4">
      {data.pins.map((pin, pinIndex) => (
        <div key={`pin-${pinIndex}`} className="space-y-3 rounded-lg border border-border bg-card p-3">
          <SocialEditableBlock
            title={`Pin ${pinIndex + 1} Title`}
            value={pin.title}
            onSave={(value) => onSaveBlock(`pins.${pinIndex}.title`, value)}
            onRegenerate={() => onRegenerateBlock(`pins.${pinIndex}.title`)}
            isRegenerating={regeneratingPath === `pins.${pinIndex}.title`}
            rows={2}
          />

          <SocialEditableBlock
            title={`Pin ${pinIndex + 1} Description`}
            value={pin.description}
            onSave={(value) => onSaveBlock(`pins.${pinIndex}.description`, value)}
            onRegenerate={() => onRegenerateBlock(`pins.${pinIndex}.description`)}
            isRegenerating={regeneratingPath === `pins.${pinIndex}.description`}
            rows={4}
          />

          {pin.keywords.map((keyword, keywordIndex) => (
            <SocialEditableBlock
              key={`pin-${pinIndex}-keyword-${keywordIndex}`}
              title={`Pin ${pinIndex + 1} Keyword ${keywordIndex + 1}`}
              value={keyword}
              onSave={(value) => onSaveBlock(`pins.${pinIndex}.keywords.${keywordIndex}`, value)}
              onRegenerate={() => onRegenerateBlock(`pins.${pinIndex}.keywords.${keywordIndex}`)}
              isRegenerating={regeneratingPath === `pins.${pinIndex}.keywords.${keywordIndex}`}
              rows={2}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
