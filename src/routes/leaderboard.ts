import { Hono } from 'hono'
import type { Bindings } from '../config/env'
import { getLeaderboard } from '../services/leaderboard-cache'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/leaderboard
 * Get top creators leaderboard from Firebase DB
 */
router.get('/', async (c) => {
  try {
    // Get cached leaderboard (generates fresh if needed)
    const cachedLeaderboard = await getLeaderboard(c.env)

    return c.json({
      success: true,
      data: cachedLeaderboard,
    })
  } catch (error) {
    console.error('Leaderboard fetch error:', error)
    return c.json(
      {
        error: 'Failed to fetch leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

export { router as leaderboardRoutes }
