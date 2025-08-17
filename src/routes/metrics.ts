import { Hono } from 'hono'
import { neynarService } from '../services/neynar'

/**
 * Interface for user metrics response
 */
interface UserMetrics {
  followers: number
  following: number
  casts: number
  reactions: number
  replies: number
  recasts: number
  engagement_rate: number
  last_updated: string
}

/**
 * Interface for trending cast
 */
interface TrendingCast {
  hash: string
  text: string
  reactions: number
  recasts: number
  replies: number
  timestamp: string
}

export const metricsRoutes = new Hono()

// Get metrics for a specified Farcaster user
metricsRoutes.get('/:fid', async (c) => {
  const fidParam = c.req.param('fid')
  const fid = parseInt(fidParam, 10)

  if (Number.isNaN(fid)) {
    return c.json({ error: 'Invalid FID provided' }, 400)
  }

  try {
    // Fetch actual metrics using NeynarService
    const creatorMetrics = await neynarService.getUserMetrics(fid)

    // Transform to the expected response format
    const metrics: UserMetrics = {
      followers: creatorMetrics.followerCount,
      following: creatorMetrics.followingCount,
      casts: creatorMetrics.casts.length,
      // Calculate total reactions, replies and recasts
      reactions: creatorMetrics.casts.reduce(
        (sum, cast) => sum + cast.likes,
        0,
      ),
      replies: creatorMetrics.casts.reduce(
        (sum, cast) => sum + cast.replies,
        0,
      ),
      recasts: creatorMetrics.casts.reduce(
        (sum, cast) => sum + cast.recasts,
        0,
      ),
      engagement_rate: creatorMetrics.engagementRate,
      last_updated: new Date().toISOString(),
    }

    console.log("Fetched the metrics, sending response: ", metrics)
    return c.json({
      fid: fidParam,
      metrics,
    })
  } catch (error) {
    console.error('Error fetching Farcaster metrics:', error)
    return c.json({ error: 'Failed to fetch metrics' }, 500)
  }
})

// Get trending casts for a specified Farcaster user
metricsRoutes.get('/:fid/trending', async (c) => {
  const fidParam = c.req.param('fid')
  const fid = parseInt(fidParam, 10)

  if (Number.isNaN(fid)) {
    return c.json({ error: 'Invalid FID provided' }, 400)
  }

  try {
    // Fetch metrics using NeynarService
    const creatorMetrics = await neynarService.getUserMetrics(fid)

    // Find trending casts (sort by engagement - likes + recasts + replies)
    const sortedCasts = [...creatorMetrics.casts].sort((a, b) => {
      const engagementA = a.likes + a.recasts * 2 + a.replies * 1.5
      const engagementB = b.likes + b.recasts * 2 + b.replies * 1.5
      return engagementB - engagementA // Sort descending
    })

    // Take top 5 trending casts or fewer if not enough
    const topCasts = sortedCasts.slice(0, 5)

    // Map to TrendingCast format
    const trendingCasts: TrendingCast[] = topCasts.map((cast) => ({
      hash: cast.hash,
      text: '', // API doesn't provide text content in free tier
      reactions: cast.likes,
      recasts: cast.recasts,
      replies: cast.replies,
      timestamp: cast.timestamp.toISOString(),
    }))

    return c.json({
      fid: fidParam,
      trending_casts: trendingCasts.length > 0 ? trendingCasts : [],
    })
  } catch (error) {
    console.error('Error fetching trending casts:', error)
    return c.json({ error: 'Failed to fetch trending casts' }, 500)
  }
})
