/**
 * Neynar API response types based on OpenAPI specification
 */

export interface NeynarUser {
  object: 'user'
  fid: number
  username: string
  display_name?: string
  custody_address: string
  pfp_url?: string
  profile: {
    bio: {
      text: string
      mentioned_profiles?: any[]
      mentioned_profiles_ranges?: any[]
      mentioned_channels?: any[]
      mentioned_channels_ranges?: any[]
    }
    location?: {
      latitude?: number
      longitude?: number
      address?: {
        city?: string
        state?: string
        state_code?: string
        country?: string
        country_code?: string
      }
    }
    banner?: {
      url: string
    }
  }
  follower_count: number
  following_count: number
  verifications: string[]
  verified_addresses: {
    eth_addresses: string[]
    sol_addresses: string[]
    primary: {
      eth_address: string | null
      sol_address: string | null
    }
  }
  power_badge: boolean
  experimental?: {
    neynar_user_score: number
  }
  score?: number
  neynar_score?: number // Legacy field name
  created_at?: string
  viewer_context?: {
    following: boolean
    followed_by: boolean
    blocking: boolean
    blocked_by: boolean
  }
  // Enhanced fields for comprehensive scoring
  active_status?: 'active' | 'inactive'
  subscriptions_created?: number
  subscribed_to?: number
  subscribers?: number
}

export interface BulkUsersResponse {
  users: NeynarUser[]
}

export interface NeynarCast {
  object: 'cast'
  hash: string
  thread_hash?: string
  parent_hash?: string
  parent_url?: string
  root_parent_url?: string
  parent_author?: {
    fid: number
  }
  author: NeynarUser
  text: string
  timestamp: string
  embeds: any[]
  reactions: {
    likes_count: number
    recasts_count: number
    likes: any[]
    recasts: any[]
  }
  replies: {
    count: number
  }
  channel?: {
    id: string
    name: string
    object: 'channel'
  }
  mentioned_profiles: any[]
  viewer_context?: {
    liked: boolean
    recasted: boolean
  }
}

export interface CastsResponse {
  casts: NeynarCast[]
  next?: {
    cursor: string | null
  }
}

// Additional types for enhanced API calls
export interface RelevantFollowersResponse {
  top_relevant_followers_hydrated: Array<{
    object: 'follow'
    user: NeynarUser
  }>
  all_relevant_followers_dehydrated: Array<{
    object: 'follow'
    user: {
      object: 'user_dehydrated'
      fid: number
    }
  }>
}

export interface BestFriendsResponse {
  users: Array<{
    user: NeynarUser
    mutual_affinity_score: number
  }>
}

export interface UserInteractionsResponse {
  interactions: Array<{
    user: NeynarUser
    interaction_type: 'like' | 'recast' | 'reply' | 'mention'
    count: number
  }>
}

export interface UserBalanceResponse {
  balances: Array<{
    object: 'address_balance'
    verified_address: {
      address: string
      network: 'ethereum' | 'base' | 'optimism' | 'arbitrum'
    }
    token_balances: Array<{
      object: 'token_balance'
      token: {
        object: 'token'
        contract_address?: string
        name: string
        symbol: string
        decimals: number
      }
      balance: {
        in_token: number
        in_usdc: number
      }
    }>
  }>
}

export interface UserChannelsResponse {
  channels: Array<{
    id: string
    name: string
    description: string
    follower_count: number
    role?: 'owner' | 'moderator' | 'member'
  }>
}

export interface CastMetricsResponse {
  cast: NeynarCast
  metrics: {
    likes: number
    recasts: number
    replies: number
    quotes: number
    reach: number
    impressions: number
  }
}
