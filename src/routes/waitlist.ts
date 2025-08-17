import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { Creator } from '../models/creator'
import { Waitlist } from '../models/waitlist'

/**
 * Interface for waitlist entry response
 */
interface WaitlistEntryResponse {
  position: number
  message: string
}

/**
 * Interface for waitlist status response
 */
interface WaitlistStatusResponse {
  onWaitlist: boolean
  position?: number
  joinedAt?: Date
  percentile?: number
  totalCount?: number
}

// Create router
const router = new Hono()

// Waitlist schema validation
const waitlistSchema = z.object({
  fid: z.number().int().positive(),
  email: z.string().email(),
})

/**
 * POST /api/waitlist
 * Join the loan waitlist
 */
router.post('/', zValidator('json', waitlistSchema), async (c) => {
  try {
    const { fid, email } = c.req.valid('json')

    // Check if creator exists, create if not
    const creator = await Creator.findOne({ fid })
    if (!creator) {
      // In a real implementation, we would fetch creator info from Neynar first
      await Creator.create({
        fid,
        username: `user_${fid}`,
        followerCount: 0,
        followingCount: 0,
        powerBadge: false,
        neynarScore: 0,
      })
    }

    // Check if already on waitlist
    const existingEntry = await Waitlist.findOne({ fid })
    if (existingEntry) {
      const response: WaitlistEntryResponse = {
        position: existingEntry.position,
        message: 'You are already on the waitlist!',
      }

      return c.json({
        success: true,
        data: response,
      })
    }

    // Add to waitlist
    const waitlist = new Waitlist({
      fid,
      email,
      joinedAt: new Date(),
    })

    await waitlist.save()

    const response: WaitlistEntryResponse = {
      position: waitlist.position,
      message: 'Successfully joined waitlist!',
    }

    return c.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('Waitlist error:', error)
    return c.json({ success: false, error: 'Failed to join waitlist' }, 500)
  }
})

/**
 * GET /api/waitlist/status/:fid
 * Check waitlist status for a creator
 */
router.get('/status/:fid', async (c) => {
  try {
    const fid = parseInt(c.req.param('fid'), 10)

    if (Number.isNaN(fid)) {
      return c.json({ success: false, error: 'Invalid FID' }, 400)
    }

    const waitlistEntry = await Waitlist.findOne({ fid })

    if (!waitlistEntry) {
      return c.json(
        {
          success: false,
          error: 'Not on waitlist',
          data: { onWaitlist: false },
        },
        404,
      )
    }

    // Get total count for percentage calculation
    const totalCount = await Waitlist.countDocuments()
    const percentile = Math.round((waitlistEntry.position / totalCount) * 100)

    return c.json({
      success: true,
      data: {
        onWaitlist: true,
        position: waitlistEntry.position,
        joinedAt: waitlistEntry.joinedAt,
        percentile,
        totalCount,
      },
    })
  } catch (error) {
    console.error('Waitlist status error:', error)
    return c.json(
      { success: false, error: 'Failed to check waitlist status' },
      500,
    )
  }
})

export { router as waitlistRoutes }
