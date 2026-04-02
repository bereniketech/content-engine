import type { ContentAsset } from '@/types'

export type PipelineMode = 'topic' | 'data'

export type StepKey = 'assess' | 'research' | 'article' | 'seoGeo' | 'distribution'

export type StepStatus = 'pending' | 'in-progress' | 'complete' | 'error'

export interface StepRuntimeState {
  status: StepStatus
  content?: unknown
  error?: string
}

export type StepStateMap = Record<StepKey, StepRuntimeState>

export interface RestoredPipelineState {
  includeResearch: boolean
  stepKeys: StepKey[]
  stepStates: StepStateMap
}

const PIPELINE_ASSET_TYPES = {
  research: 'dd_research',
  article: 'dd_article',
  seoGeo: 'dd_seo_geo',
  blog: 'dd_blog',
  xCampaign: 'dd_x_campaign',
} as const

function hasAsset(assets: ContentAsset[], assetType: string): boolean {
  return assets.some((asset) => asset.assetType === assetType)
}

function hasAnyDownstreamAsset(assets: ContentAsset[]): boolean {
  return [
    PIPELINE_ASSET_TYPES.research,
    PIPELINE_ASSET_TYPES.article,
    PIPELINE_ASSET_TYPES.seoGeo,
    PIPELINE_ASSET_TYPES.blog,
    PIPELINE_ASSET_TYPES.xCampaign,
  ].some((assetType) => hasAsset(assets, assetType))
}

export function createEmptyStepStateMap(): StepStateMap {
  return {
    assess: { status: 'pending' },
    research: { status: 'pending' },
    article: { status: 'pending' },
    seoGeo: { status: 'pending' },
    distribution: { status: 'pending' },
  }
}

export function buildStepKeys(mode: PipelineMode, includeResearch: boolean): StepKey[] {
  if (mode === 'topic') {
    return ['research', 'article', 'seoGeo', 'distribution']
  }

  return includeResearch
    ? ['assess', 'research', 'article', 'seoGeo', 'distribution']
    : ['assess', 'article', 'seoGeo', 'distribution']
}

export function buildRestoredPipelineState(options: {
  mode: PipelineMode
  assets: ContentAsset[]
}): RestoredPipelineState {
  const { mode, assets } = options
  const includeResearch = mode === 'topic' || hasAsset(assets, PIPELINE_ASSET_TYPES.research)
  const stepKeys = buildStepKeys(mode, includeResearch)

  const stepStates = createEmptyStepStateMap()

  if (mode === 'data' && hasAnyDownstreamAsset(assets)) {
    stepStates.assess = { status: 'complete', content: { restored: true } }
  }

  if (hasAsset(assets, PIPELINE_ASSET_TYPES.research)) {
    stepStates.research = { status: 'complete', content: { restored: true } }
  }

  if (hasAsset(assets, PIPELINE_ASSET_TYPES.article)) {
    stepStates.article = { status: 'complete', content: { restored: true } }
  }

  if (hasAsset(assets, PIPELINE_ASSET_TYPES.seoGeo)) {
    stepStates.seoGeo = { status: 'complete', content: { restored: true } }
  }

  if (
    hasAsset(assets, PIPELINE_ASSET_TYPES.blog)
    && hasAsset(assets, PIPELINE_ASSET_TYPES.xCampaign)
  ) {
    stepStates.distribution = { status: 'complete', content: { restored: true } }
  }

  return {
    includeResearch,
    stepKeys,
    stepStates,
  }
}

export function getNextPendingStepIndex(stepKeys: StepKey[], stepStates: StepStateMap): number {
  return stepKeys.findIndex((stepKey) => stepStates[stepKey].status === 'pending')
}

export function resetForRegenerate(
  stepKeys: StepKey[],
  stepStates: StepStateMap,
  targetStepKey: StepKey
): StepStateMap {
  const targetIndex = stepKeys.findIndex((stepKey) => stepKey === targetStepKey)
  if (targetIndex < 0) {
    return stepStates
  }

  const nextState: StepStateMap = {
    assess: { ...stepStates.assess },
    research: { ...stepStates.research },
    article: { ...stepStates.article },
    seoGeo: { ...stepStates.seoGeo },
    distribution: { ...stepStates.distribution },
  }

  stepKeys.forEach((stepKey, index) => {
    if (index >= targetIndex) {
      nextState[stepKey] = {
        status: 'pending',
      }
    }
  })

  return nextState
}

export function getDownstreamAssetTypesForRegenerate(targetStepKey: StepKey): string[] {
  if (targetStepKey === 'assess' || targetStepKey === 'research') {
    return ['dd_research', 'dd_article', 'dd_seo_geo', 'dd_blog', 'dd_linkedin', 'dd_medium', 'dd_newsletter', 'dd_x_campaign']
  }

  if (targetStepKey === 'article') {
    return ['dd_article', 'dd_seo_geo', 'dd_blog', 'dd_linkedin', 'dd_medium', 'dd_newsletter', 'dd_x_campaign']
  }

  if (targetStepKey === 'seoGeo') {
    return ['dd_seo_geo', 'dd_blog', 'dd_linkedin', 'dd_medium', 'dd_newsletter', 'dd_x_campaign']
  }

  return ['dd_blog', 'dd_linkedin', 'dd_medium', 'dd_newsletter', 'dd_x_campaign']
}
