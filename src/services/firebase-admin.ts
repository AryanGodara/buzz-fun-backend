import { getFirebaseToken } from '@hono/firebase-auth'
import type { Context } from 'hono'
import type { Bindings } from '../config/env'

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

/**
 * Get data from Firebase Realtime Database
 */
export async function getFromFirebase(
  bindings: Bindings,
  path: string,
): Promise<any | null> {
  try {
    const databaseUrl = bindings.FIREBASE_DATABASE_URL
    const databaseSecret = bindings.FIREBASE_DATABASE_SECRET

    if (!databaseUrl) {
      return null
    }

    let firebaseUrl = `${databaseUrl}/${path}.json`
    if (databaseSecret) {
      firebaseUrl += `?auth=${databaseSecret}`
    }

    const response = await fetch(firebaseUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      return null
    }
  } catch (error) {
    console.error('❌ Firebase read error:', error)
    return null
  }
}

/**
 * Save data to Firebase Realtime Database with admin privileges
 * Uses database secret for admin access (bypasses security rules)
 */
export async function saveToFirebase(
  bindings: Bindings,
  path: string,
  data: any,
): Promise<boolean> {
  try {
    const databaseUrl = bindings.FIREBASE_DATABASE_URL
    const databaseSecret = bindings.FIREBASE_DATABASE_SECRET

    if (!databaseUrl) {
      console.warn('Firebase database URL not configured')
      return false
    }

    // Use database secret for admin authentication (bypasses security rules)
    let firebaseUrl = `${databaseUrl}/${path}.json`
    if (databaseSecret) {
      firebaseUrl += `?auth=${databaseSecret}`
    }

    const response = await fetch(firebaseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      console.log(`✅ Successfully saved to Firebase: ${path}`)
      return true
    } else {
      const errorText = await response.text()
      console.error(`❌ Firebase save failed (${response.status}):`, errorText)
      return false
    }
  } catch (error) {
    console.error('❌ Firebase save error:', error)
    return false
  }
}
