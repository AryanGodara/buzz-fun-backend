import { env } from '../config/env'
import { RateLimiter } from '../utils/rateLimiter'

/**
 * Interface for Cast metrics
 */
export interface CastMetrics {
  hash: string
  timestamp: Date
  likes: number
  recasts: number
  replies: number
  // Note: impressions no longer available in Neynar API
  // Engagement will be calculated based on likes, recasts and replies only
}

/**
 * Interface for Creator metrics
 */
export interface CreatorMetrics {
  fid: number
  username: string
  followerCount: number
  followingCount: number
  powerBadge: boolean
  neynarScore: number
  casts: CastMetrics[]
  engagementRate: number
  postingFrequency: number
  growthRate: number
  viralCoefficient: number
  networkScore: number
}

/**
 * Ultra simplified Neynar Service
 * Direct API calls to Neynar endpoints for Farcaster data
 * Only uses free tier endpoints
 */
export class NeynarService {
  private apiKey: string
  private rateLimiter: RateLimiter

  // In-memory cache for MVP (no Redis dependency)
  private memoryCache: Map<string, { value: any; expiry: number }> = new Map()
  private cacheSizeLimit: number = 1000 // Limit cache entries for MVP

  constructor() {
    this.apiKey = env.NEYNAR_API_KEY
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
  }

  /**
   * Fetch user details directly from Neynar API
   * @param fid Farcaster ID
   */
  private async fetchUserDetails(fid: number) {
    await this.rateLimiter.wait()

    try {
      // Direct API call with hardcoded URL
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            Accept: 'application/json',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Neynar API error: ${response.status}`)
      }

      const data = await response.json()

      // Default values in case of API errors
      let username = `user_${fid}`
      let follower_count = 0
      let following_count = 0
      const power_badge = false

      // Try to extract data safely from response
      if (
        data &&
        typeof data === 'object' &&
        'users' in data &&
        Array.isArray(data.users) &&
        data.users.length > 0
      ) {
        const user = data.users[0]
        if (user && typeof user === 'object') {
          if ('username' in user) {
            username = String(user.username) || username
          }
          if ('follower_count' in user) {
            follower_count = Number(user.follower_count) || 0
          }
          if ('following_count' in user) {
            following_count = Number(user.following_count) || 0
          }
        }
      }

      return {
        username,
        follower_count,
        following_count,
        power_badge,
        fid,
      }
    } catch (error) {
      console.error(`Error fetching user details for FID ${fid}:`, error)
      return {
        username: `user_${fid}`,
        follower_count: 0,
        following_count: 0,
        power_badge: false,
        fid,
      }
    }
  }

  /**
   * Get metrics for a user/creator
   * @param fid Farcaster ID
   * @param days Number of days to analyze
   * @returns Creator metrics
   */
  async getUserMetrics(
    fid: number,
    days: number = 45,
  ): Promise<CreatorMetrics> {
    const cacheKey = `metrics:${fid}:${days}`

    // Check cache first
    const cached = this.getCachedValue<CreatorMetrics>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // Fetch user details using free endpoint
      const profile = await this.fetchUserDetails(fid)

      // Fetch recent casts
      const casts = await this.fetchRecentCasts(fid, days)

      // Calculate metrics with proper field names
      const metrics: CreatorMetrics = {
        fid,
        username: profile.username || `user_${fid}`,
        followerCount: profile.follower_count || 0,
        followingCount: profile.following_count || 0,
        powerBadge: profile.power_badge || false,
        // Neynar doesn't provide a 'score' field directly
        // We'll use follower count as a proxy for now
        neynarScore: Math.min(
          100,
          Math.log10(Math.max(1, profile.follower_count)) * 20,
        ),
        casts: casts,
        engagementRate: this.calculateEngagementRate(casts),
        postingFrequency: casts.length / Math.max(days, 1),
        growthRate: await this.calculateGrowthRate(fid, profile.follower_count),
        viralCoefficient: this.calculateViralCoefficient(casts),
        networkScore: this.calculateNetworkScore(profile),
      }

      // Cache the result
      this.setCachedValue(cacheKey, metrics, 30 * 60)
      return metrics
    } catch (error) {
      console.error(`Failed to get metrics for FID ${fid}:`, error)
      // Return minimal metrics on error
      return {
        fid,
        username: `user_${fid}`,
        followerCount: 0,
        followingCount: 0,
        powerBadge: false,
        neynarScore: 0,
        casts: [],
        engagementRate: 0,
        postingFrequency: 0,
        growthRate: 0,
        viralCoefficient: 0,
        networkScore: 0,
      }
    }
  }

  /**
   * Fetch recent casts for a user using free endpoint
   * @param fid Farcaster ID
   * @param days Number of days to fetch
   * @returns Array of cast metrics
   */
  private async fetchRecentCasts(
    fid: number,
    days: number,
  ): Promise<CastMetrics[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const casts: CastMetrics[] = []
    let cursor: string | undefined

    try {
      // Use direct endpoint URL which is available in free tier
      // Limit API calls to reduce usage
      for (let i = 0; i < 3; i++) {
        await this.rateLimiter.wait()

        // Build URL with query params directly
        let url = `https://api.neynar.com/v1/castsByFid?fid=${fid}&limit=50`
        if (cursor) {
          url += `&cursor=${encodeURIComponent(cursor)}`
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          break
        }

        const responseData = await response.json()
        if (!responseData || !responseData.result || !responseData.result.casts)
          break

        const castsData = responseData.result.casts
        if (!Array.isArray(castsData)) break

        for (const cast of castsData) {
          const castDate = new Date(cast.published_at || Date.now())
          if (castDate < cutoffDate) {
            return casts
          }

          // Extract metrics from each cast safely
          const castHash = cast.hash || `unknown-${Math.random()}`
          const reactions = cast.reactions || { count: 0 }
          const recasts = cast.recasts || { count: 0 }
          const replies = cast.replies || { count: 0 }

          casts.push({
            hash: castHash,
            timestamp: castDate,
            likes: reactions.count || 0,
            recasts: recasts.count || 0,
            replies: replies.count || 0,
          })
        }

        // Handle cursor safely
        cursor = responseData.next?.cursor
        if (!cursor) break
      }
    } catch (error) {
      console.error(`Failed to fetch casts for FID ${fid}:`, error)
    }

    return casts
  }

  /**
   * Calculate engagement rate based on cast metrics
   * @param casts Array of cast metrics
   * @returns Engagement rate score
   */
  private calculateEngagementRate(casts: CastMetrics[]): number {
    if (casts.length === 0) return 0

    const totalEngagement = casts.reduce(
      (sum, cast) => sum + cast.likes + cast.recasts * 2 + cast.replies * 1.5,
      0,
    )

    return totalEngagement / casts.length
  }

  /**
   * Calculate viral coefficient based on cast metrics
   * @param casts Array of cast metrics
   * @returns Viral coefficient score
   */
  private calculateViralCoefficient(casts: CastMetrics[]): number {
    const viralCasts = casts.filter((c) => c.recasts > 10 || c.likes > 50)
    return (viralCasts.length / Math.max(casts.length, 1)) * 100
  }

  /**
   * Calculate network score based on user profile
   * @param profile User profile data
   * @returns Network score (0-100)
   */
  private calculateNetworkScore(profile: any): number {
    const followerRatio =
      profile.follower_count / Math.max(profile.following_count, 1)
    const powerBadgeBonus = profile.power_badge ? 20 : 0
    return Math.min(100, followerRatio * 10 + powerBadgeBonus)
  }

  /**
   * Calculate growth rate based on follower count
   * @param _fid Farcaster ID
   * @param currentFollowers Current follower count
   * @returns Growth rate score
   */
  private async calculateGrowthRate(
    _fid: number,
    currentFollowers: number,
  ): Promise<number> {
    // For MVP, we'll calculate a simple growth score based on follower count
    // In production, you'd store historical data
    if (currentFollowers < 100) return 10
    if (currentFollowers < 1000) return 20
    if (currentFollowers < 10000) return 30
    return 40
  }
}

// Export singleton instance
export const neynarService = new NeynarService()
