# Debugging Missing Players

This guide explains how to debug missing player issues in the FutAve application.

## Quick Start

### 1. Enable Debug Mode

Add to your `.env` file:
```bash
DEBUG_MISSING_PLAYERS=true
```

### 2. Use the Debug Script

```bash
# Enable debug logging
pnpm debug-players on

# Analyze a specific team (e.g., Manchester City with ID 9)
pnpm debug-players analyze 9

# Sync missing players for a team
pnpm debug-players sync 9

# Export all debug data
pnpm debug-players export
```

### 3. Use the Debug API Endpoint

```bash
# Set your API URL (adjust for your environment)
export API_URL="http://localhost:3000"  # Development
# export API_URL="https://staging.futave.com"  # Staging  
# export API_URL="https://api.futave.com"  # Production

# Get current debug summary
curl $API_URL/api/v1/debug/missing-players

# Analyze a specific team
curl "$API_URL/api/v1/debug/missing-players?action=analyze&teamId=9"

# Sync missing players for a team
curl "$API_URL/api/v1/debug/missing-players?action=sync&teamId=9"

# Export all collected data
curl "$API_URL/api/v1/debug/missing-players?action=export" > missing-players.json
```

## Advanced Logging Configuration

### Filter Logs by Category

Add to your `.env` file:
```bash
# Only show specific log categories (comma-separated)
LOG_CATEGORIES=missing-players,sync,api

# Set minimum log level (debug, info, warn, error)
LOG_LEVEL=debug

# Disable color output
NO_COLOR=true
```

### Log Categories:
- `missing-players` - Missing player specific logs
- `sync` - Data synchronization logs
- `api` - API request/response logs
- `db` - Database operation logs
- `general` - General application logs

## Understanding the Debug Output

When you analyze a team, you'll see:
```json
{
  "teamId": 9,
  "teamName": "Manchester City",
  "totalSquadPlayers": 31,
  "playersInDatabase": 15,
  "missingPlayers": 16,
  "missingPlayerIds": [37689559, ...],
  "analysis": {
    "percentageMissing": "51.6%",
    "summary": {
      "totalMissing": 16,
      "byContext": { "squad": 16 },
      "byTeam": { "9": 16 }
    }
  }
}
```

## Console Output

When debug mode is enabled, you'll see colored console output:
```
[MISSING PLAYER] 2024-01-15T10:30:00.000Z Player 37689559 Team 9 (Manchester City) #22 pos:25 Context: squad
```

## Troubleshooting

1. **No debug output?**
   - Ensure `DEBUG_MISSING_PLAYERS=true` is in your `.env`
   - Restart your development server after changing `.env`

2. **Too much noise in logs?**
   - Use `LOG_CATEGORIES` to filter specific categories
   - Increase `LOG_LEVEL` to reduce verbosity

3. **Need to track specific players?**
   - The debug system automatically tracks all missing players
   - Check the export data for comprehensive information

## Integration with Sync Process

The missing player debug system integrates with:
- Team squad API endpoints
- Player statistics processing
- Data synchronization handlers

Missing players are logged in these contexts:
- `squad` - When fetching team squads
- `stats` - When processing player statistics
- `sync` - During data synchronization from Sportmonks

## Syncing Missing Players

The sync feature allows you to fetch only the missing players from Sportmonks:

1. **Targeted Sync**: Only fetches players that are missing from your database
2. **Concurrency Control**: Uses rate limiting to stay within API limits (5 concurrent requests)
3. **Progress Tracking**: Shows how many players were created, updated, or failed

### Sync Workflow:
```bash
# 1. First analyze a team to see missing players
pnpm debug-players analyze 9

# 2. If missing players are found, sync them
pnpm debug-players sync 9

# 3. Re-analyze to verify all players are now present
pnpm debug-players analyze 9
```

### Rate Limiting:
- The sync respects Sportmonks' 3000 requests/hour limit per entity
- Uses concurrency control (5 simultaneous requests by default)
- Individual player fetches count against the 'players' entity limit