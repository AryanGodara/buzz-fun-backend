import { Hono } from 'hono'
// Firebase Admin temporarily disabled - import { getFirebaseAdminApp } from '../services/firebase-admin'
import { calculateAllMetrics } from '../services/metrics'
import { EnhancedNeynarService } from '../services/neynar-enhanced'
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

    // Check Firebase for existing score (if Firebase Admin is configured)
    if (c.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        // Firebase Admin temporarily disabled for Cloudflare Workers compatibility
        // TODO: Implement Firebase REST API alternative
        const existingScore = null

        if (existingScore) {
          // Temporarily disabled - would check timestamp here
          const scoreAge = 0
          const twentyFourHours = 24 * 60 * 60 * 1000

          // Return cached score if less than 24 hours old
          if (scoreAge < twentyFourHours) {
            return c.json({
              success: true,
              data: existingScore,
              cached: true,
            })
          }
        }
      } catch (dbError) {
        console.warn(
          'Firebase read error, proceeding with calculation:',
          dbError,
        )
      }
    }

    // Create Neynar service and fetch raw data
    const neynarService = new EnhancedNeynarService(c.env.NEYNAR_API_KEY)
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

    const scoreData = {
      fid,
      overallScore,
      tier,
      tierInfo,
      percentileRank,
      components: normalizedComponents,
      timestamp: now,
      validUntil,
    }

    // Store in Firebase (if configured)
    if (c.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        // Firebase Admin temporarily disabled for Cloudflare Workers compatibility
        // TODO: Implement Firebase REST API alternative
        console.log('Mock: Would save score to Firebase')
      } catch (dbError) {
        console.warn(
          'Firebase write error, returning calculated score anyway:',
          dbError,
        )
      }
    }

    return c.json({
      success: true,
      data: scoreData,
    })
  } catch (error) {
    console.error('Error calculating creator score:', error)
    return c.json({ error: 'Failed to calculate creator score' }, 500)
  }
})

export { router as scoreRoutes }
