import { Hono } from 'hono'
import { createNeynarService } from '../services/neynar'
import type { Bindings } from '../types'
import { inMemoryStore } from '../utils/inMemoryStore'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/test/health
 * Basic health check with system info
 */
router.get('/health', (c) => {
  const storeStats = inMemoryStore.getStats()

  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'cloudflare-workers',
    store: storeStats,
    hasNeynarKey: !!c.env.NEYNAR_API_KEY,
  })
})

/**
 * GET /api/test/neynar/:fid
 * Test Neynar API connection
 */
router.get('/neynar/:fid', async (c) => {
  try {
    const fid = parseInt(c.req.param('fid'), 10)
    const apiKey = c.env.NEYNAR_API_KEY

    if (Number.isNaN(fid)) {
      return c.json({ success: false, error: 'Invalid FID' }, 400)
    }

    if (!apiKey) {
      return c.json(
        { success: false, error: 'NEYNAR_API_KEY not configured' },
        500,
      )
    }

    const neynarService = createNeynarService(apiKey)
    const metrics = await neynarService.getCreatorMetrics(fid)

    if (!metrics) {
      return c.json(
        { success: false, error: 'Failed to fetch creator metrics' },
        404,
      )
    }

    return c.json({
      success: true,
      data: {
        fid: metrics.fid,
        username: metrics.username,
        followerCount: metrics.followerCount,
        powerBadge: metrics.powerBadge,
        neynarScore: metrics.neynarScore,
        castsCount: metrics.casts.length,
        engagementRate: metrics.engagementRate,
        postingFrequency: metrics.postingFrequency,
        cacheStats: neynarService.getCacheStats(),
      },
    })
  } catch (error) {
    console.error('Neynar test error:', error)
    return c.json({ success: false, error: 'Neynar API test failed' }, 500)
  }
})

/**
 * POST /api/test/seed-data
 * Seed some test data for development
 */
router.post('/seed-data', async (c) => {
  try {
    // Create some mock creator scores for testing
    const mockScores = [
      {
        shareableId: 'test_score_1',
        creatorFid: 1,
        overallScore: 85,
        percentileRank: 90,
        tier: 5,
        components: {
          engagement: 80,
          consistency: 85,
          growth: 90,
          quality: 85,
          network: 75,
        },
        scoreDate: new Date(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        shareableId: 'test_score_2',
        creatorFid: 2,
        overallScore: 72,
        percentileRank: 75,
        tier: 4,
        components: {
          engagement: 70,
          consistency: 75,
          growth: 70,
          quality: 80,
          network: 65,
        },
        scoreDate: new Date(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // Create mock creators
    const mockCreators = [
      {
        fid: 1,
        username: 'testuser1',
        displayName: 'Test User 1',
        followerCount: 5000,
        followingCount: 500,
        powerBadge: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fid: 2,
        username: 'testuser2',
        displayName: 'Test User 2',
        followerCount: 2500,
        followingCount: 300,
        powerBadge: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // Save to store
    for (const creator of mockCreators) {
      await inMemoryStore.saveCreator(creator)
    }

    for (const score of mockScores) {
      await inMemoryStore.saveCreatorScore(score)
    }

    return c.json({
      success: true,
      message: 'Test data seeded successfully',
      data: {
        creatorsAdded: mockCreators.length,
        scoresAdded: mockScores.length,
        storeStats: inMemoryStore.getStats(),
      },
    })
  } catch (error) {
    console.error('Seed data error:', error)
    return c.json({ success: false, error: 'Failed to seed test data' }, 500)
  }
})

/**
 * DELETE /api/test/clear-data
 * Clear all test data
 */
router.delete('/clear-data', (c) => {
  try {
    inMemoryStore.clear()

    return c.json({
      success: true,
      message: 'All data cleared successfully',
      storeStats: inMemoryStore.getStats(),
    })
  } catch (error) {
    console.error('Clear data error:', error)
    return c.json({ success: false, error: 'Failed to clear data' }, 500)
  }
})

export { router as testRoutes }
