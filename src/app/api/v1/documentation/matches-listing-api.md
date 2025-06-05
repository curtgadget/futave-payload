# Matches Listing API Documentation

The Matches Listing API (`/api/v1/matches`) is a sophisticated endpoint designed to provide flexible, prioritized, and filterable access to match data. This endpoint is inspired by leading sports platforms like FotMob and implements advanced features including league prioritization, smart filtering, and comprehensive match summaries.

## Table of Contents

- [Quick Start](#quick-start)
- [League Prioritization System](#league-prioritization-system)
- [Query Parameters](#query-parameters)
- [Special Views](#special-views)
- [Sorting Options](#sorting-options)
- [Response Format](#response-format)
- [Featured Leagues](#featured-leagues)
- [Filtering Examples](#filtering-examples)
- [Performance & Caching](#performance--caching)
- [Setup & Configuration](#setup--configuration)

## Quick Start

### Basic Usage

```bash
# Get matches with default prioritization
GET /api/v1/matches

# Get today's matches
GET /api/v1/matches?view=today

# Get live matches with featured leagues
GET /api/v1/matches?view=live&include_featured=true

# Filter by specific leagues
GET /api/v1/matches?leagues=8,501,271&sort=priority
```

### Basic Response

```json
{
  "docs": [
    {
      "id": 19419265,
      "starting_at": "2025-05-27T02:00:00Z",
      "state": {
        "short_name": "FT",
        "state": "finished"
      },
      "home_team": {
        "id": 246,
        "name": "Ross County",
        "short_code": "RSC",
        "image_path": "https://cdn.sportmonks.com/images/soccer/teams/22/246.png"
      },
      "away_team": {
        "id": 258,
        "name": "Livingston",
        "short_code": "LIV",
        "image_path": "https://cdn.sportmonks.com/images/soccer/teams/2/258.png"
      },
      "score": {
        "home": 2,
        "away": 4
      },
      "league": {
        "id": 513,
        "name": "Premiership Play-Offs",
        "image_path": "https://cdn.sportmonks.com/images/soccer/leagues/1/513.png",
        "country_id": 1161,
        "priority": 60,
        "tier": "tier3",
        "featured": false
      },
      "venue": {
        "name": "Global Energy Stadium",
        "city": "Dingwall"
      },
      "has_lineups": true,
      "has_events": true
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMorePages": true,
      "hasPreviousPages": false,
      "nextPage": 2,
      "previousPage": null
    }
  }
}
```

## League Prioritization System

The key feature of this API is its sophisticated league prioritization system, ensuring that important matches appear first in listings, similar to how FotMob prioritizes major leagues.

### Priority Calculation

The system uses a **3-tier priority calculation**:

```
Total Priority = Featured Weight + Manual Priority + Tier Weight
```

- **Featured Weight**: 200 points (if `featured: true`)
- **Manual Priority**: 0-150 points (configurable per league)
- **Tier Weight**: 
  - Tier 1: 100 points (Top European leagues)
  - Tier 2: 80 points (Major European leagues) 
  - Tier 3: 60 points (International/Other competitions)
  - Tier 4: 40 points (Lower/Regional leagues)
  - Default: 20 points

### League Configuration

Leagues are configured with three key fields in the Payload CMS:

```typescript
// Example league configuration
{
  "id": 8,
  "name": "Premier League",
  "priority": 120,      // Manual priority (0-150)
  "tier": "tier1",      // Tier classification
  "featured": true      // Featured flag for prominent display
}
```

### Priority Examples

| League | Featured | Priority | Tier | Total Score | Display Order |
|--------|----------|----------|------|-------------|---------------|
| Champions League | ✅ | 130 | tier1 | 430 | 1st |
| Premier League | ✅ | 120 | tier1 | 420 | 2nd |
| Bundesliga | ❌ | 115 | tier1 | 215 | 3rd |
| Superliga (Danish) | ❌ | 75 | tier2 | 155 | 4th |
| Local League | ❌ | 0 | tier4 | 60 | Last |

## Query Parameters

### Pagination
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

### Date Filtering
- `date_from` (string): Start date in YYYY-MM-DD format
- `date_to` (string): End date in YYYY-MM-DD format
- `view` (string): Special time-based views (see [Special Views](#special-views))

### Entity Filtering
- `leagues` (string): Comma-separated league IDs (e.g., "8,501,271")
- `teams` (string): Comma-separated team IDs (e.g., "123,456")
- `status` (string): Comma-separated match states (e.g., "FT,LIVE,NS")

### Search & Sorting
- `search` (string): Search term for team names and league names
- `sort` (string): Sorting method
  - `priority` (default): League priority + match time
  - `time`: Match start time only
  - `relevance`: Priority + relevance scoring

### Featured Leagues
- `include_featured` (boolean): Include featured leagues summary (default: true)
- `only_featured` (boolean): Show only matches from featured leagues (default: false)

## Special Views

The API provides pre-configured views for common use cases:

### `view=today`
Matches scheduled for the current day (00:00 to 23:59 local time).

```bash
GET /api/v1/matches?view=today
```

### `view=live`
Matches currently in progress (live states).

```bash
GET /api/v1/matches?view=live
```

### `view=upcoming`
Future matches that haven't started yet.

```bash
GET /api/v1/matches?view=upcoming&limit=10
```

### `view=recent`
Finished matches from the past 7 days.

```bash
GET /api/v1/matches?view=recent&limit=15
```

## Sorting Options

### Priority Sorting (Default)
Combines league importance with match timing for optimal relevance.

```bash
GET /api/v1/matches?sort=priority
```

**Sort Logic:**
1. Featured leagues first (200+ priority score)
2. High-priority leagues (100+ priority score)
3. Match start time (ascending for upcoming, descending for past)

### Time Sorting
Pure chronological ordering by match start time.

```bash
GET /api/v1/matches?sort=time
```

### Relevance Sorting
Advanced scoring that considers multiple factors.

```bash
GET /api/v1/matches?sort=relevance
```

## Response Format

### Match Summary Object

Each match in the response includes:

```typescript
interface MatchSummary {
  id: number                    // Unique match identifier
  starting_at: string          // ISO 8601 timestamp
  state: {
    short_name: string         // "FT", "LIVE", "NS", etc.
    state: string              // "finished", "inplay", "not_started"
  }
  home_team: TeamSummary       // Home team details
  away_team: TeamSummary       // Away team details
  score: {
    home: number | null        // Home team score
    away: number | null        // Away team score
  }
  league: LeagueSummary        // League with priority info
  venue?: VenueSummary         // Stadium information
  has_lineups?: boolean        // Lineup data availability
  has_events?: boolean         // Match events availability
}
```

### League Summary Object

League information includes prioritization metadata:

```typescript
interface LeagueSummary {
  id: number
  name: string
  image_path?: string
  country_id?: number
  priority?: number            // Manual priority (0-150)
  tier?: string               // "tier1", "tier2", "tier3", "tier4"
  featured?: boolean          // Featured status
}
```

### Pagination Metadata

```typescript
interface PaginationMeta {
  page: number                 // Current page
  limit: number               // Items per page
  total: number               // Total match count
  totalPages: number          // Total page count
  hasMorePages: boolean       // More pages available
  hasPreviousPages: boolean   // Previous pages available
  nextPage: number | null     // Next page number
  previousPage: number | null // Previous page number
  nextPageUrl: string | null  // Ready-to-use next page URL
  previousPageUrl: string | null // Ready-to-use previous page URL
  firstPageUrl: string        // Ready-to-use first page URL
  lastPageUrl: string         // Ready-to-use last page URL
}
```

### Navigation URLs

The API now includes fully constructed navigation URLs in the pagination metadata:

```json
{
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMorePages": true,
      "hasPreviousPages": true,
      "nextPage": 3,
      "previousPage": 1,
      "nextPageUrl": "/api/v1/matches?page=3&limit=20&leagues=8,16&sort=priority",
      "previousPageUrl": "/api/v1/matches?page=1&limit=20&leagues=8,16&sort=priority",
      "firstPageUrl": "/api/v1/matches?page=1&limit=20&leagues=8,16&sort=priority",
      "lastPageUrl": "/api/v1/matches?page=8&limit=20&leagues=8,16&sort=priority"
    }
  }
}
```

These URLs:
- **Preserve all query parameters** from the original request
- **Use relative paths** (no domain/protocol)
- **Handle edge cases** (null for next/previous when not available)
- **Include all filters** (leagues, dates, search terms, etc.)

## Featured Leagues

When `include_featured=true`, the response includes a summary of featured leagues:

```json
{
  "docs": [...],
  "meta": {...},
  "featured_leagues": [
    {
      "id": 8,
      "name": "Premier League",
      "image_path": "https://cdn.sportmonks.com/images/soccer/leagues/8.png",
      "match_count": 5,
      "priority": 120
    },
    {
      "id": 16,
      "name": "Champions League",
      "image_path": "https://cdn.sportmonks.com/images/soccer/leagues/16.png",
      "match_count": 3,
      "priority": 130
    }
  ]
}
```

This data is useful for:
- Creating featured league filters in the UI
- Showing match counts per important league
- Building navigation menus

## Filtering Examples

### Complex Date Range with League Filter

```bash
GET /api/v1/matches?date_from=2025-01-01&date_to=2025-01-31&leagues=8,16&sort=priority
```

### Team-Specific Matches

```bash
GET /api/v1/matches?teams=123,456&view=upcoming&limit=5
```

### Search with Status Filter

```bash
GET /api/v1/matches?search=manchester&status=FT,LIVE&include_featured=true
```

### Featured Leagues Only

```bash
GET /api/v1/matches?only_featured=true&view=today&sort=time
```

## Applied Filters Summary

The response includes a summary of applied filters:

```json
{
  "filters_applied": {
    "date_range": {
      "from": "2025-01-01",
      "to": "2025-01-31"
    },
    "leagues": [8, 16, 501],
    "teams": [123, 456],
    "status": ["FT", "LIVE"],
    "view": "today"
  }
}
```

This helps client applications:
- Display active filters to users
- Build "clear filters" functionality
- Maintain filter state across navigation

## Performance & Caching

### Database Optimization

The API uses MongoDB aggregation pipelines for efficient queries:

```javascript
// Example aggregation pipeline
[
  { $match: { /* filter criteria */ } },
  { $lookup: { 
      from: 'leagues', 
      localField: 'league_id', 
      foreignField: '_id', 
      as: 'league_info' 
  }},
  { $addFields: {
      total_priority: {
        $add: ['$featured_weight', '$league_priority', '$league_tier_weight']
      }
  }},
  { $sort: { total_priority: -1, starting_at: 1 } },
  { $skip: 0 },
  { $limit: 20 }
]
```

### Caching Strategy

Recommended caching approaches:

1. **Static Data**: League priorities and configurations (cache for 1 hour)
2. **Live Matches**: Cache for 30 seconds during active matches
3. **Historical Data**: Cache completed matches for 24 hours
4. **Featured Leagues**: Cache summary data for 15 minutes

### Performance Tips

- Use `limit` parameter to control response size
- Filter by specific leagues when possible
- Use date ranges to limit dataset scope
- Consider `only_featured=true` for lightweight responses

## Setup & Configuration

### 1. Initialize League Priorities

Run the initialization endpoint to set up default league priorities:

```bash
GET /api/init-league-priorities
```

This will:
- Set priorities for known major leagues
- Assign appropriate tiers based on league names
- Configure featured status for top competitions

### 2. Manual Configuration

Configure league settings using the **Featured Leagues Management API** (recommended) or Payload CMS admin panel:

#### Using the Featured Leagues API (Recommended)

For large league datasets where the admin UI becomes slow, use the dedicated management endpoints:

```bash
# View current featured leagues
GET /api/manage-featured-leagues

# Set specific leagues as featured (replaces existing)
POST /api/manage-featured-leagues
{
  "league_ids": [271, 501, 513],
  "clear_existing": true
}

# Update individual league settings
PATCH /api/manage-featured-leagues
{
  "updates": [
    { "id": 271, "featured": true, "priority": 100 },
    { "id": 501, "featured": true, "priority": 90 }
  ]
}

# Get list of all leagues with IDs
GET /api/list-leagues?limit=50
```

#### Using Payload CMS Admin Panel

For smaller datasets, use the admin panel:

1. Navigate to **Collections > Leagues**
2. Edit individual leagues to set:
   - **Priority**: 0-150 (higher = more important)
   - **Tier**: tier1 (top), tier2 (major), tier3 (other), tier4 (lower)
   - **Featured**: Toggle for prominent display

**Note**: If the admin UI crashes due to large league objects, use the API approach above.

### 3. Testing Configuration

Test your configuration with different parameters:

```bash
# Test priority ordering
GET /api/v1/matches?sort=priority&limit=5

# Test featured leagues
GET /api/v1/matches?include_featured=true

# Test tier filtering (via manual league selection)
GET /api/v1/matches?leagues=8,16,271&sort=priority
```

### 4. Monitoring

Monitor the effectiveness of your prioritization:

- Check if important matches appear first
- Verify featured leagues are prominently displayed
- Ensure user engagement with prioritized content

## Featured Leagues Management API

For managing featured leagues when the admin UI becomes slow due to large league objects, use the dedicated management API.

### Endpoints

#### GET /api/manage-featured-leagues
View currently featured leagues with priorities.

```bash
curl 'http://localhost:3000/api/manage-featured-leagues' \
  -H 'Authorization: API-Key your-api-key'
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "featured_leagues": [
    {
      "id": 501,
      "name": "Premiership",
      "priority": 75,
      "tier": "tier2"
    },
    {
      "id": 271,
      "name": "Superliga",
      "priority": 60,
      "tier": "tier2"
    }
  ]
}
```

#### POST /api/manage-featured-leagues
Set featured leagues (bulk operation).

```bash
curl 'http://localhost:3000/api/manage-featured-leagues' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: API-Key your-api-key' \
  -d '{
    "league_ids": [271, 501, 513],
    "clear_existing": true
  }'
```

**Parameters:**
- `league_ids` (array): League IDs to mark as featured
- `clear_existing` (boolean): Whether to clear existing featured leagues first (default: true)

#### PATCH /api/manage-featured-leagues
Update individual league settings.

```bash
curl -X PATCH 'http://localhost:3000/api/manage-featured-leagues' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: API-Key your-api-key' \
  -d '{
    "updates": [
      { "id": 271, "featured": true, "priority": 100 },
      { "id": 501, "featured": false }
    ]
  }'
```

#### GET /api/list-leagues
List all leagues with their IDs and status.

```bash
curl 'http://localhost:3000/api/list-leagues?limit=20&search=premier' \
  -H 'Authorization: API-Key your-api-key'
```

**Parameters:**
- `limit` (number): Maximum leagues to return (default: 50)
- `search` (string): Filter leagues by name

### Authentication

All management endpoints require API authentication:

1. **Development**: No authentication required by default
2. **Production**: Requires `Authorization: API-Key <your-key>` header

To generate an API key:
1. Go to `/admin` in your browser
2. Navigate to **Users** collection
3. Edit a user and enable **"Enable API Key"**
4. Copy the generated key

### Workflow Example

```bash
# 1. Find leagues you want to feature
curl 'http://localhost:3000/api/list-leagues?search=premier'

# 2. Check current featured status
curl 'http://localhost:3000/api/manage-featured-leagues'

# 3. Set new featured leagues
curl -X POST 'http://localhost:3000/api/manage-featured-leagues' \
  -H 'Content-Type: application/json' \
  -d '{"league_ids": [8, 16, 271], "clear_existing": true}'

# 4. Verify in matches API
curl 'http://localhost:3000/api/v1/matches?include_featured=true&limit=5'
```

## Advanced Usage

### Building a FotMob-Style Homepage

```javascript
// Fetch prioritized matches for homepage
const response = await fetch('/api/v1/matches?view=today&include_featured=true&sort=priority&limit=20')
const data = await response.json()

// Featured leagues for quick navigation
const featuredLeagues = data.featured_leagues

// Prioritized matches with important games first
const matches = data.docs
```

### Dynamic League Filtering

```javascript
// Let users filter by league tier
const tier1Leagues = await fetch('/api/v1/leagues?tier=tier1')
const tier1Ids = tier1Leagues.data.map(l => l.id).join(',')

// Get matches from top-tier leagues only
const topMatches = await fetch(`/api/v1/matches?leagues=${tier1Ids}&sort=priority`)
```

### Real-time Updates

```javascript
// Poll for live match updates
const pollLiveMatches = async () => {
  const response = await fetch('/api/v1/matches?view=live&sort=relevance')
  const liveMatches = await response.json()
  
  // Update UI with live scores
  updateMatchScores(liveMatches.docs)
}

// Poll every 30 seconds during active matches
setInterval(pollLiveMatches, 30000)
```

## Error Handling

### Common Error Responses

```json
// Invalid date format
{
  "error": "Invalid date format. Use YYYY-MM-DD.",
  "status": 400
}

// League not found
{
  "error": "One or more league IDs not found: [999]",
  "status": 404
}

// Limit exceeded
{
  "error": "Limit cannot exceed 100 items per page",
  "status": 400
}

// Server error
{
  "error": "Internal server error",
  "status": 500
}
```

### Best Practices

1. **Validate Parameters**: Check date formats and ID lists client-side
2. **Handle Empty Results**: Gracefully handle empty match lists
3. **Implement Retries**: Retry failed requests with exponential backoff
4. **Cache Responses**: Cache successful responses to reduce server load

## Integration Examples

### React Component

```jsx
const MatchList = () => {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ view: 'today' })

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams(filters)
        const response = await fetch(`/api/v1/matches?${params}`)
        const data = await response.json()
        setMatches(data.docs)
      } catch (error) {
        console.error('Failed to fetch matches:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [filters])

  return (
    <div>
      {loading ? (
        <div>Loading matches...</div>
      ) : (
        <div>
          {matches.map(match => (
            <MatchCard 
              key={match.id} 
              match={match}
              priority={match.league.priority}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

### Mobile App Integration

```swift
// Swift/iOS example
struct MatchListView: View {
    @State private var matches: [Match] = []
    @State private var featuredLeagues: [League] = []
    
    var body: some View {
        NavigationView {
            List {
                // Featured leagues section
                if !featuredLeagues.isEmpty {
                    Section("Featured Leagues") {
                        FeaturedLeaguesRow(leagues: featuredLeagues)
                    }
                }
                
                // Matches section (automatically prioritized)
                Section("Today's Matches") {
                    ForEach(matches) { match in
                        MatchRow(match: match)
                            .badge(match.league.tier == "tier1" ? "⭐" : "")
                    }
                }
            }
            .navigationTitle("Matches")
            .onAppear {
                loadMatches()
            }
        }
    }
    
    private func loadMatches() {
        // API call with priority sorting
        let url = URL(string: "/api/v1/matches?view=today&include_featured=true&sort=priority")!
        // ... rest of implementation
    }
}
```

---

## Support & Troubleshooting

### Common Issues

1. **League priorities not working**: Run `/api/init-league-priorities` to initialize
2. **Empty results**: Check date ranges and league IDs are valid
3. **Performance issues**: Reduce `limit` parameter and add specific filters
4. **Stale data**: Verify caching settings and refresh intervals

### Management & Debug Endpoints

- `GET /api/list-leagues` - List all leagues with IDs and featured status
- `GET /api/manage-featured-leagues` - View current featured leagues configuration
- `GET /api/v1/matches?leagues=X&sort=priority&limit=1` - Test specific league priority

### Performance Monitoring

Monitor these metrics:
- Response time (target: <500ms)
- Cache hit rate (target: >80%)
- Database query efficiency
- User engagement with prioritized content

For additional support or advanced configuration, refer to the main [API Documentation](./api-route-map.md) or contact the development team.