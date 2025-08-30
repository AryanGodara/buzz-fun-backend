import { Hono } from 'hono'
import type { Bindings } from '../types'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/test/health
 * Basic health check for debugging
 */
router.get('/health', (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'cloudflare-workers',
    hasNeynarKey: !!c.env.NEYNAR_API_KEY,
  })
})

export { router as testRoutes }
