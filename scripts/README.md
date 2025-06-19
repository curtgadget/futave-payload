# Scripts Directory

This directory contains utility scripts for managing and testing the FutAve application.

## Available Scripts

### 🔄 Data Synchronization

#### `sync-matches.ts` - Flexible Match Synchronization
Enhanced script for syncing match data with configurable options.

```bash
# Basic usage - sync last 30 days and next 30 days
node scripts/sync-matches.ts

# Custom date range
node scripts/sync-matches.ts --days-back 7 --days-ahead 14

# Specific date range
node scripts/sync-matches.ts --start-date 2024-01-01 --end-date 2024-01-31

# Only future matches with wave scores
node scripts/sync-matches.ts --only-future --days-ahead 60

# Skip wave score calculation
node scripts/sync-matches.ts --no-waves

# Show help
node scripts/sync-matches.ts --help
```

**Features:**
- Configurable date ranges
- Optional wave score calculation
- Progress tracking with colored output
- Error reporting
- Top matches display

#### `calculate-wave-scores.ts` - Wave Score Calculator
Calculates wave excitement scores for finished matches.

```bash
node scripts/calculate-wave-scores.ts
```

**Features:**
- Processes all finished matches
- Updates wave scores for existing matches
- Batch processing with progress tracking

#### `backfillMatches.ts` - Historical Data Backfill
Backfills historical match data for specified date ranges.

```bash
# Default: sync last year to present
node scripts/backfillMatches.ts

# Custom date range via environment variables
BACKFILL_START_DATE=2023-01-01 BACKFILL_END_DATE=2023-12-31 node scripts/backfillMatches.ts
```

### 🧪 Testing & Debugging

#### `test-sportmonks.ts` - API Integration Testing
Comprehensive test suite for Sportmonks API integration.

```bash
# Test all endpoints
node scripts/test-sportmonks.ts

# Test specific endpoint
node scripts/test-sportmonks.ts --endpoint players

# Detailed output
node scripts/test-sportmonks.ts --endpoint teams --detailed

# Show help
node scripts/test-sportmonks.ts --help
```

**Tests:**
- All major API endpoints
- Rate limit handling  
- Pagination functionality
- Response validation
- Concurrent request handling

#### `test-smart-sorting.ts` - Smart Sorting Tests
Tests the enhanced matches endpoint with wave score integration.

```bash
node scripts/test-smart-sorting.ts
```

**Features:**
- Tests priority sorting
- Validates wave score integration
- Checks smart sorting algorithms

#### `debug-missing-players.ts` - Player Debug Tool
Comprehensive debugging system for missing player data.

```bash
# Use the npm script (recommended)
pnpm debug-players

# Direct execution
node scripts/debug-missing-players.ts
```

**See [`docs/DEBUG_MISSING_PLAYERS.md`](../docs/DEBUG_MISSING_PLAYERS.md) for detailed usage.**

## Removed Scripts

The following scripts have been removed to reduce clutter and improve maintainability:

### Debug Scripts (12 removed)
- `debug-standings-issue.ts`
- `debug-standings-calculation.ts` 
- `debug-cache-behavior.ts`
- `debug-scores.ts`
- `check-data.ts`
- `check-dates.ts`
- `check-standings-format.ts`
- `clear-standings-cache.ts`
- `quick-standings-test.ts`
- `test-match-query.ts`
- `diagnose-wave-scores.ts`
- `find-available-matches.ts`

### Test Scripts (5 removed)
- `test-wave-calculation.ts`
- `test-wave-scores.ts`
- `test-new-wave-calculator.ts`
- `test-multiple-wave-scores.ts`
- `test-production-sync.ts`

### Redundant Sync Scripts (5 removed)
- `sync-current-matches.ts` → replaced by `sync-matches.ts`
- `sync-last-month.ts` → use `sync-matches.ts` with date args
- `sync-active-months.ts` → use `sync-matches.ts` with date args
- `sync-matches-with-waves.ts` → integrated into `sync-matches.ts`
- `calculate-wave-scores-manual.ts` → redundant with `calculate-wave-scores.ts`
- `sync-teams-with-standings.ts` → empty placeholder

## Script Usage Patterns

### For Development
```bash
# Test API connectivity
node scripts/test-sportmonks.ts

# Sync recent data for development
node scripts/sync-matches.ts --days-back 7 --days-ahead 7

# Debug missing players
pnpm debug-players analyze 9
```

### For Production
```bash
# Full sync with wave scores
node scripts/sync-matches.ts --days-back 30 --days-ahead 90

# Backfill historical data
node scripts/backfillMatches.ts

# Calculate wave scores for existing data
node scripts/calculate-wave-scores.ts
```

### For Testing
```bash
# Comprehensive API test
node scripts/test-sportmonks.ts --detailed

# Test specific functionality
node scripts/test-smart-sorting.ts
```

## Best Practices

1. **Always test API connectivity** before running large sync operations
2. **Use appropriate date ranges** to avoid unnecessary API calls
3. **Monitor rate limits** using the `/api/v1/rate-limit-status` endpoint
4. **Use the debug tools** when encountering data issues
5. **Check wave scores** after syncing to ensure calculation worked correctly

## Contributing

When adding new scripts:
1. Add CLI argument parsing with `--help` option
2. Use colored console output for better UX
3. Include error handling and validation
4. Update this README with usage examples
5. Consider if existing scripts can be enhanced instead

## Environment Variables

### Required for All Scripts
- `DATABASE_URI` - MongoDB connection string
- `PAYLOAD_SECRET` - Payload CMS secret

### Required for Sync Scripts  
- `SPORTMONKS_API_KEY` - Your Sportmonks API key
- `SPORTMONKS_BASE_URL` - Sportmonks API base URL (optional)

### Required for Testing/Debug Scripts
- `NEXT_PUBLIC_API_URL` or `API_URL` - Your application's API base URL
  - **Development**: `http://localhost:3000`
  - **Staging**: `https://staging.futave.com` 
  - **Production**: `https://api.futave.com`

**Example .env file:**
```bash
# Database
DATABASE_URI=mongodb://localhost:27017/futave
PAYLOAD_SECRET=your-secret-key

# External API
SPORTMONKS_API_KEY=your-sportmonks-key
SPORTMONKS_BASE_URL=https://api.sportmonks.com/v3/football

# Application API (for testing/debug scripts)
API_URL=http://localhost:3000
# OR for staging/production:
# API_URL=https://staging.futave.com
# API_URL=https://api.futave.com
```