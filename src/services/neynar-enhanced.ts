import type {
  CastsResponse,
  NeynarCast,
  NeynarUser,
  RelevantFollowersResponse,
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
    verifiedAddresses?: {
      eth_addresses: string[]
      sol_addresses: string[]
      primary: {
        eth_address: string | null
        sol_address: string | null
      }
    }
    createdAt: string
    verifications: string[]
  }
  activity: {
    lastActivity: string
    activeDays: number
    totalCasts: number
    avgCastsPerDay?: number
    replyRatio?: number
    channelDiversity?: number
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

      const activity = this.calculateEnhancedActivityMetrics(
        userCasts,
        userProfile,
      )
      const networkMetrics = this.calculateNetworkMetrics(
        relevantFollowers,
        bestFriends,
        interactions,
        userChannels,
      )
      const financialMetrics = this.calculateFinancialMetrics(
        userBalance?.balances || [],
      )

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
          verifiedAddresses: userProfile.verified_addresses || undefined,
          createdAt: userProfile.created_at || new Date().toISOString(),
          verifications: userProfile.verifications || [],
        },
        activity: {
          lastActivity: userCasts[0]?.timestamp || new Date().toISOString(),
          activeDays: Math.min(userCasts.length, 30), // Approximate active days
          totalCasts: userCasts.length,
          avgCastsPerDay: userCasts.length / 30,
          replyRatio:
            activity.avgRepliesPerCast /
            (activity.avgLikesPerCast + activity.avgRecastsPerCast + 1),
          channelDiversity: activity.contentDiversity,
        },
        network: networkMetrics,
        financial: financialMetrics,
        casts: userCasts.map((cast) => ({
          hash: cast.hash,
          timestamp: cast.timestamp,
          likes: cast.reactions?.likes_count || 0,
          recasts: cast.reactions?.recasts_count || 0,
          replies: cast.replies?.count || 0,
          threadDepth: cast.thread_hash ? 1 : 0,
          hasChannel: !!cast.channel,
          channelFollowers: 0, // Channel follower count not available in basic channel object
          mentionsCount: cast.mentioned_profiles?.length || 0,
          embedsCount: cast.embeds?.length || 0,
        })),
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

      const data = (await response.json()) as { users: NeynarUser[] }
      return data.users?.[0] || null
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  private async fetchUserCasts(
    fid: number,
    limit: number = 200,
  ): Promise<NeynarCast[]> {
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

  private async fetchRelevantFollowers(
    fid: number,
    limit: number = 20,
  ): Promise<NeynarUser[]> {
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

  private async fetchUserInteractions(
    fid: number,
    limit: number = 50,
  ): Promise<any[]> {
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

      const data = (await response.json()) as { interactions: any[] }
      return data.interactions || []
    } catch (error) {
      console.error('Error fetching user interactions:', error)
      return []
    }
  }

  private async fetchUserBalance(
    fid: number,
  ): Promise<UserBalanceResponse | null> {
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

  private async fetchUserChannels(
    fid: number,
  ): Promise<UserChannelsResponse | null> {
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

  private calculateEnhancedActivityMetrics(
    casts: NeynarCast[],
    _profile: NeynarUser,
  ) {
    const totalCasts = casts.length
    const totalLikes = casts.reduce(
      (sum, cast) => sum + (cast.reactions?.likes_count || 0),
      0,
    )
    const totalRecasts = casts.reduce(
      (sum, cast) => sum + (cast.reactions?.recasts_count || 0),
      0,
    )
    const totalReplies = casts.reduce(
      (sum, cast) => sum + (cast.replies?.count || 0),
      0,
    )

    return {
      totalCasts,
      avgLikesPerCast: totalCasts > 0 ? totalLikes / totalCasts : 0,
      avgRecastsPerCast: totalCasts > 0 ? totalRecasts / totalCasts : 0,
      avgRepliesPerCast: totalCasts > 0 ? totalReplies / totalCasts : 0,
      castFrequency: totalCasts,
      threadDepth: 0,
      engagementRate:
        totalCasts > 0
          ? (totalLikes + totalRecasts + totalReplies) / totalCasts
          : 0,
      contentDiversity: 1,
    }
  }

  private calculateNetworkMetrics(
    relevantFollowers: NeynarUser[],
    bestFriends: NeynarUser[],
    interactions: any[],
    _userChannels: UserChannelsResponse | null,
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
    if (!balances || balances.length === 0) {
      return {
        totalUsdValue: 0,
        tokenCount: 0,
        diversityScore: 0,
        wealthTier: 'low',
      }
    }

    let totalUsdValue = 0
    let tokenCount = 0
    const chains = new Set<string>()

    // Calculate real values from balance data
    balances.forEach((addressBalance: any) => {
      if (addressBalance.token_balances) {
        addressBalance.token_balances.forEach((tokenBalance: any) => {
          if (tokenBalance.balance?.in_usdc) {
            totalUsdValue += tokenBalance.balance.in_usdc
            tokenCount++
          }
        })
      }
      if (addressBalance.verified_address?.network) {
        chains.add(addressBalance.verified_address.network)
      }
    })

    const diversityScore = chains.size
    let wealthTier = 'low'
    if (totalUsdValue > 10000) wealthTier = 'high'
    else if (totalUsdValue > 1000) wealthTier = 'medium'

    return {
      totalUsdValue,
      tokenCount,
      diversityScore,
      wealthTier,
    }
  }
}
