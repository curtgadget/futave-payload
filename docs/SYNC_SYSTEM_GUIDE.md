# Sync System Guide

Complete guide to FutAve's data synchronization system - how to run syncs, configure options, and understand the system architecture.

## Quick Reference

### Running Syncs

```bash
# Queue all sync jobs automatically (respects schedules)
curl http://localhost:3000/api/queue-jobs/sync

# Queue specific queue (hourly, daily, weekly, monthly, backfill)
curl http://localhost:3000/api/queue-jobs/sync?queue=hourly
curl http://localhost:3000/api/queue-jobs/sync?queue=daily
curl http://localhost:3000/api/queue-jobs/sync?queue=weekly

# Queue individual sync job
curl -X POST http://localhost:3000/api/queue-jobs/syncMatches
curl -X POST http://localhost:3000/api/queue-jobs/syncPlayers
curl -X POST http://localhost:3000/api/queue-jobs/syncTeams

# Run sync job with worker (direct execution)
pnpm payload jobs:run syncMatches 1
pnpm payload jobs:run syncActivePlayerStats 1

# Run player sync with memory management
NODE_OPTIONS="--expose-gc --max-old-space-size=8192" pnpm payload jobs:run syncPlayers 1
```

### Monitoring Syncs

```bash
# View all queued and processing jobs
curl http://localhost:3000/api/queue-jobs/preview

# Check player sync status specifically
./scripts/check-sync-simple.sh

# Watch player sync in real-time (refreshes every 30s)
./scripts/watch-sync.sh

# Check API rate limit status
curl http://localhost:3000/api/v1/rate-limit-status
```

---

## Available Sync Jobs

### 1. syncMatches

**Purpose:** Sync match fixtures, live scores, results, lineups, events, and sidelined players
**Queue:** Hourly
**Duration:** ~5-10 minutes
**API Calls:** ~20 per run

**Inputs:**
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format
- `backfill` (optional): Boolean, use backfill pagination strategy
- `calculateWaveScores` (optional): Boolean, calculate excitement scores (default: true)

**Examples:**
```bash
# Queue with default settings (last day to +90 days, with wave scores)
curl -X POST http://localhost:3000/api/queue-jobs/syncMatches

# Run with custom date range
pnpm payload jobs:run syncMatches 1 --input '{"startDate":"2025-10-01","endDate":"2025-10-31"}'

# Backfill historical data
curl "http://localhost:3000/api/queue-jobs/sync?queue=backfill"
```

---

### 2. syncPlayers

**Purpose:** Complete sync of all 220k players with full profile data
**Queue:** Weekly (Sunday 2 AM)
**Duration:** ~60 minutes
**API Calls:** ~4,400 per run

**Environment Variables:**
- `PLAYER_SYNC_RESET` - Set to "true" to force fresh start (ignores checkpoint)
- `PLAYER_SYNC_MAX_PAGES` - Max pages per run (default: 2800, ~140k players)
- `ENABLE_AUTO_VALIDATION` - Set to "true" to run post-sync validation

**Examples:**
```bash
# Normal weekly sync (resumes from checkpoint)
NODE_OPTIONS="--expose-gc --max-old-space-size=8192" pnpm payload jobs:run syncPlayers 1

# Force fresh sync from beginning
PLAYER_SYNC_RESET=true NODE_OPTIONS="--expose-gc --max-old-space-size=8192" pnpm payload jobs:run syncPlayers 1

# Sync with limited pages (for testing)
PLAYER_SYNC_MAX_PAGES=100 NODE_OPTIONS="--expose-gc --max-old-space-size=8192" pnpm payload jobs:run syncPlayers 1

# Enable post-sync validation
ENABLE_AUTO_VALIDATION=true NODE_OPTIONS="--expose-gc --max-old-space-size=8192" pnpm payload jobs:run syncPlayers 1
```

**Memory Notes:**
- Requires 8GB heap (`--max-old-space-size=8192`)
- Uses `--expose-gc` for manual garbage collection
- If crashes persist, increase to 12GB: `--max-old-space-size=12288`

---

### 3. syncActivePlayerStats

**Purpose:** Fast sync of stats for ~5k-10k active players only
**Queue:** Daily (2 AM)
**Duration:** ~5-10 minutes
**API Calls:** ~100-200 per run

**Examples:**
```bash
# Queue daily stats sync
curl -X POST http://localhost:3000/api/queue-jobs/syncActivePlayerStats

# Run with worker
pnpm payload jobs:run syncActivePlayerStats 1
```

**Notes:**
- Only syncs players who played in recent matches
- Much faster than full player sync
- Designed for daily stat updates

---

### 4. syncTeams

**Purpose:** Sync team metadata, form, transfers, and statistics
**Queue:** Daily (2 AM)
**Duration:** ~30-60 minutes
**API Calls:** ~200-300 per run

**Environment Variables:**
- `ENABLE_AUTO_VALIDATION` - Set to "true" to run post-sync validation

**Examples:**
```bash
# Queue team sync
curl -X POST http://localhost:3000/api/queue-jobs/syncTeams

# Run with validation
ENABLE_AUTO_VALIDATION=true pnpm payload jobs:run syncTeams 1
```

---

### 5. syncLeagues

**Purpose:** Sync league and competition metadata
**Queue:** Weekly (Sunday 2 AM)
**Duration:** ~2 minutes
**API Calls:** ~20 per run

**Examples:**
```bash
# Queue league sync
curl -X POST http://localhost:3000/api/queue-jobs/syncLeagues

# Run with worker
pnpm payload jobs:run syncLeagues 1
```

---

### 6. syncCoaches

**Purpose:** Sync coach and manager information
**Queue:** Weekly (Sunday 2 AM)
**Duration:** ~3 minutes
**API Calls:** ~30 per run

**Examples:**
```bash
# Queue coach sync
curl -X POST http://localhost:3000/api/queue-jobs/syncCoaches

# Run with worker
pnpm payload jobs:run syncCoaches 1
```

---

### 7. syncMetadataTypes

**Purpose:** Sync metadata type definitions (positions, formations, etc.)
**Queue:** Monthly (1st of month)
**Duration:** ~1 minute
**API Calls:** ~10 per run

**Examples:**
```bash
# Queue metadata sync
curl -X POST http://localhost:3000/api/queue-jobs/syncMetadataTypes

# Run with worker
pnpm payload jobs:run syncMetadataTypes 1
```

---

### 8. syncCountries

**Purpose:** Sync country reference data
**Queue:** Monthly (1st of month)
**Duration:** ~2 minutes
**API Calls:** ~20 per run

**Examples:**
```bash
# Queue country sync
curl -X POST http://localhost:3000/api/queue-jobs/syncCountries

# Run with worker
pnpm payload jobs:run syncCountries 1
```

---

### 9. syncRivals

**Purpose:** Sync team rivalry definitions for wave score calculations
**Queue:** Monthly (1st of month)
**Duration:** ~2 minutes
**API Calls:** ~20 per run

**Examples:**
```bash
# Queue rivals sync
curl -X POST http://localhost:3000/api/queue-jobs/syncRivals

# Run with worker
pnpm payload jobs:run syncRivals 1
```

---

### 10. syncMissingPlayers

**Purpose:** Debug and sync specific missing players
**Queue:** Dev/manual
**Duration:** Varies

**Inputs:**
- `playerIds` (required): Array of player IDs to sync
- `teamId` (optional): Team ID for context

**Examples:**
```bash
# Run with specific player IDs
pnpm payload jobs:run syncMissingPlayers 1 --input '{"playerIds":[12345,67890]}'
```

---

## Queue System

FutAve uses a frequency-based queue system where queue names match execution schedules:

| Queue | Schedule | Purpose | Duration |
|-------|----------|---------|----------|
| **hourly** | Every hour | Live/time-sensitive data | ~5-10 min |
| **daily** | Once/day (2 AM) | Fresh data needed daily | ~35-70 min |
| **weekly** | Sunday 2 AM | Complete refresh | ~65 min |
| **monthly** | 1st of month | Static/reference data | ~5 min |
| **backfill** | On-demand | Historical data loads | Varies |
| **dev** | Manual | Testing and development | Varies |

### Queue Assignments

**Hourly Queue:**
- `syncMatches` - Match schedules, live scores, results

**Daily Queue:**
- `syncActivePlayerStats` - Stats for active players
- `syncTeams` - Team metadata and form

**Weekly Queue:**
- `syncPlayers` - All 220k players (complete refresh)
- `syncLeagues` - League metadata
- `syncCoaches` - Coach information

**Monthly Queue:**
- `syncMetadataTypes` - Metadata definitions
- `syncCountries` - Country data
- `syncRivals` - Rivalry definitions

---

## Environment Variables

### Required

- `DATABASE_URI` - MongoDB connection string
- `PAYLOAD_SECRET` - Payload CMS secret key
- `SPORTMONKS_API_KEY` - Sportmonks API key
- `SPORTMONKS_BASE_URL` - Sportmonks API base URL (optional, defaults to v3)

### Sync Configuration

- `PLAYER_SYNC_RESET` - Force fresh player sync (default: false)
- `PLAYER_SYNC_MAX_PAGES` - Max pages for player sync (default: 2800)
- `ENABLE_AUTO_VALIDATION` - Run post-sync validation (default: false)

### Memory Configuration (Node.js)

- `NODE_OPTIONS="--expose-gc --max-old-space-size=8192"` - Required for player sync

---

## Monitoring and Debugging

### Check Sync Status

```bash
# View all jobs
curl http://localhost:3000/api/queue-jobs/preview

# View specific job in admin
# Navigate to: http://localhost:3000/admin/collections/payload-jobs
```

### Check Player Sync Progress

```bash
# One-time check
./scripts/check-sync-simple.sh

# Continuous monitoring (refreshes every 30s)
./scripts/watch-sync.sh
```

### Monitor API Rate Limits

```bash
# Check current rate limit status
curl http://localhost:3000/api/v1/rate-limit-status
```

### View Sync Logs

```bash
# Docker logs
docker-compose logs -f payload

# Worker output (if running manually)
# Output appears in terminal where worker was started
```

---

## Common Workflows

### Daily Development Sync

```bash
# Quick sync of recent data
curl -X POST http://localhost:3000/api/queue-jobs/syncMatches
curl -X POST http://localhost:3000/api/queue-jobs/syncActivePlayerStats
```

### Weekly Full Refresh

```bash
# Let automatic scheduler handle it, or manually trigger:
curl "http://localhost:3000/api/queue-jobs/sync?queue=weekly"
```

### Backfill Historical Data

```bash
# Backfill last year of matches
curl "http://localhost:3000/api/queue-jobs/sync?queue=backfill"
```

### Debug Missing Player Data

```bash
# First, identify missing player IDs, then:
pnpm payload jobs:run syncMissingPlayers 1 --input '{"playerIds":[12345,67890]}'
```

---

## Troubleshooting

### Job Stuck in Queue

**Symptom:** Job queued but never processes
**Solution:** Check that workers are running, or manually run with `pnpm payload jobs:run`

### Player Sync Crashes

**Symptom:** Out of memory errors during player sync
**Solution:** Increase heap size to 12GB: `--max-old-space-size=12288`

### Rate Limit Errors

**Symptom:** 429 errors from Sportmonks API
**Solution:** Check rate limit status, wait for hourly window to reset

### Stale Data

**Symptom:** Users report outdated information
**Solution:** Check that scheduled jobs are running, manually trigger if needed

### Backlog Building Up

**Symptom:** Many jobs queued, not completing
**Solution:** Increase worker count or move jobs to less frequent queue

---

## Architecture Overview

### Components

1. **Task Handlers** (`src/tasks/handlers/*.ts`) - Job entry points registered with Payload
2. **Sync Services** (`src/services/sync/handlers/*.ts`) - Core sync logic
3. **Sportmonks Client** (`src/services/sportmonks/client/`) - API wrapper
4. **Transformers** (`src/services/sportmonks/transformers/`) - Data transformation
5. **Queue Manager** (`src/app/api/queue-jobs/`) - Job queueing endpoints

### Data Flow

1. Job triggered (scheduled or manual)
2. Task handler invoked with input parameters
3. Sportmonks API fetched with rate limit management
4. Data transformed to internal schema
5. Upserted to MongoDB collections
6. Success/failure reported to job queue

---

## Related Documentation

- [Queue Strategy Details](./SYNC_QUEUE_STRATEGY.md) - In-depth queue design and principles
- [Player Sync Strategy](./PLAYER_SYNC_STRATEGY.md) - Player sync specifics and optimization
- [Player Sync Memory](./PLAYER_SYNC_MEMORY.md) - Memory management for large syncs
- [Sportmonks Sync Map](../src/app/api/v1/documentation/sportmonks-sync-map.md) - Architecture details
- [Automated Validation](./AUTOMATED_VALIDATION.md) - Post-sync validation system

---

**Last Updated:** October 2025
