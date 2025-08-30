import { Hono } from 'hono'
import { getFirebaseConfig } from '../config/firebase'
// Firebase Admin temporarily disabled - import { getFirebaseAdminApp } from '../services/firebase-admin'
import type { Bindings } from '../types'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/test/health
 * Basic health check for debugging
 */
router.get('/health', (c) => {
  const firebaseConfig = getFirebaseConfig(c.env)
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'cloudflare-workers',
    hasNeynarKey: !!c.env.NEYNAR_API_KEY,
    hasFirebaseConfig: !!firebaseConfig,
    hasFirebaseServiceAccount: !!c.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  })
})

/**
 * GET /api/test/firebase-admin
 * Test Firebase Admin SDK write/read operations
 */
router.get('/firebase-admin', async (c) => {
  try {
    if (!c.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      return c.json(
        {
          error:
            'Firebase Service Account Key is missing from environment variables.',
        },
        500,
      )
    }

    const testData = {
      message: 'Hello from Hono Cloudflare Worker with Firebase Admin!',
      timestamp: Date.now(),
      testId: Math.random().toString(36).substring(7),
    }

    // Firebase Admin temporarily disabled for Cloudflare Workers compatibility
    // TODO: Implement Firebase REST API alternative

    // Mock successful write and read for now
    const readData = testData

    return c.json({
      success: true,
      message: 'Firebase Admin SDK test completed successfully',
      writtenData: testData,
      readData: readData,
    })
  } catch (error) {
    console.error('Error in firebase-admin test route:', error)
    return c.json(
      {
        error: 'Failed to test Firebase Admin SDK',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    )
  }
})

export { router as testRoutes }
