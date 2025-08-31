import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import type { FirebaseAuthBindings } from './config/firebase'
import { apiRouter } from './routes'

// Create Hono app with Firebase Auth bindings
const app = new Hono<{ Bindings: FirebaseAuthBindings }>()

// Middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use(
  '*',
  cors({
    origin: '*', // Allow all origins for development
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: false, // Set to false when using wildcard origin
  }),
)

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'Buzz Fun API server is running on Cloudflare Workers',
    version: '0.2.0',
    features: ['Creator Score', 'Leaderboards', 'Loan Waitlist'],
  })
})

// Mount API routes
app.route('/api', apiRouter)

export default app
