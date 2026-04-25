import type { ContentAsset } from '@/types'
import { ASSET_TYPES } from '@/lib/asset-types'

/**
 * TECH DEBT (P2): Pipeline orchestration is browser-driven from app/dashboard/data-driven/page.tsx.
 *
 * Current flow:
 *   Browser → API route → API route → ... (sequential)
 * Each step waits for the previous one to complete. If the user closes the tab or
 * network drops, all in-progress state is lost.
 *
 * True fix:
 *   Implement server-side job queue (Inngest, BullMQ, or Vercel Queue) that:
 *   - Persists each step's state in the database (or Redis)
 *   - Handles retries on transient failures
 *   - Allows resuming pipelines across browser sessions
 *   - Provides real-time progress updates via WebSocket or SSE
 *
 * Estimated effort: Medium-Large (3–5 days)
 * Tracked in: [link to issue if available]
 */

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

function hasAsset(assets: ContentAsset[], assetType: string): boolean {
  return assets.some((asset) => asset.assetType === assetType)
}

function hasAnyDownstreamAsset(assets: ContentAsset[]): boolean {
  return [
    ASSET_TYPES.DD_RESEARCH,
    ASSET_TYPES.DD_ARTICLE,
    ASSET_TYPES.DD_SEO_GEO,
    ASSET_TYPES.BLOG,
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
  const includeResearch = mode === 'topic' || hasAsset(assets, ASSET_TYPES.RESEARCH)
  const stepKeys = buildStepKeys(mode, includeResearch)

  const stepStates = createEmptyStepStateMap()

  if (mode === 'data' && hasAnyDownstreamAsset(assets)) {
    stepStates.assess = { status: 'complete', content: { restored: true } }
  }

  if (hasAsset(assets, ASSET_TYPES.DD_RESEARCH)) {
    stepStates.research = { status: 'complete', content: { restored: true } }
  }

  if (hasAsset(assets, ASSET_TYPES.DD_ARTICLE)) {
    stepStates.article = { status: 'complete', content: { restored: true } }
  }

  if (hasAsset(assets, ASSET_TYPES.DD_SEO_GEO)) {
    stepStates.seoGeo = { status: 'complete', content: { restored: true } }
  }

  const hasLegacyDistributionAssets =
    hasAsset(assets, ASSET_TYPES.DD_BLOG)
    && hasAsset(assets, ASSET_TYPES.DD_X_CAMPAIGN)

  if (hasLegacyDistributionAssets) {
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
    return [
      ASSET_TYPES.DD_RESEARCH,
      ASSET_TYPES.DD_ARTICLE,
      ASSET_TYPES.DD_SEO_GEO,
      ASSET_TYPES.DD_BLOG,
      ASSET_TYPES.DD_LINKEDIN,
      ASSET_TYPES.DD_MEDIUM,
      ASSET_TYPES.DD_NEWSLETTER,
      ASSET_TYPES.DD_X_CAMPAIGN,
      ASSET_TYPES.DD_THREADS_CAMPAIGN,
    ]
  }

  if (targetStepKey === 'article') {
    return [
      ASSET_TYPES.DD_ARTICLE,
      ASSET_TYPES.DD_SEO_GEO,
      ASSET_TYPES.DD_BLOG,
      ASSET_TYPES.DD_LINKEDIN,
      ASSET_TYPES.DD_MEDIUM,
      ASSET_TYPES.DD_NEWSLETTER,
      ASSET_TYPES.DD_X_CAMPAIGN,
      ASSET_TYPES.DD_THREADS_CAMPAIGN,
    ]
  }

  if (targetStepKey === 'seoGeo') {
    return [
      ASSET_TYPES.DD_SEO_GEO,
      ASSET_TYPES.DD_BLOG,
      ASSET_TYPES.DD_LINKEDIN,
      ASSET_TYPES.DD_MEDIUM,
      ASSET_TYPES.DD_NEWSLETTER,
      ASSET_TYPES.DD_X_CAMPAIGN,
      ASSET_TYPES.DD_THREADS_CAMPAIGN,
    ]
  }

  return [
    ASSET_TYPES.DD_BLOG,
    ASSET_TYPES.DD_LINKEDIN,
    ASSET_TYPES.DD_MEDIUM,
    ASSET_TYPES.DD_NEWSLETTER,
    ASSET_TYPES.DD_X_CAMPAIGN,
    ASSET_TYPES.DD_THREADS_CAMPAIGN,
  ]
}
