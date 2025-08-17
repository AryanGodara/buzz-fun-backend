import { Hono } from 'hono'
import { challengeRoutes } from './challenge'
import { leaderboardRoutes } from './leaderboard'
import { metricsRoutes } from './metrics'
import { scoreRoutes } from './score'
import { testRoutes } from './test'
import { waitlistRoutes } from './waitlist'
import { webhookRoutes } from './webhooks'

// Create API router
const apiRouter = new Hono()

// Mount routes
apiRouter.route('/score', scoreRoutes)
apiRouter.route('/leaderboard', leaderboardRoutes)
apiRouter.route('/challenge', challengeRoutes)
apiRouter.route('/waitlist', waitlistRoutes)
apiRouter.route('/webhooks', webhookRoutes)
apiRouter.route('/metrics', metricsRoutes) // Keep existing metrics routes
apiRouter.route('/test', testRoutes) // Add test routes for manual testing

// Health check endpoint
apiRouter.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

export { apiRouter }
