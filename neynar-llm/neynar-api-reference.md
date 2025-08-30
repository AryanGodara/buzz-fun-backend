# Neynar API Reference for Creator Credit Rating System

## Core Foundation
- **Neynar User Quality Score**: 0-1 scale, updates weekly, threshold ~0.5
- **Available via**: API `/v2/farcaster/user/bulk` and on-chain contract
- **Base for algorithm**: Primary quality indicator already calculated

## Key API Endpoints by Category

### User Profile & Core Data
- `/v2/farcaster/user/bulk` - Core user data, follower_count, following_count, power_badge, verified_addresses, user_score
- `/v2/farcaster/user/balance` - Token balances (ETH, Base, Optimism, Arbitrum)
- `/v2/farcaster/user/verification` - ETH/SOL address verifications
- `/v2/farcaster/user/memberships/list` - Channel memberships and roles

### Engagement & Content Metrics
- `/v2/farcaster/feed/user/popular` - 10 most popular casts (replies, likes, recasts based)
- `/v2/farcaster/feed/user/replies_and_recasts` - Recent replies and recasts
- `/v2/farcaster/feed/user/casts` - Chronological casts with filtering
- `/v2/farcaster/cast/metrics` - Cast performance analytics
- `/v2/farcaster/cast/reactions` - Reactions on specific casts

### Social Graph & Network
- `/v2/farcaster/user/best_friends` - Mutual affinity scores based on interactions
- `/v2/farcaster/followers/relevant` - Relevant followers (mutual connections)
- `/v2/farcaster/user/interactions` - Interactions between specific users
- `/v2/farcaster/channel/followers/relevant` - Channel follower relevance

### Financial & Economic Indicators
- `/v2/farcaster/user/balance` - Token balances across networks
- `/v2/farcaster/nft/mint` - NFT minting capabilities
- `/v2/farcaster/user/subscriptions_created` - Subscription services created
- `/v2/farcaster/user/subscribed_to` - Subscriptions user has

### Content Quality & Performance
- `/v2/farcaster/feed/trending` - Trending performance
- `/v2/farcaster/cast/search` - Search ranking with algorithmic sorting
- `/v2/farcaster/frame/validate/analytics` - Frame/mini-app analytics
- `/v2/farcaster/cast/conversation` - Conversation depth and threading

### Channel & Community Data
- `/v2/farcaster/channel/member/list` - Channel members
- `/v2/farcaster/channel/followers` - Channel followers
- `/v2/farcaster/user/channels` - User's channel activity
- `/v2/farcaster/channel/member/invite/list` - Channel invites

## Credit Rating Data Mapping

### Payment History & Reliability (35%)
**API Calls:**
- `/v2/farcaster/user/bulk` - user_score, verified status
- `/v2/farcaster/feed/user/casts` - posting consistency
- `/v2/farcaster/user/verification` - verification maintenance

### Financial Capacity (30%)
**API Calls:**
- `/v2/farcaster/user/balance` - token holdings
- `/v2/farcaster/user/bulk` - verified_addresses count
- `/v2/farcaster/user/subscriptions_created` - business activity
- `/v2/farcaster/user/subscribed_to` - subscription engagement

### Credit History Length (15%)
**API Calls:**
- `/v2/farcaster/user/bulk` - account data for age calculation
- `/v2/farcaster/feed/user/casts` - historical activity patterns
- `/v2/farcaster/user/bulk` - follower_count trends (requires historical tracking)

### Types of Credit/Activity (10%)
**API Calls:**
- `/v2/farcaster/feed/user/replies_and_recasts` - content diversity
- `/v2/farcaster/user/memberships/list` - channel roles
- `/v2/farcaster/frame/validate/analytics` - cross-platform activity

### Social Credit Factors (10%)
**API Calls:**
- `/v2/farcaster/user/best_friends` - network quality
- `/v2/farcaster/followers/relevant` - social proof
- `/v2/farcaster/feed/user/popular` - influence metrics
- `/v2/farcaster/cast/metrics` - trending performance

## Implementation Priority Order

### Phase 1 - Core Metrics
1. `/v2/farcaster/user/bulk` - Base user data + quality score
2. `/v2/farcaster/feed/user/popular` - Content performance
3. `/v2/farcaster/user/balance` - Financial indicators

### Phase 2 - Advanced Engagement
4. `/v2/farcaster/user/best_friends` - Network quality
5. `/v2/farcaster/cast/metrics` - Detailed analytics
6. `/v2/farcaster/user/memberships/list` - Community involvement

### Phase 3 - Sophisticated Analysis
7. `/v2/farcaster/followers/relevant` - Social proof
8. `/v2/farcaster/user/subscriptions_created` - Business activity
9. `/v2/farcaster/frame/validate/analytics` - Cross-platform engagement

## Rating Scale Framework
- **AAA**: user_score > 0.8, high token balance, strong network, consistent content
- **AA**: user_score > 0.7, moderate financial backing, good engagement
- **A**: user_score > 0.6, verified addresses, active community participation
- **BBB**: user_score > 0.5, basic verification, regular posting
- **BB**: user_score > 0.4, some engagement, limited verification
- **B**: user_score > 0.3, minimal activity, basic profile
- **CCC-D**: user_score < 0.3, low engagement, unverified

## Additional Notes from Neynar AI Research
- Neynar User Score is experimental but highly valuable (0-1 scale)
- Channel leadership roles (moderator/host) indicate community trust
- Cross-platform verification (X accounts) adds credibility
- Reaction patterns (given vs received) show engagement quality
- Cast frequency and reply engagement indicate consistency
- Popular content endpoint provides top 10 performing casts
- Relevant followers endpoint shows quality connections vs vanity metrics
