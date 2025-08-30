import { Hono } from 'hono'
import type { Bindings } from '../config/env'
import {
  generateAndCacheLeaderboard,
  getLeaderboard,
} from '../services/leaderboard-cache'

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

/**
 * POST /api/leaderboard/refresh
 * Force refresh the leaderboard cache with latest data
 */
router.post('/refresh', async (c) => {
  try {
    console.log('Force refreshing leaderboard cache...')
    const freshLeaderboard = await generateAndCacheLeaderboard(c.env)

    return c.json({
      success: true,
      data: freshLeaderboard,
      message: 'Leaderboard cache refreshed successfully',
    })
  } catch (error) {
    console.error('Leaderboard refresh error:', error)
    return c.json(
      {
        error: 'Failed to refresh leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

export { router as leaderboardRoutes }
