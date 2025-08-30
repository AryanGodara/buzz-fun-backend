import type { CalculatedMetrics, CreditTier, IScoreComponents } from '../types'
import { DEFAULT_WEIGHTS, getTierFromScore } from './scoring'

/**
 * In-memory percentile-based normalization service
 * Uses historical data cache to calculate percentiles without DB
 */
export class ScoreNormalizer {
  private static historicalScores: {
    engagement: number[]
    consistency: number[]
    growth: number[]
    quality: number[]
    network: number[]
  } = {
    engagement: [],
    consistency: [],
    growth: [],
    quality: [],
    network: []
  }

  private static readonly MAX_CACHE_SIZE = 1000 // Keep last 1000 scores for percentile calculation

  /**
   * Add calculated metrics to historical cache for percentile calculation
   */
  private addToHistoricalCache(calculatedMetrics: CalculatedMetrics): void {
    const cache = ScoreNormalizer.historicalScores
    
    // Add new scores
    cache.engagement.push(calculatedMetrics.engagement)
    cache.consistency.push(calculatedMetrics.consistency)
    cache.growth.push(calculatedMetrics.growth)
    cache.quality.push(calculatedMetrics.quality)
    cache.network.push(calculatedMetrics.network)
    
    // Trim cache if too large
    Object.keys(cache).forEach(key => {
      const scores = cache[key as keyof typeof cache]
      if (scores.length > ScoreNormalizer.MAX_CACHE_SIZE) {
        scores.splice(0, scores.length - ScoreNormalizer.MAX_CACHE_SIZE)
      }
    })
  }

  /**
   * Calculate percentile rank for a score within a distribution
   */
  private calculatePercentile(score: number, distribution: number[]): number {
    if (distribution.length === 0) {
      // Fallback to simple score mapping if no historical data
      return this.fallbackPercentile(score)
    }

    const sortedScores = [...distribution].sort((a, b) => a - b)
    const rank = sortedScores.filter(s => s <= score).length
    return Math.round((rank / sortedScores.length) * 100)
  }

  /**
   * Fallback percentile calculation when no historical data available
   */
  private fallbackPercentile(score: number): number {
    // Use distribution assumptions based on typical creator performance
    if (score >= 90) return 95
    if (score >= 80) return 85
    if (score >= 70) return 75
    if (score >= 60) return 60
    if (score >= 50) return 45
    if (score >= 40) return 30
    if (score >= 30) return 15
    return 5
  }

  /**
   * Normalize calculated metrics to percentile-based scores (0-100)
   */
  normalizeScores(calculatedMetrics: CalculatedMetrics): IScoreComponents {
    // Add to historical cache for future percentile calculations
    this.addToHistoricalCache(calculatedMetrics)
    
    const cache = ScoreNormalizer.historicalScores
    
    return {
      engagement: this.calculatePercentile(calculatedMetrics.engagement, cache.engagement),
      consistency: this.calculatePercentile(calculatedMetrics.consistency, cache.consistency),
      growth: this.calculatePercentile(calculatedMetrics.growth, cache.growth),
      quality: this.calculatePercentile(calculatedMetrics.quality, cache.quality),
      network: this.calculatePercentile(calculatedMetrics.network, cache.network),
    }
  }

  /**
   * Calculate overall score from normalized components
   */
  calculateOverallScore(components: IScoreComponents): number {
    const score =
      components.engagement * DEFAULT_WEIGHTS.engagement +
      components.consistency * DEFAULT_WEIGHTS.consistency +
      components.growth * DEFAULT_WEIGHTS.growth +
      components.quality * DEFAULT_WEIGHTS.quality +
      components.network * DEFAULT_WEIGHTS.network

    return Math.round(score * 100) / 100
  }

  /**
   * Calculate percentile rank for overall score
   */
  calculatePercentileRank(overallScore: number): number {
    // Use the same percentile calculation logic as individual metrics
    return this.fallbackPercentile(overallScore)
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { [key: string]: { count: number, avg: number, min: number, max: number } } {
    const cache = ScoreNormalizer.historicalScores
    const stats: any = {}
    
    Object.keys(cache).forEach(key => {
      const scores = cache[key as keyof typeof cache]
      if (scores.length > 0) {
        stats[key] = {
          count: scores.length,
          avg: scores.reduce((a, b) => a + b, 0) / scores.length,
          min: Math.min(...scores),
          max: Math.max(...scores)
        }
      } else {
        stats[key] = { count: 0, avg: 0, min: 0, max: 0 }
      }
    })
    
    return stats
  }

  /**
   * Get credit tier from overall score
   */
  getCreditTier(overallScore: number): CreditTier {
    return getTierFromScore(overallScore)
  }
}

// Export singleton instance
export const scoreNormalizer = new ScoreNormalizer()
