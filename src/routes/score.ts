import { Hono } from 'hono'
import type { Bindings } from '../config/env'
import { getNeynarApiKey } from '../config/env'
import { saveToFirebase, getFromFirebase } from '../services/firebase-admin'
import { calculateAllMetrics } from '../services/metrics'
import { EnhancedNeynarService } from '../services/neynar-enhanced'
import { ScoreNormalizer } from '../services/score-normalizer'
import { getTierInfo } from '../services/tier-system'

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

    // Check Firebase for existing score (if Firebase is configured)
    if (c.env.FIREBASE_DATABASE_URL) {
      try {
        const existingScore = await getFromFirebase(c.env, `scores/${fid}`)

        if (existingScore && new Date(existingScore.validUntil) > new Date()) {
          console.log(`🔄 Returning cached score from Firebase for FID ${fid}`)
          return c.json({ success: true, data: existingScore })
        } else if (existingScore) {
          console.log(`⏰ Cached score expired for FID ${fid}, recalculating`)
        } else {
          console.log(`🆕 No cached score found for FID ${fid}, calculating fresh`)
        }
      } catch (dbError) {
        console.warn('Firebase read error, calculating fresh score:', dbError)
      }
    }

    // Create Neynar service and fetch raw data
    const apiKey = getNeynarApiKey(c.env)
    const neynarService = new EnhancedNeynarService(apiKey)
    const rawMetrics = await neynarService.fetchRawCreatorMetrics(fid)

    if (!rawMetrics) {
      return c.json({ error: 'Creator not found or API error' }, 404)
    }

    // Debug: Log raw metrics to see what we're getting from Neynar
    console.log(
      'Raw metrics from Neynar:',
      JSON.stringify(
        {
          profile: rawMetrics.profile,
          castsCount: rawMetrics.casts.length,
          sampleCast: rawMetrics.casts[0],
          financial: rawMetrics.financial,
          network: rawMetrics.network,
        },
        null,
        2,
      ),
    )

    // Calculate metrics using new algorithm
    const calculatedMetrics = calculateAllMetrics(rawMetrics)

    // Debug: Log calculated metrics
    console.log('Calculated metrics:', calculatedMetrics)

    // Normalize scores
    const scoreNormalizer = new ScoreNormalizer()
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
    if (c.env.FIREBASE_DATABASE_URL) {
      const saved = await saveToFirebase(c.env, `scores/${fid}`, scoreData)
      if (!saved) {
        console.warn('Failed to save to Firebase, continuing anyway')
      }
    } else {
      console.log('ℹ️ Firebase database URL not configured, skipping save')
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
