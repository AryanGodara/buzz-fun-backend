import mongoose, { type Document, Schema } from 'mongoose'
import { nanoid } from 'nanoid'

/**
 * Interface representing Creator Score components
 */
export interface IScoreComponents extends Record<string, number> {
  engagement: number
  consistency: number
  growth: number
  quality: number
  network: number
}

/**
 * Interface representing a Creator Score document in MongoDB
 */
export interface ICreatorScore extends Document {
  creatorFid: number
  overallScore: number
  percentileRank: number
  tier: number
  components: IScoreComponents
  scoreDate: Date
  validUntil: Date
  shareableId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Creator Score schema for MongoDB
 */
const creatorScoreSchema = new Schema(
  {
    // Reference to Creator by Farcaster ID
    creatorFid: {
      type: Number,
      required: true,
      ref: 'Creator',
      index: true,
    },

    // Overall score (0-100)
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Percentile rank (0-100)
    percentileRank: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Tier level (1-6)
    tier: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },

    // Component scores
    components: {
      engagement: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      consistency: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      growth: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      quality: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      network: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
    },

    // Date the score was calculated
    scoreDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Date until which the score is valid
    validUntil: {
      type: Date,
      required: true,
    },

    // Shareable ID for public links
    shareableId: {
      type: String,
      default: () => nanoid(10),
      unique: true,
    },
  },
  {
    // Add createdAt and updatedAt timestamps
    timestamps: true,

    // Optimize for reads (this collection will be read frequently)
    collection: 'creator_scores',
  },
)

// Create compound index for creator and date
creatorScoreSchema.index({ creatorFid: 1, scoreDate: -1 }, { unique: true })

// Create index for leaderboard queries
creatorScoreSchema.index({ scoreDate: -1, overallScore: -1 })
creatorScoreSchema.index({ tier: -1, overallScore: -1 })

// Create model
export const CreatorScore = mongoose.model<ICreatorScore>(
  'CreatorScore',
  creatorScoreSchema,
)
