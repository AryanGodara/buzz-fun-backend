/**
 * Interface for Cast metrics
 */
export interface CastMetrics {
  hash: string
  timestamp: Date
  likes: number
  recasts: number
  replies: number
}

/**
 * Interface for Creator metrics
 */
export interface CreatorMetrics {
  fid: number
  username: string
  followerCount: number
  followingCount: number
  powerBadge: boolean
  neynarScore: number
  casts: CastMetrics[]
  engagementRate: number
  postingFrequency: number
  growthRate: number
  viralCoefficient: number
  networkScore: number
}

/**
 * Interface for score component values
 */
export interface IScoreComponents extends Record<string, number> {
  engagement: number
  consistency: number
  growth: number
  quality: number
  network: number
}

/**
 * Interface for creator score (replacing MongoDB model)
 */
export interface ICreatorScore {
  _id?: string
  shareableId: string
  creatorFid: number
  overallScore: number
  percentileRank: number
  tier: number
  components: IScoreComponents
  scoreDate: Date
  validUntil: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Interface for creator info (replacing MongoDB model)
 */
export interface ICreator {
  _id?: string
  fid: number
  username: string
  displayName?: string
  followerCount: number
  followingCount: number
  powerBadge: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Interface for waitlist entry (replacing MongoDB model)
 */
export interface IWaitlistEntry {
  _id?: string
  fid: number
  username: string
  email?: string
  requestedAmount: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
  updatedAt: Date
}

/**
 * Interface for score calculation result
 */
export interface ScoreResult {
  fid: number
  overallScore: number
  percentileRank: number
  tier: number
  components: IScoreComponents
  timestamp: Date
  validUntil: Date
}

// Re-export Bindings from config for consistency
export type { Bindings } from '../config/env'
