export interface TierInfo {
  tier: string
  minScore: number
  maxScore: number
  description: string
  percentile: string
}

const TIER_DEFINITIONS: Record<string, TierInfo> = {
  AAA: {
    tier: 'AAA',
    minScore: 90,
    maxScore: 100,
    description: 'Exceptional',
    percentile: 'Top 1%',
  },
  AA: {
    tier: 'AA',
    minScore: 80,
    maxScore: 89,
    description: 'Excellent',
    percentile: 'Top 5%',
  },
  A: {
    tier: 'A',
    minScore: 70,
    maxScore: 79,
    description: 'Very Good',
    percentile: 'Top 15%',
  },
  BBB: {
    tier: 'BBB',
    minScore: 60,
    maxScore: 69,
    description: 'Good',
    percentile: 'Top 35%',
  },
  BB: {
    tier: 'BB',
    minScore: 50,
    maxScore: 59,
    description: 'Fair',
    percentile: 'Top 60%',
  },
  B: {
    tier: 'B',
    minScore: 40,
    maxScore: 49,
    description: 'Below Average',
    percentile: 'Top 80%',
  },
  C: {
    tier: 'C',
    minScore: 30,
    maxScore: 39,
    description: 'Poor',
    percentile: 'Top 95%',
  },
  D: {
    tier: 'D',
    minScore: 0,
    maxScore: 29,
    description: 'Very Poor',
    percentile: 'Bottom 5%',
  },
}

export function getTierInfo(tier: string): TierInfo {
  return TIER_DEFINITIONS[tier] || TIER_DEFINITIONS.D
}

export function getScoreTier(score: number): string {
  if (score >= 90) return 'AAA'
  if (score >= 80) return 'AA'
  if (score >= 70) return 'A'
  if (score >= 60) return 'BBB'
  if (score >= 50) return 'BB'
  if (score >= 40) return 'B'
  if (score >= 30) return 'C'
  return 'D'
}
