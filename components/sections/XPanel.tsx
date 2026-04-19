'use client'

import type { SocialOutput } from '@/lib/prompts/social'
import { SocialEditableBlock } from '@/components/sections/SocialEditableBlock'
import { PublishButton } from '@/components/sections/PublishButton'
import { useSessionContext } from '@/lib/context/SessionContext'

interface XPanelProps {
  data: SocialOutput['x']
  onSaveBlock: (path: string, value: string) => void
  onRegenerateBlock: (path: string) => Promise<void>
  regeneratingPath?: string | null
}

export function XPanel({ data, onSaveBlock, onRegenerateBlock, regeneratingPath }: XPanelProps) {
  const { sessionId } = useSessionContext()
  return (
    <div className="space-y-4">
      <SocialEditableBlock
        title="Viral Tweet"
        value={data.tweet}
        onSave={(value) => onSaveBlock('tweet', value)}
        onRegenerate={() => onRegenerateBlock('tweet')}
        isRegenerating={regeneratingPath === 'tweet'}
        rows={3}
      />

      {data.thread.map((item, index) => (
        <SocialEditableBlock
          key={`thread-${index}`}
          title={`Thread ${index + 1}`}
          value={item}
          onSave={(value) => onSaveBlock(`thread.${index}`, value)}
          onRegenerate={() => onRegenerateBlock(`thread.${index}`)}
          isRegenerating={regeneratingPath === `thread.${index}`}
          rows={3}
        />
      ))}

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

      {data.replies.map((item, index) => (
        <SocialEditableBlock
          key={`reply-${index}`}
          title={`Reply ${index + 1}`}
          value={item}
          onSave={(value) => onSaveBlock(`replies.${index}`, value)}
          onRegenerate={() => onRegenerateBlock(`replies.${index}`)}
          isRegenerating={regeneratingPath === `replies.${index}`}
          rows={2}
        />
      ))}

      <div className="mt-4 flex justify-end">
        <PublishButton
          platform="x"
          sessionId={sessionId ?? ''}
          payload={{
            content: data.tweet,
            contentType: 'tweet',
          }}
        />
      </div>
    </div>
  )
}
