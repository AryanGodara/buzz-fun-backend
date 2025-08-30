import type { RawCreatorMetrics } from '../types'
import type { 
  BulkUsersResponse, 
  CastsResponse, 
  NeynarUser, 
  NeynarCast,
  RelevantFollowersResponse,
  BestFriendsResponse,
  UserInteractionsResponse,
  UserBalanceResponse,
  UserChannelsResponse
} from '../types/neynar'

/**
 * Enhanced Neynar service for the new scoring algorithm
 */
export class EnhancedNeynarService {
  private apiKey: string
  private baseUrl = 'https://api.neynar.com'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Fetch comprehensive raw creator metrics using all available v2 APIs
   */
  async fetchRawCreatorMetrics(fid: number): Promise<RawCreatorMetrics | null> {
    try {
      // Fetch all data in parallel for better performance
      const [
        userProfile,
        userCasts,
        relevantFollowers,
        bestFriends,
        userInteractions,
        userBalance,
        userChannels
      ] = await Promise.all([
        this.fetchUserProfile(fid),
        this.fetchUserCasts(fid, 200), // Increased limit for better analysis
        this.fetchRelevantFollowers(fid, 50),
        this.fetchBestFriends(fid),
        this.fetchUserInteractions(fid),
        this.fetchUserBalance(fid),
        this.fetchUserChannels(fid)
      ])

      if (!userProfile) {
        return null
      }

      // Calculate enhanced activity metrics
      const activity = this.calculateEnhancedActivityMetrics(userCasts, userProfile)
      
      // Calculate network metrics
      const networkMetrics = this.calculateNetworkMetrics(
        userProfile, 
        relevantFollowers, 
        bestFriends, 
        userInteractions
      )
      
      // Calculate financial metrics
      const financialMetrics = this.calculateFinancialMetrics(userBalance)

      return {
        profile: {
          fid: userProfile.fid,
          followers: userProfile.follower_count || 0,
          following: userProfile.following_count || 0,
          powerBadge: userProfile.power_badge || false,
          userQualityScore: userProfile.neynar_score || userProfile.experimental?.neynar_user_score || 0,
          verifications: userProfile.verifications || [],
          createdAt: userProfile.created_at || new Date().toISOString(),
          // Enhanced profile data
          verifiedAddresses: userProfile.verified_addresses,
          subscriptionsCreated: userProfile.subscriptions_created || 0,
          subscribedTo: userProfile.subscribed_to || 0,
          subscribers: userProfile.subscribers || 0,
        },
        casts: userCasts.map((cast) => ({
          hash: cast.hash,
          timestamp: cast.timestamp,
          likes: cast.reactions?.likes_count || 0,
          recasts: cast.reactions?.recasts_count || 0,
          replies: cast.replies?.count || 0,
          threadDepth: this.calculateThreadDepth(cast),
          hasChannel: !!cast.channel,
          channelFollowers: cast.channel ? 0 : 0, // Would need separate API call
          mentionsCount: cast.mentioned_profiles?.length || 0,
          embedsCount: cast.embeds?.length || 0,
        })),
        activity,
        networkMetrics,
        financialMetrics,
        channels: userChannels?.channels || [],
      }
    } catch (error) {
      console.error('Error fetching comprehensive creator metrics:', error)
      return null
    }
  }

  /**
   * Fetch user profile from Neynar
   */
  private async fetchUserProfile(fid: number): Promise<NeynarUser | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      if (!response.ok) {
        console.error(`Neynar user API error: ${response.status}`)
        return null
      }

      const data = await response.json() as BulkUsersResponse
      return data.users?.[0] || null
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  /**
   * Fetch user casts with enhanced limits
   */
  private async fetchUserCasts(
    fid: number,
    limit: number = 200, // Increased default limit
  ): Promise<NeynarCast[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/casts?fid=${fid}&limit=${Math.min(limit, 150)}&include_replies=true`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      if (!response.ok) {
        console.error(`Neynar casts API error: ${response.status}`)
        return []
      }

      const data = await response.json() as CastsResponse
      return data.casts || []
    } catch (error) {
      console.error('Error fetching user casts:', error)
      return []
    }
  }

  /**
   * Fetch relevant followers for network analysis
   */
  private async fetchRelevantFollowers(fid: number, limit: number = 50): Promise<NeynarUser[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/followers/relevant?fid=${fid}&limit=${limit}`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      if (!response.ok) {
        console.error(`Neynar relevant followers API error: ${response.status}`)
        return []
      }

      const data = await response.json() as RelevantFollowersResponse
      return data.users || []
    } catch (error) {
      console.error('Error fetching relevant followers:', error)
      return []
    }
  }

  /**
   * Fetch best friends for network quality analysis
   */
  private async fetchBestFriends(fid: number): Promise<BestFriendsResponse['users']> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/user/best_friends?fid=${fid}`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      if (!response.ok) {
        console.error(`Neynar best friends API error: ${response.status}`)
        return []
      }

      const data = await response.json() as BestFriendsResponse
      return data.users || []
    } catch (error) {
      console.error('Error fetching best friends:', error)
      return []
    }
  }

  /**
   * Fetch user interactions for engagement analysis
   */
  private async fetchUserInteractions(fid: number): Promise<UserInteractionsResponse['interactions']> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/user/interactions?fid=${fid}&limit=100`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      if (!response.ok) {
        console.error(`Neynar user interactions API error: ${response.status}`)
        return []
      }

      const data = await response.json() as UserInteractionsResponse
      return data.interactions || []
    } catch (error) {
      console.error('Error fetching user interactions:', error)
      return []
    }
  }

  /**
   * Fetch user token balances for financial analysis
   */
  private async fetchUserBalance(fid: number): Promise<UserBalanceResponse['balances']> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/user/balance?fid=${fid}`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      if (!response.ok) {
        console.error(`Neynar user balance API error: ${response.status}`)
        return []
      }

      const data = await response.json() as UserBalanceResponse
      return data.balances || []
    } catch (error) {
      console.error('Error fetching user balance:', error)
      return []
    }
  }

  /**
   * Fetch user channels for community analysis
   */
  private async fetchUserChannels(fid: number): Promise<UserChannelsResponse | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/user/channels?fid=${fid}`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      if (!response.ok) {
        console.error(`Neynar user channels API error: ${response.status}`)
        return null
      }

      const data = await response.json() as UserChannelsResponse
      return data
    } catch (error) {
      console.error('Error fetching user channels:', error)
      return null
    }
  }

  /**
   * Calculate enhanced activity metrics
   */
  private calculateEnhancedActivityMetrics(casts: NeynarCast[], profile: NeynarUser) {
    if (casts.length === 0) {
      return {
        lastActivity: new Date().toISOString(),
        activeDays: 0,
        totalCasts: 0,
        avgCastsPerDay: 0,
        replyRatio: 0,
        channelDiversity: 0,
      }
    }

    // Find last activity
    const lastActivity = casts[0]?.timestamp || new Date().toISOString()

    // Calculate active days in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentCasts = casts.filter(
      (cast) => new Date(cast.timestamp) > thirtyDaysAgo,
    )

    const uniqueDays = new Set(
      recentCasts.map(
        (cast) => new Date(cast.timestamp).toISOString().split('T')[0],
      ),
    )

    // Calculate reply ratio
    const replies = casts.filter(cast => cast.parent_hash || cast.parent_url)
    const replyRatio = casts.length > 0 ? replies.length / casts.length : 0

    // Calculate channel diversity
    const uniqueChannels = new Set(
      casts.filter(cast => cast.channel).map(cast => cast.channel!.id)
    )

    // Calculate average casts per day
    const accountAge = profile.created_at 
      ? Math.max(1, (Date.now() - new Date(profile.created_at).getTime()) / (24 * 60 * 60 * 1000))
      : 30
    const avgCastsPerDay = casts.length / Math.min(accountAge, 30)

    return {
      lastActivity,
      activeDays: uniqueDays.size,
      totalCasts: casts.length,
      avgCastsPerDay,
      replyRatio,
      channelDiversity: uniqueChannels.size,
    }
  }

  /**
   * Calculate network metrics from social data
   */
  private calculateNetworkMetrics(
    profile: NeynarUser,
    relevantFollowers: NeynarUser[],
    bestFriends: BestFriendsResponse['users'],
    interactions: UserInteractionsResponse['interactions']
  ) {
    // Calculate follower quality score based on relevant followers
    const relevantFollowerScore = relevantFollowers.reduce((score, follower) => {
      return score + (follower.power_badge ? 2 : 1) + (follower.neynar_score || 0)
    }, 0) / Math.max(relevantFollowers.length, 1)

    // Calculate best friends affinity
    const avgAffinityScore = bestFriends.length > 0 
      ? bestFriends.reduce((sum, friend) => sum + friend.mutual_affinity_score, 0) / bestFriends.length
      : 0

    // Calculate interaction diversity
    const interactionTypes = new Set(interactions.map(i => i.interaction_type))
    const totalInteractions = interactions.reduce((sum, i) => sum + i.count, 0)

    return {
      relevantFollowersCount: relevantFollowers.length,
      relevantFollowerScore,
      bestFriendsCount: bestFriends.length,
      avgAffinityScore,
      interactionDiversity: interactionTypes.size,
      totalInteractions,
      followerToFollowingRatio: profile.following_count > 0 
        ? profile.follower_count / profile.following_count 
        : profile.follower_count
    }
  }

  /**
   * Calculate financial metrics from token balances
   */
  private calculateFinancialMetrics(balances: UserBalanceResponse['balances']) {
    const totalUsdValue = balances.reduce((sum, balance) => {
      return sum + (balance.usd_value || 0)
    }, 0)

    const uniqueChains = new Set(balances.map(b => b.chain))
    const tokenCount = balances.length

    return {
      totalUsdValue,
      tokenCount,
      chainDiversity: uniqueChains.size,
      hasSignificantBalance: totalUsdValue > 100, // $100+ threshold
    }
  }

  /**
   * Calculate thread depth more accurately
   */
  private calculateThreadDepth(cast: NeynarCast): number {
    if (!cast.parent_hash && !cast.parent_url) return 0
    if (cast.thread_hash && cast.thread_hash !== cast.hash) return 1
    return cast.parent_hash ? 1 : 0
  }
}

// Export factory function
export const createEnhancedNeynarService = (apiKey: string) =>
  new EnhancedNeynarService(apiKey)
