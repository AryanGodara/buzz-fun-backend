import { Hono } from 'hono'
import { leaderboardRoutes } from './leaderboard'
import { nftRoutes } from './nft'
import { scoreRoutes } from './score'
import { testRoutes } from './test'

// Create API router
const apiRouter = new Hono()

// Mount routes
apiRouter.route('/score', scoreRoutes)
apiRouter.route('/leaderboard', leaderboardRoutes)
apiRouter.route('/test', testRoutes)
apiRouter.route('/nft', nftRoutes)

// Health check endpoint
apiRouter.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

export { apiRouter }
