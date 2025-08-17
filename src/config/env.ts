import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables from .env file
dotenv.config()

// Define environment variables schema for validation
const envSchema = z.object({
  // Server
  PORT: z.string().default('4000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // MongoDB
  MONGODB_URI: z.string(),

  // Neynar
  NEYNAR_API_KEY: z.string(),

  // CORS
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,https://somurie.vercel.app'),
})

// Parse and validate environment variables
const _env = envSchema.safeParse(process.env)

// Handle validation errors
if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format())
  throw new Error('Invalid environment variables')
}

// Export validated environment variables
export const env = _env.data
