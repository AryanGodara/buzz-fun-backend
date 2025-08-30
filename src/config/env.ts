import { z } from 'zod'

// Cloudflare Workers KV namespace type
declare global {
  interface KVNamespace {
    get(key: string): Promise<string | null>
    put(key: string, value: string): Promise<void>
  }
}

// Define environment variables schema for Cloudflare Workers
const envSchema = z.object({
  // Neynar API
  NEYNAR_API_KEY: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,https://buzzbase.fun'),

  // Firebase (web config - not secrets)
  FIREBASE_API_KEY: z.string().optional(),
  FIREBASE_AUTH_DOMAIN: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_APP_ID: z.string().optional(),
  FIREBASE_MEASUREMENT_ID: z.string().optional(),

  // Firebase Admin SDK (service account key as JSON string)
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),

  // KV Store for JWT caching (required by @hono/firebase-auth)
  PUBLIC_JWK_CACHE_KEY: z.string().optional(),
})

// Cloudflare Workers bindings type
export type Bindings = {
  NEYNAR_API_KEY?: string
  ALLOWED_ORIGINS?: string
  FIREBASE_API_KEY?: string
  FIREBASE_AUTH_DOMAIN?: string
  FIREBASE_DATABASE_URL?: string
  FIREBASE_PROJECT_ID?: string
  FIREBASE_STORAGE_BUCKET?: string
  FIREBASE_MESSAGING_SENDER_ID?: string
  FIREBASE_APP_ID?: string
  FIREBASE_MEASUREMENT_ID?: string
  FIREBASE_SERVICE_ACCOUNT_KEY?: string
  PUBLIC_JWK_CACHE_KEY?: string
  PUBLIC_JWK_CACHE_KV?: KVNamespace
}

/**
 * Validate environment variables from Cloudflare Workers bindings
 * @param bindings Cloudflare Workers bindings object
 * @returns Validated environment variables
 */
export function validateEnv(bindings: Bindings) {
  const _env = envSchema.safeParse(bindings)

  if (!_env.success) {
    console.error('❌ Invalid environment variables:', _env.error.format())
    throw new Error('Invalid environment variables')
  }

  return _env.data
}

/**
 * Get Neynar API key from bindings with validation
 * @param bindings Cloudflare Workers bindings object
 * @returns Neynar API key or throws error
 */
export function getNeynarApiKey(bindings: Bindings): string {
  const apiKey = bindings.NEYNAR_API_KEY
  if (!apiKey) {
    throw new Error('NEYNAR_API_KEY not configured')
  }
  return apiKey
}

// For local development fallback (when process.env is available)
export const env = (() => {
  try {
    return envSchema.parse({
      NEYNAR_API_KEY: process.env.NEYNAR_API_KEY,
      ALLOWED_ORIGINS:
        process.env.ALLOWED_ORIGINS ||
        'http://localhost:3000,https://buzzbase.fun',
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
      FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    })
  } catch {
    // Return defaults for development
    return {
      NEYNAR_API_KEY: undefined,
      ALLOWED_ORIGINS: 'http://localhost:3000,https://buzzbase.fun',
      FIREBASE_API_KEY: undefined,
      FIREBASE_AUTH_DOMAIN: undefined,
      FIREBASE_DATABASE_URL: undefined,
      FIREBASE_PROJECT_ID: undefined,
      FIREBASE_STORAGE_BUCKET: undefined,
      FIREBASE_MESSAGING_SENDER_ID: undefined,
      FIREBASE_APP_ID: undefined,
      FIREBASE_MEASUREMENT_ID: undefined,
      FIREBASE_SERVICE_ACCOUNT_KEY: undefined,
    }
  }
})()
