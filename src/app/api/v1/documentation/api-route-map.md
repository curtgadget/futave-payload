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

#### Shared Handler Pattern for Team Sub-Resources

The following endpoints are all powered by a shared handler abstraction, ensuring consistent authentication, team ID parsing, error handling, and response formatting:
- `/v1/team/:id/fixtures`
- `/v1/team/:id/squad`
- `/v1/team/:id/table`
- `/v1/team/:id/stats`

This pattern reduces code duplication and makes it easy to add new sub-resources. Each endpoint specifies its fetcher and, if needed, a query parser.

**Example: Adding a new sub-resource endpoint**
```typescript
import { createTeamSubResourceEndpoint } from './utils/createTeamSubResourceEndpoint'
import { teamDataFetcher } from './services/teamDataFetcher'

export default createTeamSubResourceEndpoint({
  resource: 'myresource',
  fetcher: teamDataFetcher.getMyResource,
  parseQuery: (url) => ({ custom: url.searchParams.get('custom') }), // optional
})
```

---

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

#### GET /api/v1/team/:id/overview

Get a streamlined team overview optimized for dashboard-style display, similar to FotMob's team overview page. Combines key data from multiple endpoints into a single response.

**Features:**
- Team form (last 5 matches as W/L/D)
- Next upcoming match details
- Current league position and form
- Top season statistics (top rated players, scorers, assists)
- Recent fixture results

**Response:**
```json
{
  "id": "62",
  "name": "Team Name",
  "season_id": 12345,
  "season_name": "2024/25",
  "form": [
    {
      "id": "match123",
      "result": "W",
      "final_score": {
        "home": 2,
        "away": 1
      },
      "opponent": {
        "id": 45,
        "name": "Opponent Team",
        "image_path": "https://example.com/opponent-logo.png"
      },
      "home_away": "home",
      "starting_at": "2024-01-15T15:00:00Z"
    }
    // 4 more recent matches
  ],
  "next_match": {
    "starting_at": "2024-02-01T19:30:00Z",
    "league": {
      "id": 789,
      "name": "Premier League"
    },
    "home_team": {
      "id": 62,
      "name": "Team Name",
      "image_path": "https://example.com/team-logo.png"
    },
    "away_team": {
      "id": 123,
      "name": "Opponent Team",
      "image_path": "https://example.com/opponent-logo.png"
    },
    "home_position": 2,
    "away_position": 7
  },
  "current_position": {
    "position": 2,
    "points": 75,
    "played": 38,
    "goal_difference": 39,
    "form": ["D", "D", "W", "W", "D"],
    "qualification_status": {
      "type": "champions_league",
      "name": "Champions League Qualification",
      "color": "#1f77b4"
    }
  },
  "stats": {
    "top_rated": [
      {
        "player_id": "1001",
        "name": "Top Player",
        "image_path": "https://example.com/player1.png",
        "value": 8.5,
        "position": "Midfielder"
      }
      // 2 more top rated players
    ],
    "top_scorers": [
      {
        "player_id": "1002",
        "name": "Goal Scorer",
        "image_path": "https://example.com/player2.png",
        "value": 18,
        "position": "Forward"
      }
      // 2 more top scorers
    ],
    "top_assists": [
      {
        "player_id": "1003",
        "name": "Playmaker",
        "image_path": "https://example.com/player3.png",
        "value": 12,
        "position": "Midfielder"
      }
      // 2 more top assist providers
    ]
  },
  "recent_fixtures": [
    {
      "id": "match456",
      "starting_at": "2024-01-15T15:00:00Z",
      "starting_at_timestamp": 1705332000,
      "name": "Team Name vs Opponent",
      "league": {
        "id": 789,
        "name": "Premier League",
        "short_code": "PL",
        "image_path": "https://example.com/league.png"
      },
      "season": {
        "id": 12345,
        "name": "2024/25"
      },
      "participants": [
        {
          "id": 62,
          "name": "Team Name",
          "image_path": "https://example.com/team-logo.png",
          "meta": {
            "location": "home"
          }
        },
        {
          "id": 45,
          "name": "Opponent Team",
          "image_path": "https://example.com/opponent-logo.png",
          "meta": {
            "location": "away"
          }
        }
      ],
      "final_score": {
        "home": 2,
        "away": 1
      },
      "state": {
        "id": 3,
        "name": "Finished",
        "short_name": "FT"
      }
    }
    // 2 more recent fixtures
  ]
}
```

**Key Features:**
- **Compact Response**: Single endpoint for dashboard views
- **Form Analysis**: Last 5 matches with results, scores, and opponents
- **League Context**: Current position, points, and qualification status
- **Player Highlights**: Top 3 players in key categories (rating, goals, assists)
- **Smart Data**: Combines data from fixtures, table, and stats endpoints
- **Performance Optimized**: Parallel data fetching for fast response times

#### GET /api/v1/team/:id/fixtures

Get fixtures/results for a specific team optimized for mobile and web app UX. Smart default shows upcoming fixtures when available, otherwise shows past results.

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of fixtures to return (default: 10, max: 100)
- `type` (string, optional): Filter by match type. Options: `all`, `past`, `upcoming` (default: smart auto-detection)
- `includeNextMatch` (boolean, optional): Whether to include next upcoming match details in response (default: false)

**Response:**
```json
{
  "docs": [
    {
      "id": "12345",
      "starting_at": "2023-05-20T15:00:00Z",
      "starting_at_timestamp": 1684594800,
      "name": "Team A vs Team B",
      "state": {
        "id": 1,
        "name": "Finished",
        "short_name": "FT"
      },
      "league": {
        "id": 789,
        "name": "Premier League",
        "short_code": "PL",
        "image_path": "https://example.com/league.png"
      },
      "season": { "id": 101, "name": "2023/2024" },
      "participants": [
        {
          "id": 123,
          "name": "Team A",
          "short_code": "TAM",
          "image_path": "https://example.com/team-a.png",
          "meta": { "location": "home" }
        },
        {
          "id": 456,
          "name": "Team B",
          "short_code": "TBM",
          "image_path": "https://example.com/team-b.png",
          "meta": { "location": "away" }
        }
      ],
      "final_score": {
        "home": 2,
        "away": 1
      }
    }
    // More fixtures...
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2,
      "type": "upcoming",
      "hasMorePages": true,
      "hasPreviousPages": false,
      "nextPage": "/api/v1/team/123/fixtures?page=2&limit=10&type=upcoming",
      "previousPage": null,
      "hasNewer": true,
      "hasOlder": true,
      "newerUrl": "/api/v1/team/123/fixtures?page=2&limit=10&type=upcoming",
      "olderUrl": "/api/v1/team/123/fixtures?page=1&limit=10&type=past"
    }
  },
  "nextMatch": {
    "starting_at": "2023-05-25T19:30:00Z",
    "league": { "id": 789, "name": "Premier League" },
    "home_team": {
      "id": 123,
      "name": "Team A",
      "image_path": "https://example.com/team-a.png"
    },
    "away_team": {
      "id": 789,
      "name": "Team C",
      "image_path": "https://example.com/team-c.png"
    },
    "home_position": 3,
    "away_position": 7,
    "home_goals_per_match": 2.1,
    "away_goals_per_match": 1.8,
    "home_goals_conceded_per_match": 1.2,
    "away_goals_conceded_per_match": 1.5
  }
}
```

**UX-Optimized Navigation:**
- **Smart defaults**: Automatically shows upcoming fixtures when available, falls back to past results
- **Always shows content**: No empty pages - users always see relevant fixtures
- **Smart sorting**: Upcoming fixtures sorted soonest-first, past fixtures most-recent-first
- **Temporal navigation**: `newerUrl`/`olderUrl` for intuitive time-based browsing
- **Client-friendly buttons**: 
  - Use `newerUrl` for "Show more upcoming" or "Future →" buttons
  - Use `olderUrl` for "Show past results" or "← Past" buttons
- **Standard pagination**: `nextPage`/`previousPage` for traditional page navigation
- **Complete URLs**: All navigation URLs are provided ready-to-use
- **Optional next match**: Rich next match data only when `includeNextMatch=true`

**Smart Default Logic:**
1. **Has upcoming fixtures?** → Show upcoming (soonest first)
2. **No upcoming, has past?** → Show past (most recent first)  
3. **No fixtures at all?** → Show empty with helpful navigation

#### GET /api/v1/team/:id/squad

Get the current squad for a specific team.

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
    // More players...
  ]
}
```

#### GET /api/v1/team/:id/table

Get the current league table for the team's league and season.

**Response:**
```json
{
  "data": [
    {
      "position": 1,
      "team": {
        "id": 123,
        "name": "Team Name"
      },
      "points": 75,
      "played": 38,
      "won": 24,
      "drawn": 3,
      "lost": 11,
      // ... other table fields
    }
    // More teams...
  ]
}
```

#### GET /api/v1/team/:id/stats

Get season stats for a specific team. Optionally filter by season.

**Query Parameters:**
- `season` (string, optional): Season ID to filter stats

**Response:**
```json
{
  "data": {
    "matches_played": 38,
    "wins": 24,
    "draws": 3,
    "losses": 11,
    "goals_scored": 85,
    "goals_conceded": 40,
    // ... other stats fields
  }
}
```

---

> **Deprecated:** The previous `tab` query parameter approach (e.g., `/v1/team/:id?tab=fixtures`) is no longer supported. Use the new sub-resource endpoints for all team data views.

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
