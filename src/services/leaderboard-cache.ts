import type { Bindings } from '../config/env'
import { getFromFirebase, saveToFirebase } from './firebase-admin'

interface LeaderboardEntry {
  rank: number
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  overallScore: number
  tier: string
  tierInfo: any
  percentileRank: number
  components: any
  timestamp: string
}

interface CachedLeaderboard {
  leaderboard: LeaderboardEntry[]
  total: number
  generatedAt: string
  validUntil: string
  cacheDate: string // YYYY-MM-DD format
}

function getCacheKey(): string {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `leaderboard/daily/${today}`
}

function getValidUntil(): string {
  // Valid until end of current day
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}

export async function getCachedLeaderboard(
  bindings: Bindings,
): Promise<CachedLeaderboard | null> {
  try {
    const cacheKey = getCacheKey()
    const cached = await getFromFirebase(bindings, cacheKey)

    if (cached && new Date(cached.validUntil) > new Date()) {
      console.log('Leaderboard cache hit for', cached.cacheDate)
      return cached
    }

    return null
  } catch (error) {
    console.error('Failed to get cached leaderboard:', error)
    return null
  }
}

export async function generateAndCacheLeaderboard(
  bindings: Bindings,
): Promise<CachedLeaderboard> {
  console.log('Generating fresh leaderboard...')

  // Fetch all scores from Firebase
  const allScores = await getFromFirebase(bindings, 'scores')

  if (!allScores) {
    const emptyLeaderboard: CachedLeaderboard = {
      leaderboard: [],
      total: 0,
      generatedAt: new Date().toISOString(),
      validUntil: getValidUntil(),
      cacheDate: new Date().toISOString().split('T')[0],
    }
    return emptyLeaderboard
  }

  // Process and sort scores
  const scoresArray = Object.entries(allScores)
    .map(([fid, scoreData]: [string, any]) => ({
      fid: parseInt(fid, 10),
      ...scoreData,
    }))
    .filter(
      (score) =>
        score.overallScore !== undefined &&
        score.tier &&
        !Number.isNaN(score.fid) &&
        score.overallScore !== null,
    )

  // Filter out entries without valid profile data, then sort by overall score (descending) and take top 50
  const topScores = scoresArray
    .filter((score) => {
      const hasValidUsername =
        score.username &&
        score.username !== 'undefined' &&
        score.username.trim() !== ''
      const hasValidDisplayName =
        score.displayName &&
        score.displayName.trim() !== '' &&
        score.displayName.trim() !== ' '
      return hasValidUsername || hasValidDisplayName
    })
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 50)

  // Add ranks
  const leaderboard: LeaderboardEntry[] = topScores.map((score, index) => ({
    rank: index + 1,
    fid: score.fid,
    username: score.username,
    displayName: score.displayName,
    pfpUrl: score.pfpUrl,
    overallScore: score.overallScore,
    tier: score.tier,
    tierInfo: score.tierInfo,
    percentileRank: score.percentileRank,
    components: score.components,
    timestamp: score.timestamp,
  }))

  const cachedLeaderboard: CachedLeaderboard = {
    leaderboard,
    total: leaderboard.length,
    generatedAt: new Date().toISOString(),
    validUntil: getValidUntil(),
    cacheDate: new Date().toISOString().split('T')[0],
  }

  // Cache the leaderboard
  const cacheKey = getCacheKey()
  const saved = await saveToFirebase(bindings, cacheKey, cachedLeaderboard)

  if (saved) {
    console.log(
      'Leaderboard cached successfully for',
      cachedLeaderboard.cacheDate,
    )
  } else {
    console.warn('Failed to cache leaderboard')
  }

  return cachedLeaderboard
}

export async function getLeaderboard(
  bindings: Bindings,
): Promise<CachedLeaderboard> {
  // Try to get cached version first
  const cached = await getCachedLeaderboard(bindings)
  if (cached) {
    return cached
  }

  // Generate fresh leaderboard if no valid cache
  return await generateAndCacheLeaderboard(bindings)
}
