import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Bindings, IWaitlistEntry } from '../types'
import { inMemoryStore } from '../utils/inMemoryStore'

// Create router with bindings
const router = new Hono<{ Bindings: Bindings }>()

// Input schema for waitlist signup
const waitlistSignupSchema = z.object({
  fid: z.number().int().positive(),
  username: z.string().min(1),
  email: z.string().email().optional(),
  requestedAmount: z.number().positive().max(100000),
})

/**
 * POST /api/waitlist/signup
 * Sign up for loan waitlist
 */
router.post('/signup', zValidator('json', waitlistSignupSchema), async (c) => {
  try {
    const { fid, username, email, requestedAmount } = c.req.valid('json')

    // Check if user is already on waitlist
    const existingEntry = await inMemoryStore.findWaitlistEntry(fid)
    if (existingEntry) {
      return c.json(
        {
          success: false,
          error: 'User already on waitlist',
          data: existingEntry,
        },
        409,
      )
    }

    // Create waitlist entry
    const waitlistEntry: IWaitlistEntry = {
      fid,
      username,
      email,
      requestedAmount,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const savedEntry = await inMemoryStore.saveWaitlistEntry(waitlistEntry)

    return c.json({
      success: true,
      message: 'Successfully added to waitlist',
      data: savedEntry,
    })
  } catch (error) {
    console.error('Waitlist signup error:', error)
    return c.json({ success: false, error: 'Failed to join waitlist' }, 500)
  }
})

/**
 * GET /api/waitlist/status/:fid
 * Get waitlist status for a user
 */
router.get('/status/:fid', async (c) => {
  try {
    const fid = parseInt(c.req.param('fid'), 10)

    if (Number.isNaN(fid)) {
      return c.json({ success: false, error: 'Invalid FID' }, 400)
    }

    const waitlistEntry = await inMemoryStore.findWaitlistEntry(fid)

    if (!waitlistEntry) {
      return c.json({ success: false, error: 'User not on waitlist' }, 404)
    }

    // Calculate position in waitlist (simple implementation)
    const allEntries = await inMemoryStore.getAllWaitlistEntries()
    const pendingEntries = allEntries
      .filter((entry) => entry.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    const position = pendingEntries.findIndex((entry) => entry.fid === fid) + 1

    return c.json({
      success: true,
      data: {
        ...waitlistEntry,
        position: position > 0 ? position : null,
        totalPending: pendingEntries.length,
      },
    })
  } catch (error) {
    console.error('Waitlist status error:', error)
    return c.json(
      { success: false, error: 'Failed to get waitlist status' },
      500,
    )
  }
})

/**
 * GET /api/waitlist/stats
 * Get waitlist statistics
 */
router.get('/stats', async (c) => {
  try {
    const allEntries = await inMemoryStore.getAllWaitlistEntries()

    const stats = {
      total: allEntries.length,
      pending: allEntries.filter((entry) => entry.status === 'pending').length,
      approved: allEntries.filter((entry) => entry.status === 'approved')
        .length,
      rejected: allEntries.filter((entry) => entry.status === 'rejected')
        .length,
      totalRequestedAmount: allEntries.reduce(
        (sum, entry) => sum + entry.requestedAmount,
        0,
      ),
      averageRequestedAmount:
        allEntries.length > 0
          ? allEntries.reduce((sum, entry) => sum + entry.requestedAmount, 0) /
            allEntries.length
          : 0,
    }

    return c.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Waitlist stats error:', error)
    return c.json(
      { success: false, error: 'Failed to get waitlist stats' },
      500,
    )
  }
})

export { router as waitlistRoutes }
