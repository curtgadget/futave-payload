# Smart Sorting API Documentation

The `/api/v1/matches` endpoint now supports intelligent sorting that combines league priority with wave scores for optimal user experience.

## Query Parameters

### Wave Score Parameters
- `include_waves=true` - Include wave score data in response
- `wave_boost=true` - Apply smart priority boost to high wave score matches (60+)

### Smart Sorting Modes

#### 1. Default Priority (Current Behavior)
```
GET /api/v1/matches?limit=10
```
- Pure league priority sorting
- Respects your configured league preferences
- No wave score influence

#### 2. Enhanced Priority with Wave Data
```
GET /api/v1/matches?limit=10&include_waves=true
```
- Same priority sorting as default
- Includes wave_score field in response
- Great for displaying excitement levels alongside familiar sorting

#### 3. Smart Priority Boost
```
GET /api/v1/matches?limit=10&include_waves=true&wave_boost=true
```
- High wave score matches (60+) get +100 priority boost
- Other matches get small wave bonus (wave_score * 0.3)
- Surfaces exciting matches while respecting league preferences
- **Recommended for main match lists**

#### 4. Discovery Mode (Featured + Waves)
```
GET /api/v1/matches?limit=10&include_waves=true&wave_boost=true&only_featured=true
```
- Only shows matches from featured leagues
- Applies wave score boost within featured leagues
- Perfect for "must-watch" match recommendations

## Response Format

With `include_waves=true`, matches include:

```json
{
  "id": 12345,
  "home_team": { "name": "Arsenal" },
  "away_team": { "name": "Chelsea" },
  "league": { "name": "Premier League", "priority": 200 },
  "wave_score": {
    "total": 73,
    "tier": "A",
    "factors": {
      "rivalry": 25,
      "position": 18,
      "zone": 15,
      "form": 10,
      "h2h": 3,
      "timing": 2
    }
  }
}
```

## Wave Score Tiers

- **S-Tier (80-100)**: Unmissable matches
- **A-Tier (60-79)**: Highly exciting matches  
- **B-Tier (40-59)**: Above average interest
- **C-Tier (0-39)**: Standard matches

## UX Recommendations

### Main Match List
Use smart boost to balance user preferences with excitement:
```
/api/v1/matches?include_waves=true&wave_boost=true&limit=20
```

### Discovery Section  
Show hidden gems from any league:
```
/api/v1/matches?include_waves=true&wave_boost=true&min_wave_score=60
```

### Featured Matches
Combine curation with wave intelligence:
```
/api/v1/matches?include_waves=true&wave_boost=true&only_featured=true
```

### User Settings
Allow users to control the balance:
- "Traditional" - No wave boost
- "Balanced" - Smart boost (default)
- "Discovery" - Pure wave score sorting

## Performance Notes

- Wave score calculation adds ~50ms to endpoint response
- Scores are cached and calculated async during match sync
- No performance impact when `include_waves=false` (default)