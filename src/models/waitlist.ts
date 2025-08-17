import mongoose, { type Document, Schema } from 'mongoose'

/**
 * Interface representing a Loan Waitlist document in MongoDB
 */
export interface IWaitlist extends Document {
  fid: number
  email: string
  joinedAt: Date
  position: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Loan Waitlist schema for MongoDB
 */
const waitlistSchema = new Schema(
  {
    // Reference to Creator by Farcaster ID
    fid: {
      type: Number,
      required: true,
      unique: true,
      ref: 'Creator',
      index: true,
    },

    // Contact email
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // Time joined waitlist
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Position in waitlist (auto-incremented)
    position: {
      type: Number,
      default: 0,
    },
  },
  {
    // Add createdAt and updatedAt timestamps
    timestamps: true,

    // Collection name
    collection: 'loan_waitlist',
  },
)

// Pre-save hook to set position
waitlistSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Count all existing waitlist entries to determine position
    const count = await mongoose.model('Waitlist').countDocuments()
    this.position = count + 1
  }
  next()
})

// Create model
export const Waitlist = mongoose.model<IWaitlist>('Waitlist', waitlistSchema)
