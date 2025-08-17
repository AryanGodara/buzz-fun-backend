import { Hono } from 'hono'
import { z } from 'zod'
import { Creator } from '../models/creator'
import { CreatorScore } from '../models/creatorScore'

/**
 * Type for leaderboard entry
 */
interface LeaderboardEntry {
  fid: number
  username: string
  overallScore: number
  tier: number
  percentileRank: number
  followerCount: number
  powerBadge: boolean
}

/**
 * Type for leaderboard types
 */
type LeaderboardType = 'all' | 'weekly' | 'friends'

// Create router
const router = new Hono()

// Type validation schema
const leaderboardTypeSchema = z.enum(['all', 'weekly', 'friends'])

/**
 * GET /api/leaderboard/:type
 * Get leaderboard by type
 */
router.get('/:type', async (c) => {
  try {
    const type = c.req.param('type')
    const fidParam = c.req.query('fid')
    const fid = fidParam ? parseInt(fidParam, 10) : undefined

    // Validate type
    const result = leaderboardTypeSchema.safeParse(type)
    if (!result.success) {
      return c.json(
        {
          success: false,
          error:
            'Invalid leaderboard type. Must be one of: all, weekly, friends',
        },
        400,
      )
    }

    // If friends type is specified, FID is required
    if (type === 'friends' && !fid) {
      return c.json(
        { success: false, error: 'FID required for friends leaderboard' },
        400,
      )
    }

    // Get fresh data directly (no caching for MVP)
    const leaderboard = await getLeaderboard(type as LeaderboardType, fid)

    return c.json({
      success: true,
      data: leaderboard,
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return c.json({ success: false, error: 'Failed to fetch leaderboard' }, 500)
  }
})

/**
 * Get leaderboard data based on type
 * @param type Leaderboard type
 * @param fid Optional Farcaster ID for friends leaderboard
 * @returns Array of leaderboard entries
 */
async function getLeaderboard(
  type: LeaderboardType,
  fid?: number,
): Promise<LeaderboardEntry[]> {
  // Get today's date at midnight
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let query = {}
  let limit = 100

  switch (type) {
    case 'weekly': {
      // Get scores from the last 7 days
      const oneWeekAgo = new Date(today)
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      query = {
        scoreDate: { $gte: oneWeekAgo },
      }
      break
    }

    case 'friends': {
      if (!fid) throw new Error('FID required for friends leaderboard')

      // In a production environment with proper follow relationships,
      // we would query a "follows" collection

      // For now, we'll simulate by getting similar-scoring creators
      const userScore = await CreatorScore.findOne({
        creatorFid: fid,
        scoreDate: { $gte: today },
      })

      if (!userScore) {
        return []
      }

      query = {
        creatorFid: { $ne: fid },
        scoreDate: { $gte: today },
        overallScore: {
          $gte: Math.max(0, userScore.overallScore - 20),
          $lte: Math.min(100, userScore.overallScore + 20),
        },
      }

      limit = 50
      break
    }

    default: {
      // Get today's scores
      query = {
        scoreDate: { $gte: today },
      }
    }
  }

  // Get scores from database
  const scores = await CreatorScore.find(query)
    .sort({ overallScore: -1 })
    .limit(limit)

  // Get creator info for these scores
  const creatorFids = scores.map((score) => score.creatorFid)
  const creators = await Creator.find({ fid: { $in: creatorFids } })

  // Map creator info to scores
  return scores.map((score) => {
    const creator = creators.find((c) => c.fid === score.creatorFid)

    const entry: LeaderboardEntry = {
      fid: score.creatorFid,
      username: creator?.username || `user_${score.creatorFid}`,
      overallScore: score.overallScore,
      tier: score.tier,
      percentileRank: score.percentileRank,
      followerCount: creator?.followerCount || 0,
      powerBadge: creator?.powerBadge || false,
    }

    return entry
  })
}

export { router as leaderboardRoutes }
