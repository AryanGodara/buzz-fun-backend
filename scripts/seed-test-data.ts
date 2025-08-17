import mongoose from 'mongoose'
import { env } from '../src/config/env'
import { Creator } from '../src/models/creator'
import { CreatorScore } from '../src/models/creatorScore'
import { nanoid } from 'nanoid'

// Sample Farcaster IDs for seeding
const SAMPLE_FIDS = [
  300, // vitalik.eth
  2, // dwr.eth
  60, // jessewldn.eth
  6378, // pfista.eth
  5650, // v.eth
  13111, // linda
  19366, // cryptogucci
  1791, // zachterrell
  // Add more well-known FIDs as needed
]

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(env.MONGODB_URI)
    console.log('Connected to MongoDB')
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    process.exit(1)
  }
}

// Generate random score data
function generateRandomScore(fid: number) {
  // Set valid until date to 7 days in future
  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 7)
  
  return {
    creatorFid: fid,
    overallScore: Math.floor(Math.random() * 100),
    percentileRank: Math.floor(Math.random() * 100),
    tier: Math.floor(Math.random() * 5) + 1,
    components: {
      engagement: Math.floor(Math.random() * 100),
      consistency: Math.floor(Math.random() * 100),
      growth: Math.floor(Math.random() * 100),
      quality: Math.floor(Math.random() * 100),
      network: Math.floor(Math.random() * 100)
    },
    scoreDate: new Date(),
    validUntil: validUntil,
    shareableId: nanoid(8),
  }
}

// Seed creators and scores
async function seedTestData() {
  try {
    // Clear existing data
    await Creator.deleteMany({})
    await CreatorScore.deleteMany({})
    
    console.log('Creating test data...')
    
    for (const fid of SAMPLE_FIDS) {
      // Create creator
      const creator = await Creator.create({
        fid,
        username: `test_user_${fid}`,
        followerCount: Math.floor(Math.random() * 10000),
        followingCount: Math.floor(Math.random() * 1000),
        isActive: true,
        lastUpdated: new Date(),
      })
      
      console.log(`Created creator with FID ${fid}`)
      
      // Create score for today
      const scoreData = generateRandomScore(fid)
      const score = await CreatorScore.create(scoreData)
      
      console.log(`Created score for FID ${fid}`)
      
      // Optionally create historical scores for the past week
      const pastDates = [1, 2, 3, 4, 5, 6, 7]
      for (const days of pastDates) {
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - days)
        
        const historicalScore = generateRandomScore(fid)
        // Override the score date to be in the past
        historicalScore.scoreDate = pastDate
        await CreatorScore.create(historicalScore)
      }
    }
    
    console.log('✅ Test data created successfully!')
  } catch (error) {
    console.error('Error seeding test data:', error)
  }
}

// Run the seeder
async function main() {
  await connectToDatabase()
  await seedTestData()
  
  // Disconnect from database
  await mongoose.disconnect()
  console.log('Database connection closed')
}

main().catch(console.error)
