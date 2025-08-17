import { Hono } from 'hono'
import { jobProcessor } from '../services/job'

// Create router
const router = new Hono()

/**
 * POST /api/webhooks/neynar
 * Webhook handler for real-time updates from Neynar
 */
router.post('/neynar', async (c) => {
  try {
    const payload = await c.req.json()

    // Verify webhook signature
    const _signature = c.req.header('X-Neynar-Signature')
    // TODO: Implement signature verification in production

    console.log('📩 Received Neynar webhook:', payload.type)

    // Process different webhook types
    switch (payload.type) {
      case 'cast.created': {
        // Update creator's metrics in background
        await jobProcessor.queueScoreCalculation(payload.data.fid, 5)
        break
      }

      case 'follow.created':
      case 'follow.deleted': {
        // Trigger metrics update for affected users
        await jobProcessor.queueScoreCalculation(payload.data.fid, 10)

        // If a following relationship changed, also update the target
        if (payload.data.targetFid) {
          await jobProcessor.queueScoreCalculation(payload.data.targetFid, 10)
        }
        break
      }

      case 'reaction.created':
      case 'reaction.deleted': {
        // If a cast received a reaction, update metrics for the cast author
        if (payload.data.castAuthorFid) {
          await jobProcessor.queueScoreCalculation(
            payload.data.castAuthorFid,
            10,
          )
        }
        break
      }
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ success: false, error: 'Webhook processing failed' }, 500)
  }
})

export { router as webhookRoutes }
