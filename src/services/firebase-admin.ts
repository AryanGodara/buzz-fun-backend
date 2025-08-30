import { getFirebaseToken } from '@hono/firebase-auth'
import type { Context } from 'hono'

/**
 * Get Firebase token from request context (optional)
 * Returns null if no valid token is present
 * Use this for optional authentication in API routes
 */
export function getOptionalAuthUser(c: Context) {
  try {
    return getFirebaseToken(c)
  } catch {
    return null
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(c: Context): boolean {
  try {
    const token = getFirebaseToken(c)
    return !!token
  } catch {
    return false
  }
}
