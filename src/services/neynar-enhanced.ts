import type {
  NeynarUser,
  NeynarCast,
  CastsResponse,
  RelevantFollowersResponse,
  BestFriendsResponse,
  UserInteractionsResponse,
  UserBalanceResponse,
  UserChannelsResponse,
} from '../types/neynar'

export interface RawCreatorMetrics {
  profile: {
    fid: number
    followers: number
    following: number
    powerBadge: boolean
    userQualityScore: number
    verifiedAddresses: number
    createdAt: string
    verifications: string[]
  }
  activity: {
    totalCasts: number
    avgLikesPerCast: number
    avgRecastsPerCast: number
    avgRepliesPerCast: number
    castFrequency: number
    threadDepth: number
    engagementRate: number
    contentDiversity: number
  }
  network: {
    relevantFollowersCount: number
    relevantFollowerScore: number
    bestFriendsCount: number
    avgAffinityScore: number
    interactionDiversity: number
    totalInteractions: number
    followerToFollowingRatio: number
  }
  financial: {
    totalUsdValue: number
    tokenCount: number
    diversityScore: number
    wealthTier: string
  }
  casts: NeynarCast[]
}

export class EnhancedNeynarService {
  private baseUrl = 'https://api.neynar.com'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchRawCreatorMetrics(fid: number): Promise<RawCreatorMetrics | null> {
    try {
      const [
        userProfile,
        userCasts,
        relevantFollowers,
        bestFriends,
        interactions,
        userBalance,
        userChannels,
      ] = await Promise.all([
        this.fetchUserProfile(fid),
        this.fetchUserCasts(fid, 200),
        this.fetchRelevantFollowers(fid, 50),
        this.fetchBestFriends(fid),
        this.fetchUserInteractions(fid),
        this.fetchUserBalance(fid),
        this.fetchUserChannels(fid),
      ])

      if (!userProfile) {
        return null
      }

      const activity = this.calculateEnhancedActivityMetrics(userCasts, userProfile)
      const networkMetrics = this.calculateNetworkMetrics(
        relevantFollowers,
        bestFriends,
        interactions,
        userChannels,
      )
      const financialMetrics = this.calculateFinancialMetrics(userBalance?.balances || [])

      return {
        profile: {
          fid: userProfile.fid,
          followers: userProfile.follower_count || 0,
          following: userProfile.following_count || 0,
          powerBadge: userProfile.power_badge || false,
          userQualityScore:
            userProfile.score ||
            userProfile.experimental?.neynar_user_score ||
            0,
          verifiedAddresses: userProfile.verified_addresses?.eth_addresses?.length || 0,
          createdAt: userProfile.created_at || new Date().toISOString(),
          verifications: userProfile.verifications || [],
        },
        activity,
        network: networkMetrics,
        financial: financialMetrics,
        casts: userCasts,
      }
    } catch (error) {
      console.error('Error fetching comprehensive creator metrics:', error)
      return null
    }
  }

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
        console.error(`Neynar user profile API error: ${response.status}`)
        return null
      }

      const data = await response.json()
      return data.users?.[0] || null
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  private async fetchUserCasts(fid: number, limit: number = 200): Promise<NeynarCast[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/feed/user/casts?fid=${fid}&limit=${Math.min(limit, 150)}&include_replies=true`,
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

      const data = (await response.json()) as CastsResponse
      return data.casts || []
    } catch (error) {
      console.error('Error fetching user casts:', error)
      return []
    }
  }

  private async fetchRelevantFollowers(fid: number, limit: number = 20): Promise<NeynarUser[]> {
    try {
      const viewerFid = fid === 1 ? 2 : 1
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/followers/relevant?target_fid=${fid}&viewer_fid=${viewerFid}&limit=${limit}`,
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

      const data = (await response.json()) as RelevantFollowersResponse
      return data.top_relevant_followers_hydrated?.map((f) => f.user) || []
    } catch (error) {
      console.error('Error fetching relevant followers:', error)
      return []
    }
  }

  private async fetchBestFriends(_fid: number): Promise<NeynarUser[]> {
    // Best friends endpoint doesn't exist in Neynar API
    return []
  }

  private async fetchUserInteractions(fid: number, limit: number = 50): Promise<any[]> {
    try {
      const otherFid = fid === 1 ? 2 : 1
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/user/interactions?fids=${fid},${otherFid}&limit=${limit}`,
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

      const data = await response.json()
      return data.interactions || []
    } catch (error) {
      console.error('Error fetching user interactions:', error)
      return []
    }
  }

  private async fetchUserBalance(fid: number): Promise<UserBalanceResponse | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/user/balance?fid=${fid}&networks=ethereum`,
        {
          headers: {
            accept: 'application/json',
            api_key: this.apiKey,
          },
        },
      )

      if (!response.ok) {
        console.error(`Neynar user balance API error: ${response.status}`)
        return null
      }

      const data = (await response.json()) as UserBalanceResponse
      return data
    } catch (error) {
      console.error('Error fetching user balance:', error)
      return null
    }
  }

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

      const data = (await response.json()) as UserChannelsResponse
      return data
    } catch (error) {
      console.error('Error fetching user channels:', error)
      return null
    }
  }

  private calculateEnhancedActivityMetrics(casts: NeynarCast[], profile: NeynarUser) {
    const totalCasts = casts.length
    const totalLikes = casts.reduce((sum, cast) => sum + (cast.reactions?.likes_count || 0), 0)
    const totalRecasts = casts.reduce((sum, cast) => sum + (cast.reactions?.recasts_count || 0), 0)
    const totalReplies = casts.reduce((sum, cast) => sum + (cast.replies?.count || 0), 0)

    return {
      totalCasts,
      avgLikesPerCast: totalCasts > 0 ? totalLikes / totalCasts : 0,
      avgRecastsPerCast: totalCasts > 0 ? totalRecasts / totalCasts : 0,
      avgRepliesPerCast: totalCasts > 0 ? totalReplies / totalCasts : 0,
      castFrequency: totalCasts,
      threadDepth: 0,
      engagementRate: totalCasts > 0 ? (totalLikes + totalRecasts + totalReplies) / totalCasts : 0,
      contentDiversity: 1,
    }
  }

  private calculateNetworkMetrics(
    relevantFollowers: NeynarUser[],
    bestFriends: NeynarUser[],
    interactions: any[],
    userChannels: UserChannelsResponse | null,
  ) {
    return {
      relevantFollowersCount: relevantFollowers.length,
      relevantFollowerScore: relevantFollowers.reduce((score, follower) => {
        return score + (follower.power_badge ? 2 : 1) + (follower.score || 0)
      }, 0),
      bestFriendsCount: bestFriends.length,
      avgAffinityScore: 0.5,
      interactionDiversity: interactions.length,
      totalInteractions: interactions.length,
      followerToFollowingRatio: 1,
    }
  }

  private calculateFinancialMetrics(balances: any[]) {
    return {
      totalUsdValue: 0,
      tokenCount: balances.length,
      diversityScore: 1,
      wealthTier: 'medium',
    }
  }
}
