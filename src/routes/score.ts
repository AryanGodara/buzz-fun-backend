import { Hono } from 'hono'
import { getNeynarApiKey } from '../config/env'
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

    // Check Firebase for existing score (if Firebase Admin is configured)
    if (c.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        // Firebase Admin temporarily disabled for Cloudflare Workers compatibility
        // TODO: Implement Firebase REST API alternative
        const existingScore = null

        if (existingScore) {
          return c.json({
            success: true,
            data: existingScore,
            cached: true,
          })
        }
      } catch (dbError) {
        console.warn(
          'Firebase read error, proceeding with calculation:',
          dbError,
        )
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
    console.log('Raw metrics from Neynar:', JSON.stringify({
      profile: rawMetrics.profile,
      castsCount: rawMetrics.casts.length,
      sampleCast: rawMetrics.casts[0],
      financial: rawMetrics.financial,
      network: rawMetrics.network
    }, null, 2))

    // Calculate metrics using new algorithm
    const calculatedMetrics = calculateAllMetrics(rawMetrics)
    
    // Debug: Log calculated metrics
    console.log('Calculated metrics:', calculatedMetrics)

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
        // Use Firebase REST API for Cloudflare Workers compatibility
        const firebaseProjectId = c.env.FIREBASE_PROJECT_ID || 'buzz-fun'
        const firebaseUrl = `https://${firebaseProjectId}-default-rtdb.firebaseio.com/scores/${fid}.json`
        
        const firebaseResponse = await fetch(firebaseUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scoreData),
        })
        
        if (firebaseResponse.ok) {
          console.log('Score saved to Firebase successfully')
        } else {
          console.warn('Failed to save to Firebase:', firebaseResponse.status)
        }
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
