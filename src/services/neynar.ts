import type { CastMetrics, CreatorMetrics } from '../types'
import { RateLimiter } from '../utils/rateLimiter'

/**
 * Ultra simplified Neynar Service for Cloudflare Workers
 * Direct API calls to Neynar endpoints for Farcaster data
 * Only uses free tier endpoints
 */
export class NeynarService {
  private apiKey: string
  private rateLimiter: RateLimiter

  // In-memory cache for MVP (no Redis dependency)
  private memoryCache: Map<string, { value: any; expiry: number }> = new Map()
  private cacheSizeLimit: number = 1000 // Limit cache entries for MVP

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.rateLimiter = new RateLimiter(300) // 300 RPM for free tier

    // Set up automatic cache cleanup every 5 minutes
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000)
  }

  /**
   * Simple in-memory cache methods for MVP
   */
  private getCachedValue<T>(key: string): T | null {
    const item = this.memoryCache.get(key)

    if (!item) return null

    // Check if item has expired
    if (item.expiry < Date.now()) {
      this.memoryCache.delete(key)
      return null
    }

    return item.value as T
  }

  private setCachedValue(key: string, value: any, ttlSeconds: number): void {
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    })

    // Check if we need to clean up the cache
    if (this.memoryCache.size > this.cacheSizeLimit) {
      this.cleanupCache()
    }
  }

  /**
   * Clean up expired or oldest items when cache exceeds size limit
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry < now) {
        this.memoryCache.delete(key)
      }
    }

    // If still over limit, remove oldest items
    if (this.memoryCache.size > this.cacheSizeLimit) {
      const entries = Array.from(this.memoryCache.entries())
      entries.sort((a, b) => a[1].expiry - b[1].expiry)

      const toRemove = entries.slice(0, Math.floor(this.cacheSizeLimit * 0.2))
      for (const [key] of toRemove) {
        this.memoryCache.delete(key)
      }
    }
  }

  /**
   * Get creator metrics from Neynar API
   * @param fid Farcaster ID
   * @returns Creator metrics or null if not found
   */
  async getCreatorMetrics(fid: number): Promise<CreatorMetrics | null> {
    const cacheKey = `creator_metrics_${fid}`

    // Check cache first (1 hour TTL)
    const cached = this.getCachedValue<CreatorMetrics>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // Rate limit the request
      await this.rateLimiter.wait()

      // Get user info
      const userResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      if (!userResponse.ok) {
        console.error(`Neynar user API error: ${userResponse.status}`)
        return null
      }

      const userData = await userResponse.json()
      const user = userData.users?.[0]

      if (!user) {
        return null
      }

      // Get recent casts (last 25)
      await this.rateLimiter.wait()
      const castsResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/casts?fid=${fid}&limit=25`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      const castsData = castsResponse.ok
        ? await castsResponse.json()
        : { casts: [] }
      const casts: CastMetrics[] = (castsData.casts || []).map((cast: any) => ({
        hash: cast.hash,
        timestamp: new Date(cast.timestamp),
        likes: cast.reactions?.likes_count || 0,
        recasts: cast.reactions?.recasts_count || 0,
        replies: cast.replies?.count || 0,
      }))

      // Calculate derived metrics
      const metrics: CreatorMetrics = {
        fid: user.fid,
        username: user.username,
        followerCount: user.follower_count || 0,
        followingCount: user.following_count || 0,
        powerBadge: user.power_badge || false,
        neynarScore: user.neynar_score || 0,
        casts,
        engagementRate: this.calculateEngagementRate(
          casts,
          user.follower_count || 1,
        ),
        postingFrequency: this.calculatePostingFrequency(casts),
        growthRate: this.calculateGrowthRate(user.follower_count || 0),
        viralCoefficient: this.calculateViralCoefficient(casts),
        networkScore: Math.min(100, (user.follower_count || 0) / 100),
      }

      // Cache the result (1 hour TTL)
      this.setCachedValue(cacheKey, metrics, 3600)

      return metrics
    } catch (error) {
      console.error('Error fetching creator metrics:', error)
      return null
    }
  }

  /**
   * Calculate engagement rate from casts
   */
  private calculateEngagementRate(
    casts: CastMetrics[],
    followerCount: number,
  ): number {
    if (casts.length === 0) return 0

    const totalEngagement = casts.reduce(
      (sum, cast) => sum + cast.likes + cast.recasts + cast.replies,
      0,
    )

    const avgEngagement = totalEngagement / casts.length
    return (avgEngagement / Math.max(1, followerCount)) * 100
  }

  /**
   * Calculate posting frequency (posts per day)
   */
  private calculatePostingFrequency(casts: CastMetrics[]): number {
    if (casts.length === 0) return 0

    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const recentCasts = casts.filter(
      (cast) => now - cast.timestamp.getTime() < 7 * dayMs,
    )

    return recentCasts.length / 7 // Posts per day over last week
  }

  /**
   * Estimate growth rate based on follower count
   */
  private calculateGrowthRate(followerCount: number): number {
    // Simple heuristic: higher follower counts suggest historical growth
    if (followerCount < 100) return 0.1
    if (followerCount < 1000) return 0.15
    if (followerCount < 10000) return 0.2
    return 0.25
  }

  /**
   * Calculate viral coefficient (percentage of high-engagement posts)
   */
  private calculateViralCoefficient(casts: CastMetrics[]): number {
    if (casts.length === 0) return 0

    const viralThreshold = 10 // Minimum engagement for "viral"
    const viralCasts = casts.filter(
      (cast) => cast.likes + cast.recasts + cast.replies >= viralThreshold,
    )

    return (viralCasts.length / casts.length) * 100
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.memoryCache.size,
      limit: this.cacheSizeLimit,
      requestCount: this.rateLimiter.getRequestCount(),
    }
  }
}

// Export factory function for dependency injection
export const createNeynarService = (apiKey: string) => new NeynarService(apiKey)
