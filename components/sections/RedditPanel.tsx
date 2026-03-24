'use client'

import type { SocialOutput } from '@/lib/prompts/social'
import { SocialEditableBlock } from '@/components/sections/SocialEditableBlock'

interface RedditPanelProps {
  data: SocialOutput['reddit']
  onSaveBlock: (path: string, value: string) => void
  onRegenerateBlock: (path: string) => Promise<void>
  regeneratingPath?: string | null
}

export function RedditPanel({ data, onSaveBlock, onRegenerateBlock, regeneratingPath }: RedditPanelProps) {
  return (
    <div className="space-y-4">
      <SocialEditableBlock
        title="Reddit Discussion Post"
        value={data.post}
        onSave={(value) => onSaveBlock('post', value)}
        onRegenerate={() => onRegenerateBlock('post')}
        isRegenerating={regeneratingPath === 'post'}
        rows={6}
      />

      {data.subreddits.map((item, index) => (
        <SocialEditableBlock
          key={`subreddit-${index}`}
          title={`Subreddit Suggestion ${index + 1}`}
          value={item}
          onSave={(value) => onSaveBlock(`subreddits.${index}`, value)}
          onRegenerate={() => onRegenerateBlock(`subreddits.${index}`)}
          isRegenerating={regeneratingPath === `subreddits.${index}`}
          rows={2}
        />
      ))}

      {data.questions.map((item, index) => (
        <SocialEditableBlock
          key={`question-${index}`}
          title={`Engagement Question ${index + 1}`}
          value={item}
          onSave={(value) => onSaveBlock(`questions.${index}`, value)}
          onRegenerate={() => onRegenerateBlock(`questions.${index}`)}
          isRegenerating={regeneratingPath === `questions.${index}`}
          rows={2}
        />
      ))}
    </div>
  )
}
