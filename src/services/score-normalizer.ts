import { getScoreTier } from './tier-system'

export interface NormalizedScores {
  engagement: number
  consistency: number
  growth: number
  quality: number
  network: number
}

export interface ComponentWeights {
  engagement: number
  consistency: number
  growth: number
  quality: number
  network: number
}

export class ScoreNormalizer {
  private weights: ComponentWeights = {
    engagement: 0.25, // 25%
    consistency: 0.2, // 20%
    growth: 0.2, // 20%
    quality: 0.25, // 25%
    network: 0.1, // 10%
  }

  /**
   * Normalize raw metric scores to 0-100 scale
   */
  normalizeScores(rawScores: {
    engagement: number
    consistency: number
    growth: number
    quality: number
    network: number
  }): NormalizedScores {
    return {
      engagement: Math.min(100, Math.max(0, rawScores.engagement)),
      consistency: Math.min(100, Math.max(0, rawScores.consistency)),
      growth: Math.min(100, Math.max(0, rawScores.growth)),
      quality: Math.min(100, Math.max(0, rawScores.quality)),
      network: Math.min(100, Math.max(0, rawScores.network)),
    }
  }

  /**
   * Calculate weighted overall score from normalized components
   */
  calculateOverallScore(normalizedScores: NormalizedScores): number {
    const weightedSum =
      normalizedScores.engagement * this.weights.engagement +
      normalizedScores.consistency * this.weights.consistency +
      normalizedScores.growth * this.weights.growth +
      normalizedScores.quality * this.weights.quality +
      normalizedScores.network * this.weights.network

    return Math.round(weightedSum * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Calculate percentile rank based on score
   */
  calculatePercentileRank(score: number): number {
    // Simple percentile mapping based on score ranges
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
   * Get credit tier based on overall score
   */
  getCreditTier(score: number): string {
    return getScoreTier(score)
  }
}
