# Buzz Fun Backend - Creator Credit Rating API Documentation

## 🚀 Deployed Backend
**Production URL:** `https://buzzfunbackend.buzzdotfun.workers.dev`

## 📊 Overview
The Buzz Fun Backend is a creator credit rating system for Farcaster creators that provides:
- **Credit scoring** using 5 core metrics (0-100 scale)
- **Traditional credit tiers** (D, C, B, BB, BBB, A, AA, AAA)
- **Optimized caching** (1-week score cache, daily leaderboard cache)
- **100+ real creator profiles** with diverse score distribution

## 🏗️ Architecture
- **Framework:** Hono.js on Cloudflare Workers
- **Database:** Firebase Realtime Database
- **Data Source:** Neynar API (Farcaster data)
- **Caching:** Multi-layer (score cache + leaderboard cache)

## 📈 Scoring System

### Core Metrics (0-100 scale each):
1. **Engagement (25% weight):** Likes, replies, recasts per cast
2. **Consistency (20% weight):** Regular posting patterns
3. **Growth (20% weight):** Follower growth trends
4. **Quality (25% weight):** Content quality indicators
5. **Network (10% weight):** Network effects and connections

### Credit Tier System:
- **AAA (90-100):** Exceptional (Top 1%) - Perfect creators
- **AA (80-89):** Excellent (Top 5%) - High-quality creators  
- **A (70-79):** Very Good (Top 15%) - Strong performers
- **BBB (60-69):** Good (Top 35%) - Solid creators
- **BB (50-59):** Fair (Top 60%) - Average performers
- **B (40-49):** Below Average (Top 80%) - Developing creators
- **C (30-39):** Poor (Top 95%) - Low engagement
- **D (0-29):** Very Poor (Bottom 5%) - Inactive/new accounts

## 🔗 API Endpoints

### 1. Get Creator Score by FID
**Endpoint:** `GET /api/score/creator/:fid`

**Description:** Get individual creator credit score with detailed breakdown

**Parameters:**
- `fid` (path): Farcaster ID (integer)

### 2. Get Creator Score by Username
**Endpoint:** `GET /api/score/username/:username`

**Description:** Get individual creator credit score by username with detailed breakdown

**Parameters:**
- `username` (path): Farcaster username (string, e.g., "dwr.eth", "vitalik.eth")

**Response Format:**
Returns comprehensive creator score with tier classification and user profile data.

**Response:**
```json
{
  "success": true,
  "data": {
    "fid": 194,
    "username": "rish",
    "displayName": "rish", 
    "pfpUrl": "https://i.imgur.com/naZWL9n.gif",
    "overallScore": 76.45,
    "tier": "A",
    "tierInfo": {
      "tier": "A",
      "description": "Very Good",
      "minScore": 70,
      "maxScore": 79,
      "percentile": "Top 15%"
    },
    "percentileRank": 85,
    "components": {
      "engagement": 68.2,
      "consistency": 82.1,
      "growth": 91.3,
      "quality": 74.8,
      "network": 65.9
    },
    "timestamp": "2025-08-30T22:38:51.359Z",
    "validUntil": "2025-09-06T22:38:51.359Z"
  }
}
```

**Error Response (FID endpoint):**
```json
{
  "error": "Invalid FID provided"
}
```

**Error Response (Username endpoint):**
```json
{
  "error": "User not found"
}
```

**Cache:** 1 week per score

---

### 3. Get Leaderboard
**Endpoint:** `GET /api/leaderboard`

**Description:** Get top 50 creators ranked by credit score with user profile data (cached daily)

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "fid": 194,
        "username": "rish",
        "displayName": "rish",
        "pfpUrl": "https://i.imgur.com/naZWL9n.gif",
        "overallScore": 76.45,
        "tier": "A",
        "tierInfo": {
          "tier": "A",
          "description": "Very Good",
          "minScore": 70,
          "maxScore": 79,
          "percentile": "Top 15%"
        },
        "percentileRank": 85,
        "components": {
          "engagement": 68.2,
          "consistency": 82.1,
          "growth": 91.3,
          "quality": 74.8,
          "network": 65.9
        },
        "timestamp": "2025-08-30T22:38:51.359Z"
      }
    ],
    "total": 50,
    "generatedAt": "2025-08-31T00:00:00.000Z",
    "validUntil": "2025-09-01T00:00:00.000Z",
    "cacheDate": "2025-08-31"
  }
}
```

**Cache:** Daily (refreshes at midnight UTC)

---

### 3. Refresh Leaderboard (Admin)
**Endpoint:** `POST /api/leaderboard/refresh`

**Description:** Force refresh leaderboard cache with latest data

**Response Format:**
```json
{
  "success": true,
  "data": {
    // Same as GET /api/leaderboard response
  },
  "message": "Leaderboard cache refreshed successfully"
}
```

---

### 4. Health Check
**Endpoint:** `GET /api/health`

**Description:** Basic health check

**Response Format:**
```json
{
  "status": "ok",
  "timestamp": "2025-08-31T10:30:00.000Z"
}
```

## 📊 Current Database Stats
- **100+ creator profiles** with real Farcaster data
- **Score distribution:** All tiers represented (D through AAA)
- **Top performers:** FID 10 (100.0 AAA), FID 2 (76.11 A), FID 12 (75.26 A)
- **Update frequency:** Scores cached for 1 week, leaderboard daily

## 🔧 Performance Optimizations
- **Score caching:** 1-week TTL reduces API calls by 7x
- **Leaderboard caching:** Daily refresh, near-instant responses
- **Response times:** ~170ms (cache hits) vs ~2s (fresh calculations)
- **Rate limiting:** Built-in to prevent API abuse

## 🎯 Frontend Integration Notes

### Key Integration Points:
1. **User Score Display:** Use `/api/score/creator/:fid` for individual profiles
2. **Leaderboard:** Use `/api/leaderboard` for rankings page
3. **Tier Visualization:** Use `tierInfo` object for color coding and descriptions
4. **Caching:** Responses are pre-cached, safe to call frequently
5. **Error Handling:** Check `success` field, handle invalid FIDs gracefully

### Recommended UI Elements:
- **Score gauge/progress bar** (0-100 scale)
- **Tier badge** with color coding (D=red, C=orange, B=yellow, BB/BBB=blue, A/AA/AAA=green)
- **Component breakdown** radar chart or bars
- **Percentile rank** display
- **Leaderboard table** with pagination

### Sample Frontend Code:
```javascript
// Get creator score by FID
const getCreatorScore = async (fid) => {
  const response = await fetch(`https://buzzfunbackend.buzzdotfun.workers.dev/api/score/creator/${fid}`);
  const data = await response.json();
  return data.success ? data.data : null;
};

// Get creator score by username
const getCreatorScoreByUsername = async (username) => {
  const response = await fetch(`https://buzzfunbackend.buzzdotfun.workers.dev/api/score/username/${username}`);
  const data = await response.json();
  return data.success ? data.data : null;
};

// Get leaderboard
const getLeaderboard = async () => {
  const response = await fetch('https://buzzfunbackend.buzzdotfun.workers.dev/api/leaderboard');
  const data = await response.json();
  return data.success ? data.data : null;
};
```

## 🔒 Security & Rate Limits
- **CORS:** Enabled for frontend domains
- **Rate limiting:** Built into Cloudflare Workers
- **API keys:** Not required for public endpoints
- **Firebase:** Admin-only write access, read-only for API

## 📱 Mobile Optimization
- **Lightweight responses:** Optimized JSON structure
- **Fast caching:** Minimal network requests needed
- **Offline support:** Cache responses locally for better UX

---

*Last updated: August 31, 2025*
*Backend version: 1.0.0*
