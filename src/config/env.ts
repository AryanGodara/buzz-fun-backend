import { z } from 'zod'

// Define environment variables schema for Cloudflare Workers
const envSchema = z.object({
  // Neynar API
  NEYNAR_API_KEY: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,https://buzzbase.fun'),
})

// Cloudflare Workers bindings type
export type Bindings = {
  NEYNAR_API_KEY?: string
  ALLOWED_ORIGINS?: string
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

// For local development fallback (when process.env is available)
export const env = (() => {
  try {
    return envSchema.parse({
      NEYNAR_API_KEY: process.env.NEYNAR_API_KEY,
      ALLOWED_ORIGINS:
        process.env.ALLOWED_ORIGINS ||
        'http://localhost:3000,https://buzzbase.fun',
    })
  } catch {
    // Return defaults for development
    return {
      NEYNAR_API_KEY: undefined,
      ALLOWED_ORIGINS: 'http://localhost:3000,https://buzzbase.fun',
    }
  }
})()
