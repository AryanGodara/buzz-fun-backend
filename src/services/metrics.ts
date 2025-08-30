import type { CalculatedMetrics, RawCreatorMetrics } from '../types'

/**
 * Calculate engagement score (0-100)
 * Enhanced with network interactions and cast quality metrics
 */
export function calculateEngagementScore(
  rawMetrics: RawCreatorMetrics,
): number {
  const { profile, casts, networkMetrics } = rawMetrics

  if (casts.length === 0) return 0

  const followerCount = Math.max(profile.followers, 100) // Minimum 100 to avoid division issues

  // Calculate engagement rate per cast with enhanced weighting
  const engagementRates = casts.map((cast) => {
    const totalEngagements = 
      cast.likes + 
      cast.recasts * 1.5 + 
      cast.replies * 2 + 
      (cast.mentionsCount || 0) * 0.5 + // Mentions indicate reach
      (cast.hasChannel ? 1.2 : 1) // Channel posts get slight boost
    
    const engagementRate = (totalEngagements / followerCount) * 100
    return Math.min(engagementRate, 100) // Cap at 100%
  })

  // Weight recent casts higher (assuming casts are sorted by recency)
  const weightedEngagement =
    engagementRates.reduce((sum, rate, index) => {
      const weight = Math.exp(-index / 15) // Slightly slower decay for more data
      return sum + rate * weight
    }, 0) / engagementRates.length

  // Boost for high-performing casts (top 10% threshold)
  const sortedRates = [...engagementRates].sort((a, b) => b - a)
  const top10Threshold = sortedRates[Math.floor(sortedRates.length * 0.1)] || 0
  const viralBonus =
    engagementRates.filter((rate) => rate > top10Threshold).length * 2

  // Network interaction bonus
  const networkBonus = networkMetrics ? 
    Math.min((networkMetrics.totalInteractions / 1000) * 5, 10) : 0

  // Interaction diversity bonus
  const diversityBonus = networkMetrics ? 
    networkMetrics.interactionDiversity * 2 : 0

  return Math.min(weightedEngagement + viralBonus + networkBonus + diversityBonus, 100)
}

/**
 * Calculate consistency score (0-100)
 * Enhanced with channel diversity and reply patterns
 */
export function calculateConsistencyScore(
  rawMetrics: RawCreatorMetrics,
): number {
  const { casts, activity } = rawMetrics

  if (casts.length === 0) return 0

  // Calculate posting frequency over last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentCasts = casts.filter(
    (cast) => new Date(cast.timestamp) > thirtyDaysAgo,
  )

  if (recentCasts.length === 0) return 0

  // Activity rate (percentage of days active)
  const activityRate = (activity.activeDays / 30) * 100

  // Posting regularity - calculate gaps between posts
  const timestamps = recentCasts
    .map((cast) => new Date(cast.timestamp).getTime())
    .sort()
  const gaps = []
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push((timestamps[i] - timestamps[i - 1]) / (24 * 60 * 60 * 1000)) // Days between posts
  }

  // Calculate standard deviation of gaps (lower = more regular)
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const variance =
    gaps.reduce((sum, gap) => sum + (gap - avgGap) ** 2, 0) / gaps.length
  const stdDev = Math.sqrt(variance)

  // Convert to regularity score (inverse of standard deviation)
  const regularityScore = Math.max(0, 100 - stdDev * 5)

  // Channel diversity bonus (consistent posting across channels)
  const channelDiversityBonus = activity.channelDiversity ? 
    Math.min(activity.channelDiversity * 3, 15) : 0

  // Reply ratio consistency (balanced original vs reply content)
  const idealReplyRatio = 0.3 // 30% replies is considered healthy
  const replyRatioScore = activity.replyRatio !== undefined ? 
    Math.max(0, 100 - Math.abs((activity.replyRatio - idealReplyRatio) * 100)) : 50

  // Weighted combination with enhanced factors
  return Math.min(
    activityRate * 0.5 + 
    regularityScore * 0.3 + 
    channelDiversityBonus * 0.1 + 
    replyRatioScore * 0.1, 
    100
  )
}

/**
 * Calculate growth score (0-100)
 * Based on follower growth and engagement trends
 */
export function calculateGrowthScore(rawMetrics: RawCreatorMetrics): number {
  const { profile, casts } = rawMetrics

  // For now, use a simplified approach based on recent activity
  // In a full implementation, we'd need historical data

  const accountAge = Math.max(
    1,
    (Date.now() - new Date(profile.createdAt).getTime()) /
      (24 * 60 * 60 * 1000),
  )
  const castsPerDay = casts.length / Math.min(accountAge, 30)

  // Growth proxy: posting frequency + engagement momentum
  const recentEngagement =
    casts
      .slice(0, 10)
      .reduce(
        (sum, cast) => sum + cast.likes + cast.recasts + cast.replies,
        0,
      ) / Math.min(casts.length, 10)

  // Normalize by account age (newer accounts get boost)
  const ageMultiplier = accountAge < 90 ? 1.5 : 1.0

  // Simple growth score based on activity and engagement
  const baseScore = Math.min(castsPerDay * 10 + recentEngagement / 10, 80)

  return Math.min(baseScore * ageMultiplier, 100)
}

/**
 * Calculate quality score (0-100)
 * Enhanced with financial backing, subscriptions, and content richness
 */
export function calculateQualityScore(rawMetrics: RawCreatorMetrics): number {
  const { profile, casts, financialMetrics, channels } = rawMetrics

  // Base score from Neynar's quality score (0-1 scale)
  const neynarQuality = profile.userQualityScore * 40 // Reduced weight to make room for other factors

  // Content depth and richness score
  const avgThreadDepth =
    casts.reduce((sum, cast) => sum + (cast.threadDepth || 0), 0) / casts.length
  const avgMentions = 
    casts.reduce((sum, cast) => sum + (cast.mentionsCount || 0), 0) / casts.length
  const avgEmbeds = 
    casts.reduce((sum, cast) => sum + (cast.embedsCount || 0), 0) / casts.length
  
  const contentRichness = Math.min(
    avgThreadDepth * 10 + avgMentions * 5 + avgEmbeds * 3, 
    20
  )

  // Verification and credential score
  const verificationScore =
    (profile.powerBadge ? 12 : 0) +
    Math.min(profile.verifications.length * 4, 12) +
    Math.min((profile.verifiedAddresses?.eth_addresses.length || 0) * 2, 8)

  // Financial credibility (token holdings, verified addresses)
  const financialCredibility = financialMetrics ? 
    Math.min(
      (financialMetrics.hasSignificantBalance ? 8 : 0) +
      financialMetrics.chainDiversity * 2 +
      (financialMetrics.tokenCount > 5 ? 4 : 0),
      15
    ) : 0

  // Creator economy participation
  const creatorEconomyScore = Math.min(
    (profile.subscriptionsCreated || 0) * 3 +
    (profile.subscribers || 0) * 0.1 +
    (channels?.filter(c => c.role === 'owner').length || 0) * 5,
    15
  )

  // Engagement quality (conversation starter vs broadcaster)
  const totalLikes = casts.reduce((sum, cast) => sum + cast.likes, 0)
  const totalReplies = casts.reduce((sum, cast) => sum + cast.replies, 0)
  const conversationScore =
    totalLikes > 0 ? Math.min((totalReplies / totalLikes) * 15, 10) : 0

  // Weighted combination
  return Math.min(
    neynarQuality + contentRichness + verificationScore + 
    financialCredibility + creatorEconomyScore + conversationScore,
    100,
  )
}

/**
 * Calculate network score (0-100)
 * Enhanced with relevant followers, best friends, and financial backing
 */
export function calculateNetworkScore(rawMetrics: RawCreatorMetrics): number {
  const { profile, networkMetrics, financialMetrics, channels } = rawMetrics

  // Base follower score (logarithmic scale)
  const followerScore = Math.min(
    Math.log10(Math.max(profile.followers, 1)) * 12,
    50,
  )

  // Relevant followers quality score
  const relevantFollowerScore = networkMetrics ? 
    Math.min(networkMetrics.relevantFollowerScore * 10, 25) : 0

  // Best friends network strength
  const bestFriendsScore = networkMetrics ? 
    Math.min(
      networkMetrics.bestFriendsCount * 2 + 
      networkMetrics.avgAffinityScore * 10, 
      20
    ) : 0

  // Follower-to-following ratio (selective following indicates influence)
  const followRatio = networkMetrics?.followerToFollowingRatio || 
    (profile.following > 0 ? profile.followers / profile.following : 1)
  const ratioScore = Math.min(Math.log10(Math.max(followRatio, 0.1)) * 10 + 10, 15)

  // Financial backing score (token holdings indicate network value)
  const financialScore = financialMetrics ? 
    Math.min(
      (financialMetrics.hasSignificantBalance ? 10 : 0) +
      financialMetrics.chainDiversity * 2 +
      Math.log10(Math.max(financialMetrics.totalUsdValue, 1)) * 2,
      15
    ) : 0

  // Channel leadership score
  const channelScore = channels ? 
    channels.reduce((score, channel) => {
      const roleMultiplier = channel.role === 'owner' ? 3 : 
                           channel.role === 'moderator' ? 2 : 1
      return score + Math.min(Math.log10(channel.follower_count) * roleMultiplier, 5)
    }, 0) : 0

  // Quality multipliers
  const qualityMultiplier = 1 + 
    (profile.powerBadge ? 0.15 : 0) + 
    profile.verifications.length * 0.05 +
    (profile.verifiedAddresses?.eth_addresses.length || 0) * 0.02

  const baseScore = followerScore + relevantFollowerScore + bestFriendsScore + 
                   ratioScore + financialScore + Math.min(channelScore, 10)

  return Math.min(baseScore * qualityMultiplier, 100)
}

/**
 * Calculate all metrics for a creator
 */
export function calculateAllMetrics(
  rawMetrics: RawCreatorMetrics,
): CalculatedMetrics {
  return {
    engagement: calculateEngagementScore(rawMetrics),
    consistency: calculateConsistencyScore(rawMetrics),
    growth: calculateGrowthScore(rawMetrics),
    quality: calculateQualityScore(rawMetrics),
    network: calculateNetworkScore(rawMetrics),
  }
}
