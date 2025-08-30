import { Hono } from 'hono'
import type { Bindings } from '../config/env'
import { getFromFirebase } from '../services/firebase-admin'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/leaderboard
 * Get top creators leaderboard from Firebase DB
 */
router.get('/', async (c) => {
  try {
    // Get all scores from Firebase
    const allScores = await getFromFirebase(c.env, 'scores')

    if (!allScores) {
      // Return empty leaderboard if no data
      return c.json({
        success: true,
        data: {
          leaderboard: [],
          total: 0,
          generatedAt: new Date().toISOString(),
        },
      })
    }

    // Convert Firebase object to array and filter valid scores
    const scoresArray = Object.entries(allScores)
      .map(([fid, scoreData]: [string, any]) => ({
        fid: parseInt(fid, 10),
        ...scoreData,
      }))
      .filter(
        (score) =>
          score.overallScore !== undefined &&
          score.tier &&
          !Number.isNaN(score.fid),
      )

    // Sort by overall score (descending) and take top 20
    const topScores = scoresArray
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 20)

    // Add rank to each entry
    const leaderboard = topScores.map((score, index) => ({
      rank: index + 1,
      fid: score.fid,
      overallScore: score.overallScore,
      tier: score.tier,
      tierInfo: score.tierInfo,
      percentileRank: score.percentileRank,
      components: score.components,
      timestamp: score.timestamp,
    }))

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

export { router as leaderboardRoutes }
