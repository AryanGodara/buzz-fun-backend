import type {
  VerifyFirebaseAuthConfig,
  VerifyFirebaseAuthEnv,
} from '@hono/firebase-auth'
import type { Bindings } from './env'

export type FirebaseConfig = {
  apiKey: string
  authDomain: string
  databaseURL?: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
  measurementId?: string
}

/**
 * Returns Firebase web config assembled from environment bindings.
 * Returns null if required fields are missing.
 */
export function getFirebaseConfig(
  bindings: Bindings | Record<string, string | undefined>,
): FirebaseConfig | null {
  const apiKey = bindings.FIREBASE_API_KEY
  const authDomain = bindings.FIREBASE_AUTH_DOMAIN
  const projectId = bindings.FIREBASE_PROJECT_ID
  const appId = bindings.FIREBASE_APP_ID

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null
  }

  return {
    apiKey,
    authDomain,
    databaseURL: bindings.FIREBASE_DATABASE_URL,
    projectId,
    storageBucket: bindings.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: bindings.FIREBASE_MESSAGING_SENDER_ID,
    appId,
    measurementId: bindings.FIREBASE_MEASUREMENT_ID,
  }
}

/**
 * Returns Firebase Auth config for @hono/firebase-auth middleware
 */
export function getFirebaseAuthConfig(
  bindings: Bindings,
): VerifyFirebaseAuthConfig | null {
  const projectId = bindings.FIREBASE_PROJECT_ID

  if (!projectId) {
    return null
  }

  return {
    projectId,
    authorizationHeaderKey: 'Authorization',
    disableErrorLog: false,
  }
}

/**
 * Extended bindings type for Firebase Auth
 */
export type FirebaseAuthBindings = VerifyFirebaseAuthEnv & Bindings
