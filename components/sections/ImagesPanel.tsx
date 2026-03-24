'use client'

import React, { useState } from 'react'
import { Check, Copy, Loader2, DownloadIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IMAGE_STYLES, type ImagePromptsOutput, type ImageStyle } from '@/lib/prompts/images'

interface ImagesPanelProps {
  data: ImagePromptsOutput
  isLoading?: boolean
}

const PromptCard: React.FC<{
  label: string
  prompts: string | string[]
  isGenerating?: boolean
  generatedImageUrl?: string
  onGenerate?: () => Promise<void>
}> = ({ label, prompts, isGenerating, generatedImageUrl, onGenerate }) => {
  const [copied, setCopied] = useState(false)
  const promptText = Array.isArray(prompts) ? prompts.join('\n\n') : prompts

  const handleCopy = async () => {
    await navigator.clipboard.writeText(promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
          {promptText}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1"
            title="Copy prompt to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>

          {onGenerate && (
            <Button
              variant="default"
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex-1"
              title="Generate image with fal.ai"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <DownloadIcon className="h-4 w-4 mr-1" />
                  Generate
                </>
              )}
            </Button>
          )}
        </div>

        {generatedImageUrl && (
          <div className="mt-3 rounded border overflow-hidden">
            <img
              src={generatedImageUrl}
              alt={label}
              className="w-full h-auto"
            />
            <a
              href={generatedImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline p-2 block"
            >
              Open in new tab →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const ImagesPanel: React.FC<ImagesPanelProps> = ({ data, isLoading }) => {
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('startup-style')
  const [generatingPrompts, setGeneratingPrompts] = useState<Set<string>>(new Set())
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({})

  const handleGenerateImage = async (promptLabel: string, promptText: string) => {
    setGeneratingPrompts((prev) => new Set(prev).add(promptLabel))

    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          style: selectedStyle,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Generation failed:', errorData)
        alert(`Image generation failed: ${errorData.error?.message || 'Unknown error'}`)
        return
      }

      const result = await response.json()
      if (result.data?.imageUrl) {
        setGeneratedImages((prev) => ({
          ...prev,
          [promptLabel]: result.data.imageUrl,
        }))
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Failed to generate image. Check console for details.')
    } finally {
      setGeneratingPrompts((prev) => {
        const next = new Set(prev)
        next.delete(promptLabel)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">Loading images data...</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">No image prompts available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Style Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visual Style</CardTitle>
          <CardDescription>Choose the visual direction for all images</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {IMAGE_STYLES.map((style) => (
              <Button
                key={style}
                variant={selectedStyle === style ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStyle(style)}
                className="capitalize"
              >
                {style === '3d' ? '3D' : style.replace(/-/g, ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prompt Cards */}
      <div className="grid gap-4">
        <PromptCard
          label="Hero / Banner Image"
          prompts={data.hero}
          isGenerating={generatingPrompts.has('hero')}
          generatedImageUrl={generatedImages.hero}
          onGenerate={() => handleGenerateImage('hero', data.hero)}
        />

        <PromptCard
          label="Section Illustrations"
          prompts={data.sections}
          isGenerating={generatingPrompts.has('sections')}
          generatedImageUrl={generatedImages.sections}
          onGenerate={() => handleGenerateImage('sections', data.sections.join('\n\n'))}
        />

        <PromptCard
          label="Infographic / Data Visualization"
          prompts={data.infographic}
          isGenerating={generatingPrompts.has('infographic')}
          generatedImageUrl={generatedImages.infographic}
          onGenerate={() => handleGenerateImage('infographic', data.infographic)}
        />

        <PromptCard
          label="Social Media Post"
          prompts={data.social}
          isGenerating={generatingPrompts.has('social')}
          generatedImageUrl={generatedImages.social}
          onGenerate={() => handleGenerateImage('social', data.social)}
        />

        <PromptCard
          label="Pinterest Visual"
          prompts={data.pinterest}
          isGenerating={generatingPrompts.has('pinterest')}
          generatedImageUrl={generatedImages.pinterest}
          onGenerate={() => handleGenerateImage('pinterest', data.pinterest)}
        />
      </div>
    </div>
  )
}
