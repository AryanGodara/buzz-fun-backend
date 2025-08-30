import { Hono } from 'hono'
import type { Bindings } from '../types'
import { inMemoryStore } from '../utils/inMemoryStore'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/leaderboard
 * Get top creators leaderboard
 */
router.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10', 10)
    const maxLimit = Math.min(limit, 100) // Cap at 100

    // Get today's date at midnight for filtering recent scores
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get top scores
    const topScores = await inMemoryStore.getTopScores(maxLimit, today)

    // Enrich with creator data
    const leaderboard = await Promise.all(
      topScores.map(async (score) => {
        const creator = await inMemoryStore.findCreator(score.creatorFid)
        return {
          rank: topScores.indexOf(score) + 1,
          fid: score.creatorFid,
          username: creator?.username || 'unknown',
          followerCount: creator?.followerCount || 0,
          powerBadge: creator?.powerBadge || false,
          overallScore: score.overallScore,
          tier: score.tier,
          percentileRank: score.percentileRank,
          components: score.components,
          scoreDate: score.scoreDate,
        }
      }),
    )

    return c.json({
      success: true,
      data: {
        leaderboard,
        total: leaderboard.length,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Leaderboard fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch leaderboard' }, 500)
  }
})

/**
 * GET /api/leaderboard/tier/:tier
 * Get leaderboard for a specific tier
 */
router.get('/tier/:tier', async (c) => {
  try {
    const tier = parseInt(c.req.param('tier'), 10)
    const limit = parseInt(c.req.query('limit') || '10', 10)
    const maxLimit = Math.min(limit, 100)

    if (tier < 1 || tier > 6) {
      return c.json(
        { success: false, error: 'Invalid tier (must be 1-6)' },
        400,
      )
    }

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all recent scores and filter by tier
    const allScores = await inMemoryStore.getTopScores(1000, today)
    const tierScores = allScores
      .filter((score) => score.tier === tier)
      .slice(0, maxLimit)

    // Enrich with creator data
    const leaderboard = await Promise.all(
      tierScores.map(async (score, index) => {
        const creator = await inMemoryStore.findCreator(score.creatorFid)
        return {
          rank: index + 1,
          fid: score.creatorFid,
          username: creator?.username || 'unknown',
          followerCount: creator?.followerCount || 0,
          powerBadge: creator?.powerBadge || false,
          overallScore: score.overallScore,
          tier: score.tier,
          percentileRank: score.percentileRank,
          components: score.components,
          scoreDate: score.scoreDate,
        }
      }),
    )

    const tierNames = {
      1: 'Starter',
      2: 'Bronze',
      3: 'Silver',
      4: 'Gold',
      5: 'Platinum',
      6: 'Diamond',
    }

    return c.json({
      success: true,
      data: {
        tier,
        tierName: tierNames[tier as keyof typeof tierNames],
        leaderboard,
        total: leaderboard.length,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Tier leaderboard fetch error:', error)
    return c.json(
      { success: false, error: 'Failed to fetch tier leaderboard' },
      500,
    )
  }
})

export { router as leaderboardRoutes }
