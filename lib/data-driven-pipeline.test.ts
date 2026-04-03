/// <reference types="jest" />

import {
  buildRestoredPipelineState,
  buildStepKeys,
  createEmptyStepStateMap,
  getDownstreamAssetTypesForRegenerate,
  getNextPendingStepIndex,
  resetForRegenerate,
  type StepStateMap,
} from '@/lib/data-driven-pipeline'
import type { ContentAsset } from '@/types'

function createAsset(assetType: string): ContentAsset {
  return {
    id: `${assetType}-id`,
    assetType,
    content: {},
    version: 1,
    createdAt: '2026-04-02T00:00:00.000Z',
  }
}

describe('data-driven-pipeline helpers', () => {
  it('builds topic mode keys', () => {
    expect(buildStepKeys('topic', true)).toEqual([
      'research',
      'article',
      'seoGeo',
      'distribution',
    ])
  })

  it('builds data mode keys without research', () => {
    expect(buildStepKeys('data', false)).toEqual([
      'assess',
      'article',
      'seoGeo',
      'distribution',
    ])
  })

  it('builds data mode keys with research', () => {
    expect(buildStepKeys('data', true)).toEqual([
      'assess',
      'research',
      'article',
      'seoGeo',
      'distribution',
    ])
  })

  it('restores final distribution for legacy and new campaign bundles', () => {
    const withOnlyBlog = buildRestoredPipelineState({
      mode: 'topic',
      assets: [createAsset('dd_blog')],
    })

    const withLegacyBundle = buildRestoredPipelineState({
      mode: 'topic',
      assets: [createAsset('dd_blog'), createAsset('dd_x_campaign')],
    })

    const withAll = buildRestoredPipelineState({
      mode: 'topic',
      assets: [createAsset('dd_blog'), createAsset('dd_x_campaign'), createAsset('dd_threads_campaign')],
    })

    expect(withOnlyBlog.stepStates.distribution.status).toBe('pending')
    expect(withLegacyBundle.stepStates.distribution.status).toBe('complete')
    expect(withAll.stepStates.distribution.status).toBe('complete')
  })

  it('restores assess as complete in data mode if downstream assets exist', () => {
    const restored = buildRestoredPipelineState({
      mode: 'data',
      assets: [createAsset('dd_article')],
    })

    expect(restored.stepStates.assess.status).toBe('complete')
  })

  it('returns next pending step index', () => {
    const states: StepStateMap = {
      ...createEmptyStepStateMap(),
      research: { status: 'complete' },
      article: { status: 'pending' },
      seoGeo: { status: 'pending' },
      distribution: { status: 'pending' },
    }

    expect(getNextPendingStepIndex(['research', 'article', 'seoGeo', 'distribution'], states)).toBe(1)
  })

  it('resets target and downstream steps for regenerate', () => {
    const original: StepStateMap = {
      assess: { status: 'complete' },
      research: { status: 'complete' },
      article: { status: 'complete' },
      seoGeo: { status: 'error', error: 'fail' },
      distribution: { status: 'pending' },
    }

    const reset = resetForRegenerate(
      ['assess', 'research', 'article', 'seoGeo', 'distribution'],
      original,
      'article'
    )

    expect(reset.assess.status).toBe('complete')
    expect(reset.research.status).toBe('complete')
    expect(reset.article.status).toBe('pending')
    expect(reset.seoGeo.status).toBe('pending')
    expect(reset.distribution.status).toBe('pending')
  })

  it('maps downstream assets correctly for assess and research regenerate', () => {
    expect(getDownstreamAssetTypesForRegenerate('assess')).toEqual([
      'dd_research',
      'dd_article',
      'dd_seo_geo',
      'dd_blog',
      'dd_linkedin',
      'dd_medium',
      'dd_newsletter',
      'dd_x_campaign',
      'dd_threads_campaign',
    ])

    expect(getDownstreamAssetTypesForRegenerate('research')).toEqual([
      'dd_research',
      'dd_article',
      'dd_seo_geo',
      'dd_blog',
      'dd_linkedin',
      'dd_medium',
      'dd_newsletter',
      'dd_x_campaign',
      'dd_threads_campaign',
    ])
  })

  it('maps downstream assets correctly for later steps', () => {
    expect(getDownstreamAssetTypesForRegenerate('article')).toEqual([
      'dd_article',
      'dd_seo_geo',
      'dd_blog',
      'dd_linkedin',
      'dd_medium',
      'dd_newsletter',
      'dd_x_campaign',
      'dd_threads_campaign',
    ])

    expect(getDownstreamAssetTypesForRegenerate('seoGeo')).toEqual([
      'dd_seo_geo',
      'dd_blog',
      'dd_linkedin',
      'dd_medium',
      'dd_newsletter',
      'dd_x_campaign',
      'dd_threads_campaign',
    ])

    expect(getDownstreamAssetTypesForRegenerate('distribution')).toEqual([
      'dd_blog',
      'dd_linkedin',
      'dd_medium',
      'dd_newsletter',
      'dd_x_campaign',
      'dd_threads_campaign',
    ])
  })
})
