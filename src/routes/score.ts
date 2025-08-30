import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { jobProcessor } from '../services/job'
import { loanCalculator } from '../services/loan'
import { calculateAllMetrics } from '../services/metrics'
import { createEnhancedNeynarService } from '../services/neynar-enhanced'
import { scoreNormalizer } from '../services/normalization'
import { CREDIT_TIERS, getTierInfo } from '../services/scoring'
import type { Bindings, ICreatorScore } from '../types'
import { inMemoryStore } from '../utils/inMemoryStore'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()

// Input schema for score calculation request
const calculateScoreSchema = z.object({
  fid: z.number().int().positive(),
})

/**
 * POST /api/score/calculate
 * Calculate a creator's score
 */
router.post(
  '/calculate',
  zValidator('json', calculateScoreSchema),
  async (c) => {
    try {
      const { fid } = c.req.valid('json')
      const apiKey = c.env.NEYNAR_API_KEY

      if (!apiKey) {
        return c.json(
          { success: false, error: 'NEYNAR_API_KEY not configured' },
          500,
        )
      }

      // Set API key for job processor
      jobProcessor.setApiKey(apiKey)

      // Queue calculation job with priority 10
      const jobId = await jobProcessor.queueScoreCalculation(fid, 10)

      // Maximum wait time for score calculation (10 seconds)
      const MAX_WAIT_TIME = 10000
      const POLL_INTERVAL = 500
      const startTime = Date.now()

      // Wait for job to complete with timeout
      const waitForCompletion = async () => {
        // Get today's date at midnight
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Check if we've exceeded our timeout
        if (Date.now() - startTime > MAX_WAIT_TIME) {
          throw new Error('Score calculation timed out')
        }

        // Check for job completion
        const calculatedScore = await inMemoryStore.findCreatorScore({
          creatorFid: fid,
          scoreDate: { $gte: today },
        })

        if (calculatedScore) {
          return calculatedScore
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
        return waitForCompletion()
      }

      let score: ICreatorScore
      try {
        // Wait for score calculation to complete
        score = await waitForCompletion()
      } catch (_error) {
        // Return a 202 Accepted if the job is still processing
        return c.json(
          {
            success: true,
            processing: true,
            message:
              'Score calculation is in progress. Please try again in a few seconds.',
            jobId,
          },
          202,
        )
      }

      // Calculate loan terms
      const loanTerms = loanCalculator.calculateTerms(score)

      return c.json({
        success: true,
        data: {
          score,
          loanTerms,
          shareUrl: `/share/${score.shareableId}`,
        },
      })
    } catch (error) {
      console.error('Score calculation error:', error)
      return c.json({ success: false, error: 'Failed to calculate score' }, 500)
    }
  },
)

/**
 * GET /api/score/:fid
 * Get a specific creator's score
 */
router.get('/:fid', async (c) => {
  try {
    const fid = parseInt(c.req.param('fid'), 10)

    if (Number.isNaN(fid)) {
      return c.json({ success: false, error: 'Invalid FID' }, 400)
    }

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find score in store
    const score = await inMemoryStore.findCreatorScore({
      creatorFid: fid,
      scoreDate: { $gte: today },
    })

    if (!score) {
      return c.json({ success: false, error: 'Score not found' }, 404)
    }

    // Get creator info
    const creator = await inMemoryStore.findCreator(fid)

    return c.json({
      success: true,
      data: {
        ...score,
        username: creator?.username,
        followerCount: creator?.followerCount,
      },
    })
  } catch (error) {
    console.error('Score fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch score' }, 500)
  }
})

/**
 * GET /api/score/share/:id
 * Get a score by its shareable ID
 */
router.get('/share/:id', async (c) => {
  try {
    const shareableId = c.req.param('id')

    // Find score by shareable ID
    const score = await inMemoryStore.findCreatorScore({ shareableId })

    if (!score) {
      return c.json({ success: false, error: 'Score not found' }, 404)
    }

    // Get creator info
    const creator = await inMemoryStore.findCreator(score.creatorFid)

    // Calculate loan terms
    const loanTerms = loanCalculator.calculateTerms(score)

    return c.json({
      success: true,
      data: {
        score: {
          ...score,
          username: creator?.username,
          followerCount: creator?.followerCount,
        },
        loanTerms,
      },
    })
  } catch (error) {
    console.error('Shared score fetch error:', error)
    return c.json(
      { success: false, error: 'Failed to fetch shared score' },
      500,
    )
  }
})

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
        debug: {
          calculatedMetrics, // Include raw calculated metrics for debugging
          rawDataPoints: {
            followers: rawMetrics.profile.followers,
            casts: rawMetrics.casts.length,
            activeDays: rawMetrics.activity.activeDays,
          },
        },
      },
    })
  } catch (error) {
    console.error('Error calculating creator score:', error)
    return c.json({ error: 'Failed to calculate creator score' }, 500)
  }
})

/**
 * GET /api/score/tiers
 * Get all available credit tiers
 */
router.get('/tiers', async (c) => {
  return c.json({
    success: true,
    data: {
      tiers: CREDIT_TIERS,
      totalTiers: CREDIT_TIERS.length,
    },
  })
})

export { router as scoreRoutes }
