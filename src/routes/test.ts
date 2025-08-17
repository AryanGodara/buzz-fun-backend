import { Hono } from 'hono'
import { env } from '../config/env'
import { jobProcessor } from '../services/job'
import { neynarService } from '../services/neynar'
import { scoreCalculator } from '../services/score'

const router = new Hono()

// Test endpoint to manually trigger score calculation
router.post('/calculate-score/:fid', async (c) => {
  const fid = parseInt(c.req.param('fid'), 10)

  try {
    // Directly call the services for testing
    console.log(`📊 Testing score calculation for FID: ${fid}`)

    // Step 1: Fetch metrics
    const metrics = await neynarService.getUserMetrics(fid, 30)
    console.log('✅ Metrics fetched:', metrics)

    // Step 2: Calculate score
    const score = await scoreCalculator.calculateScore(metrics)
    console.log('✅ Score calculated:', score)

    return c.json({
      success: true,
      metrics,
      score,
    })
  } catch (error) {
    console.error('Test failed:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

// Test Neynar API connection
router.get('/test-neynar/:fid', async (c) => {
  const fid = parseInt(c.req.param('fid'), 10)

  try {
    // Using our refactored service
    const userMetrics = await neynarService.getUserMetrics(fid, 30)

    // Return the metrics directly
    return c.json({
      success: true,
      userInfo: {
        username: userMetrics.username,
        followerCount: userMetrics.followerCount,
        followingCount: userMetrics.followingCount,
      },
      casts: userMetrics.casts,
      metrics: {
        engagementRate: userMetrics.engagementRate,
        postingFrequency: userMetrics.postingFrequency,
        growthRate: userMetrics.growthRate,
        viralCoefficient: userMetrics.viralCoefficient,
        networkScore: userMetrics.networkScore,
      },
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

// List all jobs in queue
router.get('/jobs', async (c) => {
  try {
    // Get jobs using the public method
    const jobs = jobProcessor.getJobs()

    return c.json({
      success: true,
      jobs,
      count: jobs.length,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

// API Key diagnostic endpoint
router.get('/diagnose-neynar', async (c) => {
  try {
    // Get the API key currently in use
    const apiKey = env.NEYNAR_API_KEY
    const maskedKey = apiKey
      ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
      : 'Not set'

    // Check for API key format - Neynar keys typically start with NEYNAR_
    const hasValidFormat = apiKey?.startsWith('NEYNAR_')

    // Attempt to test the API directly
    let apiConnectionTest = 'Not tested'
    let lowLevelError = null

    try {
      // Make a direct API call
      const response = await fetch(
        'https://api.neynar.com/v2/farcaster/user/1/followers?limit=1',
        {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            Accept: 'application/json',
          },
        },
      )

      if (response.ok) {
        apiConnectionTest = 'Success'
      } else {
        apiConnectionTest = 'Failed'
        lowLevelError = `HTTP ${response.status}: ${await response.text()}`
      }
    } catch (err) {
      apiConnectionTest = 'Failed'
      lowLevelError = err instanceof Error ? err.message : String(err)
    }

    return c.json({
      apiKeyPresent: Boolean(apiKey),
      maskedKey,
      hasValidFormat,
      apiConnectionTest,
      lowLevelError,
      implementationType: 'Direct API (No SDK)',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

export { router as testRoutes }
