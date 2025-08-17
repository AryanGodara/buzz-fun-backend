# Neynar API Reference

This document outlines the Neynar API endpoints used in our application after removing the Neynar SDK dependency.

## Base URL

```text
https://api.neynar.com/v2/farcaster
```

## Authentication

All requests require the Neynar API key to be passed in the `x-api-key` header.

## Endpoints Used

### User Endpoints

#### Get User Followers

```text
GET /user/:fid/followers
```

**Parameters:**

- `limit` (optional): Number of followers to return (default: 25)
- `cursor` (optional): Pagination cursor

**Example:**

```text
GET /user/12345/followers?limit=10
```

#### Get User Following

```text
GET /user/:fid/following
```

**Parameters:**

- `limit` (optional): Number of users to return (default: 25)
- `cursor` (optional): Pagination cursor

**Example:**

```text
GET /user/12345/following?limit=10
```

### Cast Endpoints

#### Get User Casts

```text
GET /user/:fid/casts
```

**Parameters:**

- `limit` (optional): Number of casts to return (default: 25, max: 100)
- `cursor` (optional): Pagination cursor

**Example:**

```text
GET /user/12345/casts?limit=100
```

### Response Structures

#### User Object

```typescript
{
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
    location: {
      description: string;
    };
  };
  follower_count: number;
  following_count: number;
  verifications: string[];
  active_status: string;
}
```

#### Cast Object

```typescript
{
  hash: string;
  thread_hash: string;
  parent_hash: string | null;
  author: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
  };
  text: string;
  timestamp: string;
  embeds: any[];
  reactions: {
    likes: Array<{ fid: number; fname: string }>;
    recasts: Array<{ fid: number; fname: string }>;
  };
  replies: {
    count: number;
  };
  mentioned: Array<{ fid: number; fname: string }>;
}
```

## Future Endpoints

### Notifications API

Currently, our application simulates notifications locally. When Neynar implements a notifications API, we expect it to look something like:

```text
POST /notifications/send
```

With a request body like:

```json
{
  "recipient_fid": 12345,
  "title": "Notification Title",
  "body": "Notification body text",
  "url": "https://app.example.com/action-url"
}
```

This documentation will be updated as the Neynar API evolves and more endpoints become available.
