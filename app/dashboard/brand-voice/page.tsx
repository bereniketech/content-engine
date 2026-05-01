'use client'

import { BrandVoiceSettings } from '@/components/sections/BrandVoiceSettings'

export default function BrandVoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Brand Voice</h1>
        <p className="text-sm text-foreground-2 mt-1">
          Define up to 5 brand voice profiles to guide AI content generation. Activate a profile to inject
          its tone, style, and constraints into every piece of content you create.
        </p>
      </div>
      <BrandVoiceSettings />
    </div>
  )
}
