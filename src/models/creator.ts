import mongoose, { type Document, Schema } from 'mongoose'

/**
 * Interface representing a Creator document in MongoDB
 */
export interface ICreator extends Document {
  fid: number
  username: string
  followerCount: number
  followingCount: number
  powerBadge: boolean
  neynarScore: number
  updatedAt: Date
  createdAt: Date
}

/**
 * Creator schema for MongoDB
 */
const creatorSchema = new Schema(
  {
    // Farcaster ID (unique identifier)
    fid: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    // Farcaster username
    username: {
      type: String,
      required: true,
      // Index is created explicitly below
    },

    // Follower statistics
    followerCount: {
      type: Number,
      default: 0,
    },

    // Following count
    followingCount: {
      type: Number,
      default: 0,
    },

    // Indicates if user has power badge
    powerBadge: {
      type: Boolean,
      default: false,
    },

    // Neynar score (0-100)
    neynarScore: {
      type: Number,
      default: 0,
    },
  },
  {
    // Add createdAt and updatedAt timestamps
    timestamps: true,

    // Optimize for reads (this collection will be read frequently)
    collection: 'creators',
  },
)

// Create indexes for faster queries
creatorSchema.index({ username: 1 })
creatorSchema.index({ followerCount: -1 })
creatorSchema.index({ neynarScore: -1 })

// Create model
export const Creator = mongoose.model<ICreator>('Creator', creatorSchema)
