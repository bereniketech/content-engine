'use client'

import type { SocialOutput } from '@/lib/prompts/social'
import { SocialEditableBlock } from '@/components/sections/SocialEditableBlock'
import { PublishButton } from '@/components/sections/PublishButton'

interface NewsletterPanelProps {
  data: SocialOutput['newsletter']
  onSaveBlock: (path: string, value: string) => void
  onRegenerateBlock: (path: string) => Promise<void>
  regeneratingPath?: string | null
  sessionId?: string | null
}

export function NewsletterPanel({ data, onSaveBlock, onRegenerateBlock, regeneratingPath, sessionId }: NewsletterPanelProps) {
  return (
    <div className="space-y-4">
      {data.subjectLines.map((item, index) => (
        <SocialEditableBlock
          key={`subject-${index}`}
          title={`Subject Line ${index + 1}`}
          value={item}
          onSave={(value) => onSaveBlock(`subjectLines.${index}`, value)}
          onRegenerate={() => onRegenerateBlock(`subjectLines.${index}`)}
          isRegenerating={regeneratingPath === `subjectLines.${index}`}
          rows={2}
        />
      ))}

      <SocialEditableBlock
        title="Newsletter Body"
        value={data.body}
        onSave={(value) => onSaveBlock('body', value)}
        onRegenerate={() => onRegenerateBlock('body')}
        isRegenerating={regeneratingPath === 'body'}
        rows={8}
      />

      <SocialEditableBlock
        title="Newsletter CTA"
        value={data.cta}
        onSave={(value) => onSaveBlock('cta', value)}
        onRegenerate={() => onRegenerateBlock('cta')}
        isRegenerating={regeneratingPath === 'cta'}
        rows={3}
      />
      <div className="flex justify-end">
        <PublishButton
          platform="newsletter_mailchimp"
          sessionId={sessionId ?? ''}
          payload={{ subjectLine: data.subjectLines[0] ?? '', htmlBody: data.body, contentType: 'newsletter' }}
          label="Send Newsletter"
        />
      </div>
    </div>
  )
}
