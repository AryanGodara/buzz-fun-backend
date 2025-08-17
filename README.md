# Creator Score System API

A robust backend API for calculating, tracking, and comparing Farcaster creator scores. This system provides powerful metrics to help creators understand their influence and engagement on the Farcaster network.

## Features

- **Creator Score API**: Calculate and retrieve creator scores based on Farcaster metrics
- **Leaderboards**: Get top creators by various metrics
- **Loan Waitlist**: Manage waitlist for creator loans
- **Metrics Tracking**: Track and analyze Farcaster engagement metrics
- **Challenge System**: Creator challenges and competitions

## Tech Stack

- **Framework**: Hono.js
- **Runtime**: Bun
- **Database**: MongoDB with Mongoose
- **Validation**: Zod
- **Development**: TypeScript
- **Linting**: Biome

## Getting Started

### Prerequisites

- Bun 1.0+ 
- MongoDB instance

### Installation

1. Install dependencies:
```bash
bun install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/somurie
ALLOWED_ORIGINS=http://localhost:3000
FARCASTER_API_KEY=your_farcaster_api_key
```

### Development

Start the development server:
```bash
bun run dev
```

The server will start on `http://localhost:4000`

### Production

Start the production server:
```bash
bun start
```

## API Endpoints

### Health Check
- `GET /` - Server health status

### Creator Scores
- `GET /api/score/:fid` - Get creator score by FID
- `POST /api/score/calculate` - Calculate score for a creator
- `GET /api/score/leaderboard` - Get creator leaderboard

### Metrics
- `GET /api/metrics/:fid` - Get metrics for a creator
- `POST /api/metrics/update` - Update creator metrics

### Waitlist
- `POST /api/waitlist/join` - Join the loan waitlist
- `GET /api/waitlist/status/:email` - Check waitlist status

### Challenges
- `GET /api/challenges` - Get active challenges
- `POST /api/challenges/:id/participate` - Participate in a challenge

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | No (default: 4000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins | Yes |
| `FARCASTER_API_KEY` | Farcaster API key | Yes |

## Development

### Scripts

- `bun run dev` - Start development server with hot reload
- `bun start` - Start production server
- `bun run seed` - Seed test data
- `bun test` - Run tests
- `bun run lint` - Lint code
- `bun run format` - Format code

### Database

The server uses MongoDB with Mongoose for data persistence. Make sure MongoDB is running before starting the server.

### Testing
    db.createCollection('creators')
    db.createCollection('creatorScores')

    # To exit MongoDB shell
    exit
    ```

The application models will handle schema validation and indexing

## Example API Responses

### Score Calculation Request

```json
// POST /api/score/calculate
{
  "success": true,
  "processing": true,
  "message": "Score calculation is in progress. Please try again in a few seconds.",
  "jobId": "job-1755269060641-500916"
}
```

### Score Result

```json
// GET /api/score/500916
{
  "success": true,
  "data": {
    "components": {
      "engagement": 0,
      "consistency": 60,
      "growth": 65.56302500767288,
      "quality": 40,
      "network": 3.130434782608696
    },
    "_id": "689f47c5177bdf12f049ccf1",
    "creatorFid": 500916,
    "overallScore": 31,
    "percentileRank": 38,
    "tier": 1,
    "scoreDate": "2025-08-14T18:30:00.000Z",
    "validUntil": "2025-08-15T18:30:00.000Z",
    "shareableId": "pDLpeUjm3k",
    "createdAt": "2025-08-15T14:44:21.157Z",
    "updatedAt": "2025-08-15T14:44:21.157Z",
    "__v": 0,
    "username": "aryangodara",
    "followerCount": 36
  }
}
```

### User Metrics

```json
// GET /api/metrics/500916
{
  "fid": "500916",
  "metrics": {
    "followers": 36,
    "following": 115,
    "casts": 0,
    "reactions": 0,
    "replies": 0,
    "recasts": 0,
    "engagement_rate": 0,
    "last_updated": "2025-08-15T14:45:28.631Z"
  }
}
```

### Trending Casts

```json
// GET /api/metrics/500916/trending
{
  "fid": "500916",
  "trending_casts": []
}
```
