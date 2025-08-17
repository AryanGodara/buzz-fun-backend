import mongoose from 'mongoose'
import { env } from './env'

// Configure mongoose options
mongoose.set('strictQuery', false)

// Use connection options that are compatible with TypeScript types
const options: mongoose.ConnectOptions = {
  autoIndex: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000, // Increased for better reliability
  socketTimeoutMS: 60000, // Increased for better reliability
  connectTimeoutMS: 30000, // Added for better connection handling
  heartbeatFrequencyMS: 10000, // Added for better connection stability
}

/**
 * Connect to MongoDB with retries
 */
export async function connectToDatabase(retries = 3): Promise<void> {
  try {
    // Check if we're already connected
    if (mongoose.connection.readyState === 1) {
      console.log('🟢 MongoDB already connected')
      return
    }

    // Try to connect
    await mongoose.connect(env.MONGODB_URI, options)
    console.log('🟢 MongoDB connected successfully')

    // Set up event listeners for the connection
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('🔴 MongoDB disconnected')
    })

    // Setup automatic reconnection
    mongoose.connection.on('disconnected', async () => {
      if (retries > 0) {
        console.log(
          `🔄 Attempting to reconnect to MongoDB (${retries} retries left)...`,
        )
        try {
          await connectToDatabase(retries - 1)
        } catch (_error) {
          console.error('❌ Failed to reconnect to MongoDB')
        }
      }
    })
  } catch (error) {
    // Handle connection error
    console.error(
      '❌ MongoDB connection error:',
      error instanceof Error ? error.message : String(error),
    )

    // Retry logic
    if (retries > 0) {
      const retryDelay = 5000 // 5 seconds
      console.log(
        `🔄 Retrying connection in ${retryDelay / 1000}s (${retries} retries left)...`,
      )
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
      return connectToDatabase(retries - 1)
    }

    throw error // Let the caller handle process exit if needed
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  try {
    await mongoose.disconnect()
    console.log('🟠 MongoDB disconnected')
  } catch (error) {
    console.error(
      '❌ Failed to disconnect from MongoDB:',
      error instanceof Error ? error.message : String(error),
    )
    throw error // Let the caller handle process exit if needed
  }
}
