export interface DistributionSequenceItem {
  day: 1 | 2 | 3
  platform: string
  assetType: string
  instructions: string
}

export interface DistributionOutput {
  sequence: DistributionSequenceItem[]
  platformInstructions: Record<string, string>
}

function summarizeAssets(assets: unknown): string {
  if (typeof assets === 'string') {
    return assets
  }

  if (Array.isArray(assets)) {
    return assets
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object') {
          return JSON.stringify(item)
        }

        return String(item)
      })
      .join('\n')
  }

  if (assets && typeof assets === 'object') {
    return JSON.stringify(assets, null, 2)
  }

  return ''
}

export function getDistributePrompt(assets: unknown): string {
  const assetsSummary = summarizeAssets(assets)

  return `You are a content distribution strategist.

Create a focused 3-day publishing schedule for the provided content assets.

Assets Summary:
"""
${assetsSummary}
"""

Requirements:
- Build a sequence that spans ONLY days 1, 2, and 3.
- Each sequence item must include: day, platform, assetType, instructions.
- Add practical platform-level playbooks in platformInstructions.
- Keep instructions concise and actionable.
- Return only valid JSON.
- No markdown fences.

Return this exact JSON shape:
{
  "sequence": [
    {
      "day": 1,
      "platform": "string",
      "assetType": "string",
      "instructions": "string"
    }
  ],
  "platformInstructions": {
    "platformName": "string"
  }
}`
}
