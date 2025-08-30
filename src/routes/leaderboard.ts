import { Hono } from 'hono'
import type { Bindings, CreditTier } from '../types'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()

// Mock leaderboard data
const mockLeaderboard = [
  {
    rank: 1,
    fid: 12345,
    username: 'creator1',
    followerCount: 15000,
    powerBadge: true,
    overallScore: 92,
    tier: 'AAA' as CreditTier,
    percentileRank: 99,
  },
  {
    rank: 2,
    fid: 23456,
    username: 'creator2',
    followerCount: 12000,
    powerBadge: true,
    overallScore: 88,
    tier: 'AA' as CreditTier,
    percentileRank: 95,
  },
  {
    rank: 3,
    fid: 34567,
    username: 'creator3',
    followerCount: 9500,
    powerBadge: false,
    overallScore: 84,
    tier: 'AA' as CreditTier,
    percentileRank: 90,
  },
  {
    rank: 4,
    fid: 45678,
    username: 'creator4',
    followerCount: 8200,
    powerBadge: true,
    overallScore: 78,
    tier: 'A' as CreditTier,
    percentileRank: 85,
  },
  {
    rank: 5,
    fid: 56789,
    username: 'creator5',
    followerCount: 7100,
    powerBadge: false,
    overallScore: 75,
    tier: 'A' as CreditTier,
    percentileRank: 80,
  },
  {
    rank: 6,
    fid: 67890,
    username: 'creator6',
    followerCount: 6800,
    powerBadge: false,
    overallScore: 71,
    tier: 'A' as CreditTier,
    percentileRank: 75,
  },
  {
    rank: 7,
    fid: 78901,
    username: 'creator7',
    followerCount: 5900,
    powerBadge: false,
    overallScore: 68,
    tier: 'BBB' as CreditTier,
    percentileRank: 70,
  },
  {
    rank: 8,
    fid: 89012,
    username: 'creator8',
    followerCount: 5200,
    powerBadge: false,
    overallScore: 64,
    tier: 'BBB' as CreditTier,
    percentileRank: 65,
  },
  {
    rank: 9,
    fid: 90123,
    username: 'creator9',
    followerCount: 4800,
    powerBadge: false,
    overallScore: 61,
    tier: 'BBB' as CreditTier,
    percentileRank: 60,
  },
  {
    rank: 10,
    fid: 10234,
    username: 'creator10',
    followerCount: 4200,
    powerBadge: false,
    overallScore: 58,
    tier: 'BB' as CreditTier,
    percentileRank: 55,
  },
]

/**
 * GET /api/leaderboard
 * Get top creators leaderboard
 */
router.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10', 10)
    const maxLimit = Math.min(limit, 100) // Cap at 100

    const leaderboard = mockLeaderboard.slice(0, maxLimit)

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
    const tierParam = c.req.param('tier') as CreditTier
    const limit = parseInt(c.req.query('limit') || '10', 10)
    const maxLimit = Math.min(limit, 100)

    const validTiers: CreditTier[] = [
      'D',
      'C',
      'B',
      'BB',
      'BBB',
      'A',
      'AA',
      'AAA',
    ]

    if (!validTiers.includes(tierParam)) {
      return c.json(
        {
          success: false,
          error: 'Invalid tier (must be one of: D, C, B, BB, BBB, A, AA, AAA)',
        },
        400,
      )
    }

    // Filter mock data by tier
    const tierLeaderboard = mockLeaderboard
      .filter((creator) => creator.tier === tierParam)
      .slice(0, maxLimit)

    return c.json({
      success: true,
      data: {
        tier: tierParam,
        leaderboard: tierLeaderboard,
        total: tierLeaderboard.length,
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
