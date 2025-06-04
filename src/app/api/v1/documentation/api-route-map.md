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

Get a streamlined team overview optimized for dashboard-style display. Combines key data from multiple endpoints into a single response.

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

#### GET /api/v1/league/:id/overview

Get a compact league overview optimized for dashboard-style display. Aggregates key data from table, stats, and matches into a single response.

**Query Parameters:**
- `season_id` (string, optional): Season ID to display data for. If not provided, uses the current season or most recent available season.

**Features:**
- League table summary (top teams, promotion zone, relegation zone)
- Upcoming matches and recent results
- Top players (scorers, assists, overall performers)
- League metadata (teams count, goals, averages)
- Season switching support for historical data

**Response:**
```json
{
  "id": "501",
  "name": "Premiership",
  "logo": "https://example.com/league-logo.png",
  "country": {
    "id": "237",
    "name": "Scotland",
    "flag": "https://example.com/scotland-flag.png"
  },
  "season_id": 23614,
  "season_name": "2024/25",
  "seasons": [
    {
      "id": "23614",
      "name": "2024/25"
    },
    {
      "id": "22100",
      "name": "2023/24"
    },
    {
      "id": "19735",
      "name": "2022/23"
    }
    // More seasons...
  ],
  "table_summary": {
    "top_teams": [
      {
        "id": "62",
        "name": "Rangers",
        "logo": "https://example.com/rangers-logo.png",
        "position": 1,
        "points": 75,
        "played": 38,
        "goal_difference": 39,
        "form": ["W", "W", "D", "W", "L"],
        "qualification_status": {
          "type": "champions_league",
          "name": "Champions League Qualification",
          "color": "#1f77b4"
        }
      }
      // 2 more top teams
    ],
    "promotion_teams": [
      {
        "id": "123",
        "name": "Hibernian",
        "logo": "https://example.com/hibs-logo.png",
        "position": 3,
        "points": 68,
        "played": 38,
        "goal_difference": 25,
        "form": ["D", "W", "W", "L", "W"],
        "qualification_status": {
          "type": "europa_playoff",
          "name": "Europa League Playoffs",
          "color": "#ff7f0e"
        }
      }
      // More promotion/playoff teams
    ],
    "relegation_teams": [
      {
        "id": "456",
        "name": "Livingston",
        "logo": "https://example.com/livi-logo.png",
        "position": 12,
        "points": 25,
        "played": 38,
        "goal_difference": -35,
        "form": ["L", "L", "D", "L", "L"],
        "qualification_status": {
          "type": "relegation",
          "name": "Relegation",
          "color": "#d62728"
        }
      }
      // More relegation zone teams
    ]
  },
  "upcoming_matches": [
    {
      "id": "match123",
      "starting_at": "2024-02-03T15:00:00Z",
      "starting_at_timestamp": 1706972400,
      "home_team": {
        "id": 62,
        "name": "Rangers",
        "image_path": "https://example.com/rangers-logo.png",
        "position": 1
      },
      "away_team": {
        "id": 53,
        "name": "Celtic",
        "image_path": "https://example.com/celtic-logo.png",
        "position": 2
      },
      "state": {
        "id": 1,
        "name": "Not Started",
        "short_name": "NS"
      }
    }
    // 4 more upcoming matches
  ],
  "recent_results": [
    {
      "id": "match456",
      "starting_at": "2024-01-27T15:00:00Z",
      "starting_at_timestamp": 1706367600,
      "home_team": {
        "id": 53,
        "name": "Celtic",
        "image_path": "https://example.com/celtic-logo.png"
      },
      "away_team": {
        "id": 62,
        "name": "Rangers", 
        "image_path": "https://example.com/rangers-logo.png"
      },
      "state": {
        "id": 3,
        "name": "Finished",
        "short_name": "FT"
      },
      "final_score": {
        "home": 2,
        "away": 3
      }
    }
    // 4 more recent results
  ],
  "stats_summary": {
    "top_scorers": [
      {
        "player_id": "1001",
        "name": "Cyriel Dessers",
        "team_name": "Rangers",
        "team_logo": "https://example.com/rangers-logo.png",
        "image_path": "https://example.com/dessers.png",
        "value": 18,
        "position": "Forward"
      }
      // 4 more top scorers
    ],
    "top_assists": [
      {
        "player_id": "1002",
        "name": "James Tavernier",
        "team_name": "Rangers",
        "team_logo": "https://example.com/rangers-logo.png",
        "image_path": "https://example.com/tavernier.png",
        "value": 12,
        "position": "Defender"
      }
      // 4 more top assist providers
    ],
    "top_rated": [
      {
        "player_id": "1003",
        "name": "Todd Cantwell",
        "team_name": "Rangers",
        "team_logo": "https://example.com/rangers-logo.png",
        "image_path": "https://example.com/cantwell.png",
        "value": 25,
        "position": "Midfielder"
      }
      // 4 more top performers (goals + assists)
    ]
  },
  "metadata": {
    "total_teams": 12,
    "total_matches_played": 228,
    "total_goals": 598,
    "average_goals_per_match": 2.62
  }
}
```

**Key Features:**
- **Compact Response**: Single endpoint for dashboard views
- **Table Context**: Shows top performers, promotion candidates, and relegation battles
- **Match Schedule**: Next 5 upcoming matches and last 5 results
- **Player Rankings**: Top 5 players in key categories with team context
- **Smart Data**: Aggregates data from table, stats, and matches endpoints
- **Performance Optimized**: Parallel data fetching for fast response times

#### GET /api/v1/league/:id/table

Get the current league table/standings.

**Query Parameters:**
- `season_id`: Season ID (optional, defaults to current season)

**Response:**
```json
{
  "23614": {
    "id": 23614,
    "name": "Premiership",
    "type": "domestic",
    "league_id": 501,
    "season_id": 23614,
    "stage_id": null,
    "stage_name": null,
    "standings": [
      {
        "id": 501,
        "name": "Premiership",
        "type": "league",
        "standings": [
          {
            "position": 1,
            "team_id": 62,
            "team_name": "Rangers",
            "team_logo_path": "https://example.com/rangers-logo.png",
            "points": 75,
            "played": 38,
            "won": 24,
            "draw": 3,
            "lost": 11,
            "goals_for": 85,
            "goals_against": 46,
            "goal_difference": 39,
            "form": "WWDWL",
            "current_streak": "L1",
            "clean_sheets": 15,
            "failed_to_score": 5,
            "qualification_status": {
              "type": "champions_league",
              "name": "Champions League Qualification",
              "color": "#1f77b4"
            }
          }
          // More teams...
        ]
      }
    ]
  }
}
```

#### GET /api/v1/league/:id/matches

Get matches for a specific league with smart defaults and temporal navigation.

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of matches to return (default: 50, max: 100)
- `season_id` (string, optional): Filter by season ID
- `type` (string, optional): Filter by match type. Options: `all`, `past`, `upcoming`, `auto` (default: auto)
- `includeNextMatch` (boolean, optional): Whether to include next upcoming match details (default: false)

**Response:**
```json
{
  "docs": [
    {
      "id": "12345",
      "starting_at": "2024-02-03T15:00:00Z",
      "starting_at_timestamp": 1706972400,
      "league": {
        "id": 501,
        "name": "Premiership"
      },
      "home_team": {
        "id": 62,
        "name": "Rangers",
        "image_path": "https://example.com/rangers-logo.png"
      },
      "away_team": {
        "id": 53,
        "name": "Celtic",
        "image_path": "https://example.com/celtic-logo.png"
      },
      "result_info": null,
      "state": {
        "id": 1,
        "name": "Not Started",
        "short_name": "NS"
      }
    }
    // More matches...
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3,
      "type": "upcoming",
      "hasMorePages": true,
      "hasPreviousPages": false,
      "nextPage": "/api/v1/league/501/matches?page=2&limit=50&type=upcoming",
      "previousPage": null,
      "hasNewer": true,
      "hasOlder": true,
      "newerUrl": "/api/v1/league/501/matches?page=2&limit=50&type=upcoming",
      "olderUrl": "/api/v1/league/501/matches?page=1&limit=50&type=past"
    }
  },
  "nextMatch": {
    "starting_at": "2024-02-03T15:00:00Z",
    "league": { "id": 501, "name": "Premiership" },
    "home_team": {
      "id": 62,
      "name": "Rangers",
      "image_path": "https://example.com/rangers-logo.png"
    },
    "away_team": {
      "id": 53,
      "name": "Celtic",
      "image_path": "https://example.com/celtic-logo.png"
    },
    "home_position": 1,
    "away_position": 2
  }
}
```

#### GET /api/v1/league/:id/teams

Get all teams in a specific league.

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of teams to return (default: 50)

**Response:**
```json
{
  "id": "501",
  "name": "Premiership",
  "teams": [
    {
      "id": "62",
      "name": "Rangers",
      "logo": "https://example.com/rangers-logo.png",
      "venue_name": "Ibrox Stadium",
      "founded": 1872
    },
    {
      "id": "53",
      "name": "Celtic",
      "logo": "https://example.com/celtic-logo.png",
      "venue_name": "Celtic Park",
      "founded": 1887
    }
    // More teams...
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalItems": 12,
    "totalPages": 1
  }
}
```

#### GET /api/v1/league/:id/stats

Get comprehensive statistics for a league season including player and team rankings.

**Query Parameters:**
- `season_id` (string, optional): Season ID to filter stats (defaults to current season)

**Response:**
```json
{
  "id": "501",
  "name": "Premiership",
  "season_id": 23614,
  "season_name": "2024/25",
  "seasons": [
    {
      "id": "23614",
      "name": "2024/25"
    },
    {
      "id": "22100",
      "name": "2023/24"
    },
    {
      "id": "19735",
      "name": "2022/23"
    }
    // More seasons...
  ],
  "overview": {
    "teams_count": 12,
    "total_players": 350,
    "total_goals": 598,
    "total_assists": 412,
    "total_yellow_cards": 823,
    "total_red_cards": 45,
    "total_appearances": 4560,
    "total_minutes_played": 342000,
    "average_goals_per_player": 1.71,
    "average_assists_per_player": 1.18
  },
  "player_stats": {
    "top_scorers": {
      "category": "goals",
      "label": "Top Goal Scorers",
      "players": [
        {
          "player_id": "1001",
          "name": "Cyriel Dessers",
          "team_id": "62",
          "team_name": "Rangers",
          "team_logo": "https://example.com/rangers-logo.png",
          "position_id": 27,
          "jersey_number": 9,
          "image_path": "https://example.com/dessers.png",
          "value": 18,
          "appearances": 35,
          "rank": 1
        }
        // More players...
      ]
    },
    "top_assists": {
      "category": "assists",
      "label": "Most Assists",
      "players": [...]
    },
    "most_minutes": {
      "category": "minutes",
      "label": "Most Minutes Played",
      "players": [...]
    },
    "top_goals_assists": {
      "category": "goals_assists",
      "label": "Goals + Assists",
      "players": [...]
    }
  },
  "team_stats": {
    "attack": {
      "category": "attack",
      "label": "Goals Scored",
      "teams": [
        {
          "team_id": "62",
          "team_name": "Rangers",
          "team_logo": "https://example.com/rangers-logo.png",
          "value": 85,
          "rank": 1,
          "additional_stats": {
            "shots": 524,
            "shots_on_target": 213,
            "corners": 178
          }
        }
        // More teams...
      ]
    },
    "defense": {
      "category": "defense",
      "label": "Clean Sheets",
      "teams": [...]
    },
    "discipline": {
      "category": "discipline",
      "label": "Best Disciplinary Record",
      "teams": [...]
    },
    "performance": {
      "category": "performance",
      "label": "Most Wins",
      "teams": [...]
    }
  }
}
```

#### GET /api/v1/league/:id/seasons

Get all available seasons for a league. Useful for populating season selection dropdowns.

**Response:**
```json
{
  "id": "501",
  "name": "Premiership",
  "seasons": [
    {
      "id": "23614",
      "name": "2024/25",
      "start_date": "2024-08-03",
      "end_date": "2025-05-25",
      "current": true,
      "coverage": {
        "fixtures": true,
        "standings": true,
        "players": true,
        "top_scorers": true,
        "predictions": false,
        "odds": false
      }
    },
    {
      "id": "22100",
      "name": "2023/24",
      "start_date": "2023-08-05",
      "end_date": "2024-05-19",
      "current": false,
      "coverage": {
        "fixtures": true,
        "standings": true,
        "players": true,
        "top_scorers": true,
        "predictions": false,
        "odds": false
      }
    }
    // More seasons...
  ]
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

Get comprehensive details for a specific player including career history, statistics, and achievements.

**Query Parameters:**
- `tab`: View type (options: "overview", "stats", "career")
- `season_id`: Season ID for stats view (optional)

**Response (Overview):**
```json
{
  "data": {
    "id": 321,
    "name": "Player Name",
    "display_name": "Display Name",
    "common_name": "Common Name",
    "position": {
      "id": 27,
      "name": "Forward",
      "short_name": "FW"
    },
    "nationality": {
      "id": 456,
      "name": "Country Name",
      "flag": "https://..."
    },
    "dateOfBirth": "1995-05-15",
    "age": 28,
    "height": 185,
    "weight": 75,
    "current_team": {
      "id": 123,
      "name": "Team Name",
      "logo": "https://...",
      "country": {
        "id": 456,
        "name": "Country Name"
      }
    },
    "photo": "https://...",
    "market_value": 25000000,
    "contract_until": "2026-06-30",
    "preferred_foot": "Right",
    "jersey_number": 10
  }
}
```

**Response (Career):**
```json
{
  "data": {
    "id": 321,
    "name": "Player Name",
    "career_summary": {
      "total_clubs": 4,
      "total_appearances": 287,
      "total_goals": 89,
      "total_assists": 34,
      "career_span": "2018-2024",
      "countries_played": ["England", "Spain", "Germany"]
    },
    "career_history": [
      {
        "season": "2023/24",
        "team": {
          "id": 123,
          "name": "Current Team",
          "logo": "https://...",
          "country": "England"
        },
        "league": {
          "id": 789,
          "name": "Premier League",
          "level": 1
        },
        "position": "Forward",
        "appearances": 34,
        "goals": 18,
        "assists": 12,
        "minutes": 2856,
        "yellow_cards": 3,
        "red_cards": 0,
        "rating": 7.8,
        "start_date": "2023-07-01",
        "end_date": null,
        "loan": false,
        "transfer_fee": 15000000
      }
      // More seasons...
    ],
    "achievements": [
      {
        "type": "trophy",
        "name": "Premier League",
        "season": "2023/24",
        "team": "Current Team"
      },
      {
        "type": "individual",
        "name": "Top Scorer",
        "season": "2022/23",
        "value": 25
      }
    ],
    "international_career": {
      "caps": 45,
      "goals": 12,
      "debut": "2020-09-05",
      "competitions": ["World Cup 2022", "Euro 2024"]
    }
  }
}
```

**Response (Stats):**
```json
{
  "data": {
    "id": 321,
    "name": "Player Name",
    "season_stats": {
      "season_id": 23614,
      "season_name": "2024/25",
      "team": {
        "id": 123,
        "name": "Team Name"
      },
      "league": {
        "id": 789,
        "name": "League Name"
      },
      "appearances": 28,
      "starts": 25,
      "minutes": 2340,
      "goals": 15,
      "assists": 8,
      "yellow_cards": 4,
      "red_cards": 0,
      "rating": 7.6,
      "shots": 89,
      "shots_on_target": 34,
      "pass_accuracy": 87.5,
      "dribbles_completed": 45,
      "tackles_won": 23,
      "aerial_duels_won": 67
    },
    "comparison": {
      "league_rank": {
        "goals": 3,
        "assists": 8,
        "rating": 5
      },
      "previous_season": {
        "goals_change": +3,
        "assists_change": -2,
        "rating_change": +0.2
      }
    }
  }
}
```

**Key Features:**
- **Comprehensive Career Data**: Complete transfer history with fees and loan details
- **International Career**: National team statistics and tournament participation
- **Achievements**: Trophies and individual awards throughout career
- **Statistical Analysis**: Season comparisons and league rankings
- **Multi-format Support**: Overview for basic info, career for history, stats for performance

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

#### GET /api/v1/match/:id/:tab?

Get details for a specific match with optional tab-based views.

**Path Parameters:**
- `id`: Match ID (required)
- `tab`: View type (optional, defaults to "overview")
  - `overview`: Complete match details with lineups
  - `lineups`: Detailed lineup information with events and sidelined players

**Response (Overview):**
```json
{
  "data": {
    "id": 555,
    "league": {
      "id": 789,
      "name": "League Name",
      "logo_path": "https://...",
      "country_id": 123
    },
    "homeTeam": {
      "id": 123,
      "name": "Home Team",
      "logo_path": "https://...",
      "country_id": 456
    },
    "awayTeam": {
      "id": 124,
      "name": "Away Team",
      "logo_path": "https://...",
      "country_id": 456
    },
    "score": {
      "home": 2,
      "away": 1
    },
    "status": "FT",
    "startingAt": "2023-05-20T15:00:00Z",
    "venue": {
      "name": "Stadium Name",
      "city": "City"
    },
    "waveScore": 85,
    "events": [...],
    "lineups": {
      "home": {
        "formation": "4-3-3",
        "startingXI": [
          {
            "player_id": 123,
            "player_name": "Player Name",
            "jersey_number": 10,
            "position_id": 27,
            "formation_field": 1,
            "formation_position": 1,
            "events": [...]
          }
        ],
        "bench": [...],
        "sidelined": [
          {
            "player_id": 31626482,
            "type_id": 540,
            "category": "injury",
            "start_date": "2024-07-01",
            "end_date": "2025-03-31",
            "games_missed": 11,
            "completed": true
          }
        ]
      },
      "away": {
        "formation": "4-4-2",
        "startingXI": [...],
        "bench": [...],
        "sidelined": [...]
      }
    },
    "teamForm": {
      "home": [],
      "away": []
    },
    "historicMatchups": [],
    "metadata": {...}
  }
}
```

**Response (Lineups):**
```json
{
  "lineups": {
    "home": {
      "formation": "4-3-3",
      "startingXI": [
        {
          "player_id": 123,
          "player_name": "Player Name",
          "jersey_number": 10,
          "position_id": 27,
          "formation_field": 1,
          "formation_position": 1,
          "events": [
            {
              "id": 456,
              "type_id": 14,
              "minute": 25,
              "description": "Goal"
            }
          ]
        }
      ],
      "bench": [
        {
          "player_id": 124,
          "player_name": "Substitute Player",
          "jersey_number": 22,
          "position_id": 25,
          "events": []
        }
      ],
      "sidelined": [
        {
          "player_id": 31626482,
          "type_id": 540,
          "category": "injury",
          "start_date": "2024-07-01",
          "end_date": "2025-03-31",
          "games_missed": 11,
          "completed": true
        }
      ]
    },
    "away": {
      "formation": "4-4-2",
      "startingXI": [...],
      "bench": [...],
      "sidelined": [...]
    }
  }
}
```

**Key Features:**
- **Sidelined Players**: Comprehensive injury and unavailability information
- **Formation Data**: Team formations extracted from match metadata
- **Player Events**: Goals, cards, and substitutions linked to lineup players
- **Flexible Views**: Overview for complete match data, lineups for detailed team sheets

**Sidelined Players Data Structure:**
Each sidelined player entry includes:
- `player_id`: Unique player identifier
- `type_id`: Type of sideline/injury classification
- `category`: Category of unavailability (e.g., "injury", "suspension")
- `start_date`: When the sideline period began (YYYY-MM-DD)
- `end_date`: Expected return date (null if indefinite)
- `games_missed`: Number of games missed during this period
- `completed`: Whether the sideline period has ended

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

## Recent Updates & Changelog

### January 2025
- **✅ Sidelined Players**: Added comprehensive injury and unavailability data to match lineup endpoints
- **✅ Match API Improvements**: Fixed Mongoose model overwrite errors and enhanced lineup data structure
- **✅ Player Career Data**: Added comprehensive career history, transfer details, and achievements to player API
- **✅ Player Statistics**: Enhanced player stats with position data, team/league context, and trophies
- **✅ API Test Coverage**: Added comprehensive test suite for player API endpoints
- **✅ Database Optimization**: Improved query performance and data structure for player-related endpoints

### December 2024
- **✅ Match Data Sync**: Enhanced Sportmonks integration for better match data synchronization
- **✅ Player Trophies**: Added trophy and achievement data to player responses
- **✅ Team Context**: Improved team and league name resolution across all endpoints

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
