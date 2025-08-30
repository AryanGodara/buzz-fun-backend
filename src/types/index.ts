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
 * Credit rating tiers
 */
export type CreditTier = 'D' | 'C' | 'B' | 'BB' | 'BBB' | 'A' | 'AA' | 'AAA'

/**
 * Interface for tier information
 */
export interface TierInfo {
  tier: CreditTier
  minScore: number
  maxScore: number
  description: string
  percentile: string
}

/**
 * Raw metrics from Neynar API (Enhanced)
 */
export interface RawCreatorMetrics {
  profile: {
    fid: number
    followers: number
    following: number
    powerBadge: boolean
    userQualityScore: number
    verifications: string[]
    createdAt: string
    // Enhanced profile data
    verifiedAddresses?: {
      eth_addresses: string[]
      sol_addresses: string[]
      primary: {
        eth_address: string | null
        sol_address: string | null
      }
    }
    subscriptionsCreated?: number
    subscribedTo?: number
    subscribers?: number
  }
  casts: Array<{
    hash: string
    timestamp: string
    likes: number
    recasts: number
    replies: number
    threadDepth?: number
    hasChannel?: boolean
    channelFollowers?: number
    mentionsCount?: number
    embedsCount?: number
  }>
  activity: {
    lastActivity: string
    activeDays: number
    totalCasts: number
    avgCastsPerDay?: number
    replyRatio?: number
    channelDiversity?: number
  }
  networkMetrics?: {
    relevantFollowersCount: number
    relevantFollowerScore: number
    bestFriendsCount: number
    avgAffinityScore: number
    interactionDiversity: number
    totalInteractions: number
    followerToFollowingRatio: number
  }
  financialMetrics?: {
    totalUsdValue: number
    tokenCount: number
    chainDiversity: number
    hasSignificantBalance: boolean
  }
  channels?: Array<{
    id: string
    name: string
    description: string
    follower_count: number
    role?: 'owner' | 'moderator' | 'member'
  }>
}

/**
 * Calculated metric scores (0-100 scale)
 */
export interface CalculatedMetrics {
  engagement: number
  consistency: number
  growth: number
  quality: number
  network: number
}

/**
 * Interface for score calculation result
 */
export interface ScoreResult {
  fid: number
  overallScore: number
  percentileRank: number
  tier: CreditTier
  components: IScoreComponents
  rawMetrics?: RawCreatorMetrics
  timestamp: Date
  validUntil: Date
}

// Re-export Bindings from config for consistency
export type { Bindings } from '../config/env'
