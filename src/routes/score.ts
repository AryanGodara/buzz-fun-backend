import { Hono } from 'hono'
import { calculateAllMetrics } from '../services/metrics'
import { createEnhancedNeynarService } from '../services/neynar-enhanced'
import { scoreNormalizer } from '../services/normalization'
import { getTierInfo } from '../services/scoring'
import type { Bindings } from '../types'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()




/**
 * GET /api/score/creator/:fid
 * Get creator score with tier information (new scoring system)
 */
router.get('/creator/:fid', async (c) => {
  try {
    const fid = parseInt(c.req.param('fid'), 10)

    if (!fid || Number.isNaN(fid)) {
      return c.json({ error: 'Invalid FID provided' }, 400)
    }

    const apiKey = c.env.NEYNAR_API_KEY
    if (!apiKey) {
      return c.json({ error: 'NEYNAR_API_KEY not configured' }, 500)
    }

    // Create Neynar service and fetch raw data
    const neynarService = createEnhancedNeynarService(apiKey)
    const rawMetrics = await neynarService.fetchRawCreatorMetrics(fid)

    if (!rawMetrics) {
      return c.json({ error: 'Creator not found or API error' }, 404)
    }

    // Calculate metrics using new algorithm
    const calculatedMetrics = calculateAllMetrics(rawMetrics)

    // Normalize scores
    const normalizedComponents =
      scoreNormalizer.normalizeScores(calculatedMetrics)
    const overallScore =
      scoreNormalizer.calculateOverallScore(normalizedComponents)
    const percentileRank = scoreNormalizer.calculatePercentileRank(overallScore)
    const tier = scoreNormalizer.getCreditTier(overallScore)
    const tierInfo = getTierInfo(tier)

    const now = new Date()
    const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Valid for 24 hours

    return c.json({
      success: true,
      data: {
        fid,
        overallScore,
        tier,
        tierInfo,
        percentileRank,
        components: normalizedComponents,
        timestamp: now,
        validUntil,
      },
    })
  } catch (error) {
    console.error('Error calculating creator score:', error)
    return c.json({ error: 'Failed to calculate creator score' }, 500)
  }
})


export { router as scoreRoutes }
