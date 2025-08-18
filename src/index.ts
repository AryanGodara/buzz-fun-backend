import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { connectToDatabase } from './config/db'
import { env } from './config/env'
import { apiRouter } from './routes/index'

// Initialize MongoDB connection (optional for testing)
if (env.MONGODB_URI) {
  connectToDatabase().catch((err: Error) => {
    console.warn('⚠️ MongoDB connection failed, running in test mode:', err.message)
  })
} else {
  console.log('⚠️ No MONGODB_URI provided, running without database')
}

// Create Hono app
const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use(
  '*',
  cors({
    origin: env.ALLOWED_ORIGINS.split(','),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  }),
)

// Health check endpoint
app.get('/', (c: any) => {
  return c.json({
    status: 'ok',
    message: 'Somurie API server is running',
    version: '0.1.0',
    features: ['Creator Score', 'Leaderboards', 'Loan Waitlist'],
  })
})

// Mount API routes
app.route('/api', apiRouter)

// Export the Hono app directly (Vercel-compatible)
export default app
