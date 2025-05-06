# Futave API Route Map

This document outlines all API endpoints for the Futave application, including their HTTP methods, parameters, authentication requirements, and expected responses.

## API Base URL

All API endpoints are prefixed with `/api/v1`.

## Authentication

Most endpoints require authentication using an API key. The API key must be included in the request headers as follows:

```
Authorization: API-Key YOUR_API_KEY
```

For development purposes, authentication is bypassed in development mode.

## Common Query Parameters

These parameters can be used with most GET (list) endpoints:

- `page`: Page number for pagination (default: 1)
- `limit`: Number of items per page (default: 50, max: 100)
- `sort`: Field to sort by (prefix with `-` for descending order)

## Common Response Format

All endpoints return responses in the following format:

```json
{
  "data": {
    // Response data specific to the endpoint
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 250,
      "totalPages": 5
    }
  }
}
```

Error responses follow this format:

```json
{
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": {}  // Optional additional details
  }
}
```

## Core Entity Endpoints

### Teams

#### GET /api/v1/teams

List all teams with pagination.

**Query Parameters:**
- `country_id`: Filter by country ID
- `search`: Search teams by name

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "name": "Team Name",
      "logo": "https://...",
      "country": {
        "id": 456,
        "name": "Country Name"
      },
      "league": {
        "id": 789,
        "name": "League Name"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 250,
      "totalPages": 5
    }
  }
}
```

#### GET /api/v1/team/:id

Get details for a specific team.

**Query Parameters:**
- `tab`: View type (options: "overview", "fixtures", "stats")
- `page`: For paginated views like fixtures (default: 1)
- `limit`: Items per page (default: 50)
- `season`: Season ID for stats view
- `include_all_players`: Include all players in stats view (default: false)

**Response:**
```json
{
  "data": {
    "id": 123,
    "name": "Team Name",
    "logo": "https://...",
    "country": {
      "id": 456,
      "name": "Country Name"
    },
    "league": {
      "id": 789,
      "name": "League Name"
    },
    "players": [...],  // Only included in certain views
    "fixtures": [...],  // Only included in fixtures view
    "stats": {...}      // Only included in stats view
  }
}
```

### Leagues

#### GET /api/v1/leagues

List all leagues with pagination.

**Query Parameters:**
- `country_id`: Filter by country ID
- `search`: Search leagues by name
- `season`: Filter by season ID

**Response:**
```json
{
  "data": [
    {
      "id": 789,
      "name": "League Name",
      "logo": "https://...",
      "country": {
        "id": 456,
        "name": "Country Name"
      },
      "current_season": {
        "id": 101,
        "name": "2023/2024"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 100,
      "totalPages": 2
    }
  }
}
```

#### GET /api/v1/league/:id

Get details for a specific league.

**Query Parameters:**
- `tab`: View type (options: "overview", "standings", "teams", "seasons")
- `season_id`: Season ID for standings view (defaults to current season)

**Response:**
```json
{
  "data": {
    "id": 789,
    "name": "League Name",
    "logo": "https://...",
    "country": {
      "id": 456,
      "name": "Country Name"
    },
    "seasons": [...],    // List of seasons
    "teams": [...],      // Only included in teams view
    "standings": [...]   // Only included in standings view
  }
}
```

### Players

#### GET /api/v1/players

List all players with pagination.

**Query Parameters:**
- `team_id`: Filter by team ID
- `country_id`: Filter by country ID
- `position`: Filter by position
- `search`: Search players by name

**Response:**
```json
{
  "data": [
    {
      "id": 321,
      "name": "Player Name",
      "position": "Forward",
      "nationality": "Country Name",
      "team": {
        "id": 123,
        "name": "Team Name"
      },
      "photo": "https://..."
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 500,
      "totalPages": 10
    }
  }
}
```

#### GET /api/v1/player/:id

Get details for a specific player.

**Query Parameters:**
- `tab`: View type (options: "overview", "stats", "career")
- `season_id`: Season ID for stats view

**Response:**
```json
{
  "data": {
    "id": 321,
    "name": "Player Name",
    "position": "Forward",
    "nationality": "Country Name",
    "dateOfBirth": "1995-05-15",
    "height": "185 cm",
    "weight": "75 kg",
    "team": {
      "id": 123,
      "name": "Team Name"
    },
    "photo": "https://...",
    "stats": {...},      // Only included in stats view
    "career": [...]      // Only included in career view
  }
}
```

### Matches

#### GET /api/v1/matches

List matches with pagination.

**Query Parameters:**
- `league_id`: Filter by league ID
- `team_id`: Filter by team ID
- `date_from`: Filter matches from this date (YYYY-MM-DD)
- `date_to`: Filter matches to this date (YYYY-MM-DD)
- `status`: Filter by match status (e.g., "upcoming", "live", "finished")

**Response:**
```json
{
  "data": [
    {
      "id": 555,
      "league": {
        "id": 789,
        "name": "League Name"
      },
      "homeTeam": {
        "id": 123,
        "name": "Home Team",
        "logo": "https://..."
      },
      "awayTeam": {
        "id": 124,
        "name": "Away Team",
        "logo": "https://..."
      },
      "score": {
        "home": 2,
        "away": 1
      },
      "status": "FULL_TIME",
      "startingAt": "2023-05-20T15:00:00Z",
      "venue": {
        "name": "Stadium Name",
        "city": "City"
      },
      "waveScore": 85  // Match significance score (0-100)
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 150,
      "totalPages": 3
    }
  }
}
```

#### GET /api/v1/match/:id

Get details for a specific match.

**Query Parameters:**
- `tab`: View type (options: "overview", "lineup", "stats", "events", "avenue")

**Response:**
```json
{
  "data": {
    "id": 555,
    "league": {
      "id": 789,
      "name": "League Name"
    },
    "homeTeam": {
      "id": 123,
      "name": "Home Team",
      "logo": "https://..."
    },
    "awayTeam": {
      "id": 124,
      "name": "Away Team",
      "logo": "https://..."
    },
    "score": {
      "home": 2,
      "away": 1,
      "halfTime": {
        "home": 1,
        "away": 0
      }
    },
    "status": "FULL_TIME",
    "startingAt": "2023-05-20T15:00:00Z",
    "venue": {
      "name": "Stadium Name",
      "city": "City"
    },
    "waveScore": 85,
    "events": [...],    // Match events (goals, cards, etc.)
    "lineups": {...},   // Only included in lineup view
    "stats": {...},     // Only included in stats view
    "avenue": {...}     // Only included in avenue view
  }
}
```

## Feature Endpoints

### Wave Detector

#### GET /api/v1/wave/active

Get currently active matches with high wave scores.

**Query Parameters:**
- `threshold`: Minimum wave score (default: 60)
- `league_id`: Filter by league ID

**Response:**
```json
{
  "data": [
    {
      "id": 555,
      "league": {
        "id": 789,
        "name": "League Name"
      },
      "homeTeam": {
        "id": 123,
        "name": "Home Team",
        "logo": "https://..."
      },
      "awayTeam": {
        "id": 124,
        "name": "Away Team",
        "logo": "https://..."
      },
      "score": {
        "home": 2,
        "away": 1
      },
      "status": "IN_PLAY",
      "startingAt": "2023-05-20T15:00:00Z",
      "waveScore": 85,
      "waveTrend": "rising",  // rising, falling, stable
      "waveFactors": {
        "goalsRecent": 25,
        "comeback": 30,
        "importance": 15,
        "rivalry": 15
      }
    }
  ]
}
```

#### GET /api/v1/wave/weekend

Get upcoming weekend matches with predicted wave scores.

**Query Parameters:**
- `from_date`: Start date (default: upcoming Friday)
- `to_date`: End date (default: upcoming Sunday)

**Response:**
```json
{
  "data": [
    {
      "id": 556,
      "league": {
        "id": 789,
        "name": "League Name"
      },
      "homeTeam": {
        "id": 123,
        "name": "Home Team",
        "logo": "https://..."
      },
      "awayTeam": {
        "id": 124,
        "name": "Away Team",
        "logo": "https://..."
      },
      "startingAt": "2023-05-20T15:00:00Z",
      "predictedWaveScore": 75,
      "importance": "high",
      "reasonsToWatch": [
        "Title race implications",
        "Historical rivalry",
        "Star player return from injury"
      ]
    }
  ]
}
```

### Memory Avenues

#### GET /api/v1/avenue/match/:id

Get memory avenue for a specific match.

**Query Parameters:**
- `type`: Avenue type (options: "highlights", "tactical", "emotional", "comprehensive")

**Response:**
```json
{
  "data": {
    "matchId": 555,
    "matchDetails": {
      "homeTeam": "Home Team",
      "awayTeam": "Away Team",
      "score": {
        "home": 2,
        "away": 1
      },
      "date": "2023-05-20T15:00:00Z"
    },
    "avenueName": "The Comeback Story",
    "avenueType": "emotional",
    "pathways": [
      {
        "minute": 15,
        "event": "goal",
        "description": "Away Team takes the lead",
        "significance": "high",
        "mediaUrl": "https://..."
      },
      {
        "minute": 65,
        "event": "goal",
        "description": "Home Team equalizes",
        "significance": "critical",
        "mediaUrl": "https://..."
      },
      {
        "minute": 87,
        "event": "goal",
        "description": "Last-minute winner for Home Team",
        "significance": "match-defining",
        "mediaUrl": "https://..."
      }
    ],
    "narrative": "An incredible comeback story as Home Team recovered from an early deficit..."
  }
}
```

## User Management

### GET /api/v1/user/preferences

Get current user preferences (requires authentication).

**Response:**
```json
{
  "data": {
    "favoriteTeams": [
      {
        "id": 123,
        "name": "Team Name"
      }
    ],
    "favoriteLeagues": [
      {
        "id": 789,
        "name": "League Name"
      }
    ],
    "favoritePlayers": [
      {
        "id": 321,
        "name": "Player Name"
      }
    ],
    "settings": {
      "notifications": {
        "goals": true,
        "matchStart": true,
        "waveThreshold": 75
      },
      "display": {
        "theme": "dark"
      }
    }
  }
}
```

### PUT /api/v1/user/preferences

Update user preferences (requires authentication).

**Request Body:**
```json
{
  "favoriteTeams": [123, 125],
  "favoriteLeagues": [789],
  "favoritePlayers": [321, 322],
  "settings": {
    "notifications": {
      "goals": true,
      "matchStart": false,
      "waveThreshold": 80
    },
    "display": {
      "theme": "light"
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "message": "Preferences updated successfully"
  }
}
```

## Reference Data

### GET /api/v1/countries

List all countries.

**Query Parameters:**
- `page`: Page number for pagination (default: 1)
- `limit`: Number of items per page (default: 50)

**Response:**
```json
{
  "data": [
    {
      "id": 456,
      "name": "Country Name",
      "code": "CN",
      "flag": "https://..."
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 250,
      "totalPages": 5
    }
  }
}
```

## Implementation Guide

### Adding a New API Endpoint

To add a new API endpoint, create a new file in the `src/app/api/v1` directory and follow this pattern:

```typescript
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'

// Handler function for your endpoint
const getDataHandler = async (req: PayloadRequest) => {
  // Your implementation here
  return new Response(
    JSON.stringify({
      data: { /* Your data */ },
      meta: { /* Meta information */ }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

// Main handler with authentication
const endpointHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult // Authentication failed
  }

  return getDataHandler(req)
}

export default endpointHandler
```

Then, register your endpoint in the `src/app/api/v1/index.ts` file:

```typescript
import type { APIRouteV1 } from './types'
import yourEndpointHandler from './your-endpoint'

const apiV1Routes: APIRouteV1[] = [
  // Existing routes
  {
    path: '/v1/your-endpoint',
    method: 'get',
    handler: yourEndpointHandler,
  },
]

export default apiV1Routes
```
