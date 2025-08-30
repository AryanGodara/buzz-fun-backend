import type {
  CreditTier,
  IScoreComponents,
  ScoreResult,
  TierInfo,
} from '../types'

/**
 * Credit tier definitions with score ranges
 */
export const CREDIT_TIERS: TierInfo[] = [
  {
    tier: 'AAA',
    minScore: 90,
    maxScore: 100,
    description: 'Exceptional',
    percentile: 'Top 1%',
  },
  {
    tier: 'AA',
    minScore: 80,
    maxScore: 89,
    description: 'Excellent',
    percentile: 'Top 5%',
  },
  {
    tier: 'A',
    minScore: 70,
    maxScore: 79,
    description: 'Very Good',
    percentile: 'Top 15%',
  },
  {
    tier: 'BBB',
    minScore: 60,
    maxScore: 69,
    description: 'Good',
    percentile: 'Top 35%',
  },
  {
    tier: 'BB',
    minScore: 50,
    maxScore: 59,
    description: 'Fair',
    percentile: 'Top 60%',
  },
  {
    tier: 'B',
    minScore: 40,
    maxScore: 49,
    description: 'Below Average',
    percentile: 'Top 80%',
  },
  {
    tier: 'C',
    minScore: 30,
    maxScore: 39,
    description: 'Poor',
    percentile: 'Top 95%',
  },
  {
    tier: 'D',
    minScore: 0,
    maxScore: 29,
    description: 'Very Poor',
    percentile: 'Bottom 5%',
  },
]

/**
 * Default weights for score components
 */
export const DEFAULT_WEIGHTS = {
  engagement: 0.25, // 25%
  consistency: 0.2, // 20%
  growth: 0.2, // 20%
  quality: 0.25, // 25%
  network: 0.1, // 10%
}

/**
 * Calculate overall score from components using weighted average
 */
export function calculateOverallScore(
  components: IScoreComponents,
  weights = DEFAULT_WEIGHTS,
): number {
  const score =
    components.engagement * weights.engagement +
    components.consistency * weights.consistency +
    components.growth * weights.growth +
    components.quality * weights.quality +
    components.network * weights.network

  return Math.round(score * 100) / 100 // Round to 2 decimal places
}

/**
 * Determine credit tier based on score
 */
export function getTierFromScore(score: number): CreditTier {
  const tier = CREDIT_TIERS.find(
    (t) => score >= t.minScore && score <= t.maxScore,
  )
  return tier?.tier || 'D'
}

/**
 * Get tier information
 */
export function getTierInfo(tier: CreditTier): TierInfo {
  return (
    CREDIT_TIERS.find((t) => t.tier === tier) ||
    CREDIT_TIERS[CREDIT_TIERS.length - 1]
  )
}

/**
 * Calculate percentile rank (placeholder - will be improved with real data)
 */
export function calculatePercentileRank(score: number): number {
  // Simple approximation based on score ranges
  if (score >= 90) return 99
  if (score >= 80) return 95
  if (score >= 70) return 85
  if (score >= 60) return 65
  if (score >= 50) return 40
  if (score >= 40) return 20
  if (score >= 30) return 5
  return 1
}

/**
 * Create a complete score result
 */
export function createScoreResult(
  fid: number,
  components: IScoreComponents,
  weights = DEFAULT_WEIGHTS,
): ScoreResult {
  const overallScore = calculateOverallScore(components, weights)
  const tier = getTierFromScore(overallScore)
  const percentileRank = calculatePercentileRank(overallScore)

  const now = new Date()
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Valid for 7 days

  return {
    fid,
    overallScore,
    percentileRank,
    tier,
    components,
    timestamp: now,
    validUntil,
  }
}
