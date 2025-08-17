/**
 * Interface for score component values
 * Uses IScoreComponents from models/creatorScore.ts for consistency
 */
import { CreatorScore, type IScoreComponents } from '../models/creatorScore'
import type { CreatorMetrics } from './neynar'

// Re-export for consistency across the codebase
export type { IScoreComponents }

/**
 * Interface for score calculation result
 */
export interface ScoreResult {
  fid: number
  overallScore: number
  percentileRank: number
  tier: number
  components: Record<string, number>
  timestamp: Date
  validUntil: Date
}

/**
 * Score Calculator Service
 * Handles calculation of creator scores based on metrics
 */
export class ScoreCalculator {
  // Weights for different score components
  private weights = {
    engagement: 0.35,
    consistency: 0.2,
    growth: 0.2,
    quality: 0.15,
    network: 0.1,
  }

  /**
   * Calculate a creator's score based on metrics
   * @param metrics Creator metrics from Neynar
   * @returns Complete creator score
   */
  async calculateScore(metrics: CreatorMetrics): Promise<ScoreResult> {
    // Calculate component scores
    const components: IScoreComponents = {
      engagement: this.normalizeEngagement(metrics.engagementRate),
      consistency: this.normalizeConsistency(metrics.postingFrequency),
      growth: this.normalizeGrowth(metrics.growthRate, metrics.followerCount),
      quality: this.normalizeQuality(
        metrics.viralCoefficient,
        metrics.neynarScore,
      ),
      network: Math.min(100, metrics.networkScore),
    }

    // Apply diminishing returns to prevent gaming
    const adjusted = this.applyDiminishingReturns(components, metrics)

    // Calculate weighted score
    const rawScore = Object.entries(adjusted).reduce((sum, [key, value]) => {
      // Only use keys that exist in weights
      const weightKey = key as keyof typeof this.weights
      return sum + value * (this.weights[weightKey] || 0)
    }, 0)

    // Get percentile rank for normalization
    const percentileRank = await this.getPercentileRank(rawScore)

    // Apply distribution cap (only 20% can score > 80)
    const finalScore = this.enforceDistribution(rawScore, percentileRank)

    // Determine tier based on score
    const tier = this.calculateTier(finalScore)

    return {
      fid: metrics.fid,
      overallScore: Math.round(finalScore),
      percentileRank,
      tier,
      components: adjusted,
      timestamp: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  }

  /**
   * Normalize engagement rate on a 0-100 scale
   * @param rate Raw engagement rate
   * @returns Normalized score (0-100)
   */
  private normalizeEngagement(rate: number): number {
    // Logarithmic scaling for engagement
    const normalized = Math.log10(Math.max(1, rate)) * 25
    return Math.min(100, normalized)
  }

  /**
   * Normalize posting consistency on a 0-100 scale
   * @param frequency Posts per day
   * @returns Normalized score (0-100)
   */
  private normalizeConsistency(frequency: number): number {
    // Optimal frequency is 1-3 posts per day
    const optimal = 2
    const deviation = Math.abs(frequency - optimal)
    const score = Math.max(0, 100 - deviation * 20)
    return Math.min(100, score)
  }

  /**
   * Normalize growth rate with follower boost
   * @param growthRate Growth rate percentage
   * @param followers Number of followers
   * @returns Normalized score (0-100)
   */
  private normalizeGrowth(growthRate: number, followers: number): number {
    // Higher base score for established creators
    const baseScore = Math.min(50, Math.log10(Math.max(1, followers)) * 10)
    const growthBonus = Math.min(50, growthRate * 100)
    return baseScore + growthBonus
  }

  /**
   * Normalize quality based on viral coefficient and Neynar score
   * @param viralCoefficient Percentage of viral posts
   * @param neynarScore Neynar's quality score
   * @returns Normalized score (0-100)
   */
  private normalizeQuality(
    viralCoefficient: number,
    neynarScore: number,
  ): number {
    const viralScore = Math.min(50, viralCoefficient)
    const qualityScore = Math.min(50, neynarScore * 50)
    return viralScore + qualityScore
  }

  /**
   * Apply diminishing returns to prevent gaming the system
   * @param components Raw component scores
   * @param metrics Original metrics
   * @returns Adjusted component scores
   */
  private applyDiminishingReturns(
    components: IScoreComponents,
    metrics: CreatorMetrics,
  ): IScoreComponents {
    const adjusted: IScoreComponents = { ...components }

    // Penalize excessive posting
    if (metrics.postingFrequency > 10) {
      adjusted.consistency *= 0.7
    }

    // Penalize low engagement relative to posting
    const engagementRatio =
      metrics.engagementRate / Math.max(1, metrics.postingFrequency)
    if (engagementRatio < 0.5) {
      adjusted.quality *= 0.8
    }

    return adjusted
  }

  /**
   * Calculate percentile rank compared to other creators
   * @param score Raw score
   * @returns Percentile (0-100)
   */
  private async getPercentileRank(score: number): Promise<number> {
    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Count total scores
    const totalCount = await CreatorScore.countDocuments({
      scoreDate: { $gte: today },
    })

    // Handle empty database
    if (totalCount === 0) {
      return 50 // Default to median if no data
    }

    // Count scores below this one
    const belowCount = await CreatorScore.countDocuments({
      scoreDate: { $gte: today },
      overallScore: { $lt: score },
    })

    // Calculate percentile
    return Math.round((belowCount / totalCount) * 100)
  }

  /**
   * Apply distribution cap to ensure proper score distribution
   * @param score Raw score
   * @param percentile Percentile rank
   * @returns Adjusted score
   */
  private enforceDistribution(score: number, percentile: number): number {
    // Only top 20% can score above 80
    if (percentile < 80) {
      return Math.min(score, 79)
    }

    // Logarithmic compression for top scorers
    if (score > 80) {
      const excess = score - 80
      const compressed = Math.log(1 + excess) * 10
      return Math.min(100, 80 + compressed)
    }

    return score
  }

  /**
   * Calculate tier level based on score
   * @param score Final score
   * @returns Tier level (1-6)
   */
  private calculateTier(score: number): number {
    if (score >= 90) return 6 // Diamond
    if (score >= 80) return 5 // Platinum
    if (score >= 70) return 4 // Gold
    if (score >= 60) return 3 // Silver
    if (score >= 40) return 2 // Bronze
    return 1 // Starter
  }
}

// Export singleton instance
export const scoreCalculator = new ScoreCalculator()
