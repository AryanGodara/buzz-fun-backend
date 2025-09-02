import { Hono } from 'hono'
import type { Bindings } from '../config/env'
import { getFromFirebase, saveToFirebase } from '../services/firebase-admin'

const nftRoutes = new Hono<{ Bindings: Bindings }>()

/**
 * Calculate tier from overall score
 */
function calculateTier(score: number): string {
  if (score >= 90) return 'AAA'
  if (score >= 80) return 'AA'
  if (score >= 70) return 'A'
  if (score >= 60) return 'BBB'
  if (score >= 50) return 'BB'
  if (score >= 40) return 'B'
  if (score >= 30) return 'C'
  return 'D'
}

/**
 * Generate dynamic SVG image for NFT
 */
function generateNFTImage(data: any): string {
  const tier = calculateTier(data.overallScore)
  const tierColors = {
    AAA: '#FFD700', // Gold
    AA: '#C0C0C0', // Silver
    A: '#CD7F32', // Bronze
    BBB: '#4CAF50', // Green
    BB: '#2196F3', // Blue
    B: '#FF9800', // Orange
    C: '#F44336', // Red
    D: '#9E9E9E', // Gray
  }

  const color = tierColors[tier as keyof typeof tierColors] || '#9E9E9E'

  return `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.4" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="400" height="400" fill="url(#bg)" rx="20"/>
      
      <!-- Profile Picture Circle -->
      ${
        data.pfpUrl
          ? `
        <defs>
          <pattern id="pfp" patternUnits="userSpaceOnUse" width="80" height="80">
            <image href="${data.pfpUrl}" x="0" y="0" width="80" height="80"/>
          </pattern>
        </defs>
        <circle cx="200" cy="120" r="40" fill="url(#pfp)" stroke="white" stroke-width="3" filter="url(#shadow)"/>
      `
          : `
        <circle cx="200" cy="120" r="40" fill="#666" stroke="white" stroke-width="3" filter="url(#shadow)"/>
        <text x="200" y="130" text-anchor="middle" fill="white" font-size="24" font-family="Arial">👤</text>
      `
      }
      
      <!-- Title -->
      <text x="200" y="200" text-anchor="middle" fill="white" font-size="24" font-weight="bold" font-family="Arial">
        Buzz Creator Score
      </text>
      
      <!-- Username -->
      <text x="200" y="225" text-anchor="middle" fill="white" font-size="16" font-family="Arial">
        ${data.username || 'Unknown'}
      </text>
      
      <!-- Tier Badge -->
      <rect x="160" y="250" width="80" height="40" fill="white" rx="20" filter="url(#shadow)"/>
      <text x="200" y="275" text-anchor="middle" fill="${color}" font-size="20" font-weight="bold" font-family="Arial">
        ${tier}
      </text>
      
      <!-- Overall Score -->
      <text x="200" y="320" text-anchor="middle" fill="white" font-size="32" font-weight="bold" font-family="Arial">
        ${data.overallScore}/100
      </text>
      
      <!-- Footer -->
      <text x="200" y="360" text-anchor="middle" fill="white" font-size="12" font-family="Arial" opacity="0.8">
        FID: ${data.fid} • Token #${data.tokenId}
      </text>
    </svg>
  `)}`
}

/**
 * GET /api/metadata/:tokenId
 * Serve NFT metadata in OpenSea format
 */
nftRoutes.get('/metadata/:tokenId', async (c) => {
  try {
    const tokenId = c.req.param('tokenId')

    if (!tokenId || Number.isNaN(Number(tokenId))) {
      return c.json({ error: 'Invalid token ID' }, 400)
    }

    // Get NFT token mapping from Firebase
    const tokenMapping = await getFromFirebase(c.env, `nft_tokens/${tokenId}`)

    if (!tokenMapping) {
      return c.json({ error: 'Token not found' }, 404)
    }

    const { fid, contractAddress, mintedAt } = tokenMapping

    // Get creator score data from existing cache
    const scoreData = await getFromFirebase(c.env, `creator_scores/${fid}`)

    if (!scoreData) {
      return c.json({ error: 'Score data not found' }, 404)
    }

    const {
      overallScore,
      engagementScore,
      consistencyScore,
      growthScore,
      qualityScore,
      networkScore,
      username,
      displayName,
      pfpUrl,
    } = scoreData

    const tier = calculateTier(overallScore)

    // Generate OpenSea-compatible metadata
    const metadata = {
      name: `Buzz Creator Score #${tokenId}`,
      description: `Creator Score NFT for ${displayName || username || 'Unknown'} (FID: ${fid}) with an overall score of ${overallScore}/100. This NFT represents their creator credibility rating on the Buzz platform.`,
      image: generateNFTImage({
        tokenId,
        fid,
        username: username || displayName,
        pfpUrl,
        overallScore,
      }),
      external_url: `https://buzzbase.fun/creator/${fid}`,
      attributes: [
        {
          trait_type: 'Overall Score',
          value: overallScore,
          max_value: 100,
        },
        {
          trait_type: 'Credit Tier',
          value: tier,
        },
        {
          trait_type: 'Engagement Score',
          value: engagementScore,
          max_value: 100,
        },
        {
          trait_type: 'Consistency Score',
          value: consistencyScore,
          max_value: 100,
        },
        {
          trait_type: 'Growth Score',
          value: growthScore,
          max_value: 100,
        },
        {
          trait_type: 'Quality Score',
          value: qualityScore,
          max_value: 100,
        },
        {
          trait_type: 'Network Score',
          value: networkScore,
          max_value: 100,
        },
        {
          trait_type: 'Farcaster ID',
          value: fid,
        },
        {
          trait_type: 'Username',
          value: username || displayName || 'Unknown',
        },
        {
          trait_type: 'Minted Date',
          value: new Date(mintedAt).toISOString().split('T')[0],
        },
        {
          trait_type: 'Contract Address',
          value: contractAddress,
        },
      ],
    }

    return c.json(metadata, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error fetching NFT metadata:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * POST /api/nft/mint
 * Store NFT token mapping when minted
 */
nftRoutes.post('/mint', async (c) => {
  try {
    const body = await c.req.json()
    const { tokenId, fid, contractAddress, ownerAddress } = body

    if (!tokenId || !fid || !contractAddress || !ownerAddress) {
      return c.json(
        {
          error:
            'Missing required fields: tokenId, fid, contractAddress, ownerAddress',
        },
        400,
      )
    }

    // Verify the creator score exists
    const scoreData = await getFromFirebase(c.env, `creator_scores/${fid}`)
    if (!scoreData) {
      return c.json({ error: 'Creator score not found for FID' }, 404)
    }

    // Store NFT token mapping
    const tokenData = {
      tokenId: Number(tokenId),
      fid: Number(fid),
      contractAddress,
      ownerAddress,
      mintedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    const saved = await saveToFirebase(
      c.env,
      `nft_tokens/${tokenId}`,
      tokenData,
    )

    if (!saved) {
      return c.json({ error: 'Failed to save NFT token data' }, 500)
    }

    return c.json({
      success: true,
      tokenId: Number(tokenId),
      metadataUrl: `https://buzzfunbackend.buzzdotfun.workers.dev/api/nft/metadata/${tokenId}`,
    })
  } catch (error) {
    console.error('Error minting NFT:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * GET /api/nft/token/:tokenId
 * Get NFT token info (for debugging)
 */
nftRoutes.get('/token/:tokenId', async (c) => {
  try {
    const tokenId = c.req.param('tokenId')

    const tokenData = await getFromFirebase(c.env, `nft_tokens/${tokenId}`)

    if (!tokenData) {
      return c.json({ error: 'Token not found' }, 404)
    }

    return c.json(tokenData)
  } catch (error) {
    console.error('Error fetching token info:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export { nftRoutes }
