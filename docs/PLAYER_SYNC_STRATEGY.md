# Player Sync Strategy: Weekly Full + Daily Incremental

This document explains the two-sync strategy for keeping player data fresh while minimizing API usage and sync duration.

## Overview

Player data synchronization uses a **two-tier approach**:

1. **Weekly Full Sync** (`syncPlayers`) - Complete refresh of all 220k players
2. **Daily Stats Sync** (`syncActivePlayerStats`) - Quick updates for ~5k-10k active players

This strategy provides **fresh stats for active players** while maintaining complete player database coverage.

## Why Two Syncs?

### The Problem

- **220k total players** in Sportmonks database
- Player sync includes **frequently-changing statistics** (goals, assists, minutes, appearances)
- Statistics update **after every match** (daily during season)
- Full sync takes **~1 hour with 8GB heap**
- Running full sync daily = **7 hours/week** just for stats

### The Solution

Split into two syncs based on update frequency:

| Sync Type | Scope | Duration | Frequency | Purpose |
|-----------|-------|----------|-----------|---------|
| **Full Sync** | All 220k players | ~60 min | Weekly | Complete refresh, baseline |
| **Stats Sync** | ~5k-10k active | ~5-10 min | Daily | Fresh stats for active players |

**Result:** 95% reduction in daily sync time, 95% fewer API calls

## Sync 1: Weekly Full Player Sync

### Job: `syncPlayers`

**When:** Sunday 2 AM (nightly queue)
**Scope:** All 220k players
**Duration:** ~1 hour
**Memory:** 8GB heap required
**Queue:** `nightly`

### What It Syncs

```typescript
include: 'teams;nationality;trophies;trophies.season;trophies.trophy;metadata;position;detailedPosition;statistics.details'
```

**All player data:**
- ✅ Personal info (name, DOB, height, weight)
- ✅ Nationality, position, metadata
- ✅ Current teams
- ✅ Trophy history
- ✅ Full statistics (baseline)

### Running Manually

```bash
# Queue job
curl -X POST http://localhost:3000/api/queue-jobs/syncPlayers

# Run with worker (8GB heap REQUIRED)
NODE_OPTIONS="--expose-gc --max-old-space-size=8192" pnpm payload jobs:run syncPlayers 1
```

### Memory Optimization

- Uses aggressive memory management
- GC every 10 pages
- Memory monitoring every 10 pages
- Checkpointing for resumability

See `docs/PLAYER_SYNC_MEMORY.md` for details.

## Sync 2: Daily Active Player Stats

### Job: `syncActivePlayerStats`

**When:** Nightly (hourly queue, runs daily)
**Scope:** ~5k-10k active players
**Duration:** ~5-10 minutes
**Memory:** Default heap (no special config)
**Queue:** `hourly`

### What It Syncs

```typescript
include: 'statistics.details;teams'
```

**Only frequently-changing data:**
- ✅ Player statistics (goals, assists, appearances, minutes)
- ✅ Current teams (catches mid-week transfers)
- ❌ No trophies, nationality, metadata (static data)

### Active Player Definition

A player is **"active"** if they appeared in match lineups (starters OR substitutes) in the **last 30 days**.

**Detection process:**
1. Query completed matches (`state_id = 5`) from last 30 days
2. Extract unique player IDs from `lineups` array
3. Sync only those player IDs

**Typical coverage:**
- ~300 matches/day × 30 days = ~9,000 matches
- ~45 players/match (22 starters + subs)
- ~5k-10k unique active players

### Running Manually

```bash
# Queue job
curl -X POST http://localhost:3000/api/queue-jobs/syncActivePlayerStats

# Run with worker (default heap is fine)
pnpm payload jobs:run syncActivePlayerStats 1
```

### How It Works

**Step 1: Identify Active Players**
```sql
Find matches WHERE:
  state_id = 5 (FULL_TIME)
  AND starting_at >= (now - 30 days)

Extract unique player_id from lineups
```

**Step 2: Batch Fetch from Sportmonks**
```typescript
// Process in 50-player batches
filters: `playerIds:${batch.join(';')}`
include: 'statistics.details;teams'
```

**Step 3: Update Database**
```typescript
// Update only statistics and teams fields
await payload.update({
  collection: 'players',
  id: existing.docs[0].id,
  data: {
    statistics: transformedPlayer.statistics,
    teams: transformedPlayer.teams,
  }
})
```

## Scheduling Configuration

Both syncs are configured in `/api/queue-jobs/sync`:

```typescript
const syncJobs: SyncJob[] = [
  // ... other syncs ...
  {
    task: 'syncPlayers',
    queue: 'nightly'  // Runs weekly (configured elsewhere)
  },
  {
    task: 'syncActivePlayerStats',
    queue: 'hourly'   // Runs daily
  },
]
```

**Queue meanings:**
- `hourly` = Jobs run daily (despite name)
- `nightly` = Jobs run weekly on schedule

## API Usage Comparison

### Without Incremental Sync (Daily Full)

| Day | Sync | API Calls |
|-----|------|-----------|
| Mon | Full | 4,400 |
| Tue | Full | 4,400 |
| Wed | Full | 4,400 |
| Thu | Full | 4,400 |
| Fri | Full | 4,400 |
| Sat | Full | 4,400 |
| Sun | Full | 4,400 |
| **Total** | | **30,800** |

### With Incremental Sync (Weekly + Daily)

| Day | Sync | API Calls |
|-----|------|-----------|
| Mon | Stats | 200 |
| Tue | Stats | 200 |
| Wed | Stats | 200 |
| Thu | Stats | 200 |
| Fri | Stats | 200 |
| Sat | Stats | 200 |
| Sun | **Full + Stats** | **4,600** |
| **Total** | | **5,800** |

**Savings:** 81% reduction in weekly API calls

## Data Freshness

### Active Players (What Users Care About)
- Updated **daily** via incremental sync
- Stats max **24 hours old**
- Covers players in recent matches
- Includes bench/reserve players who appeared

### Inactive Players
- Updated **weekly** via full sync
- Stats max **7 days old**
- Retired/injured/reserve players
- Acceptable staleness for inactive players

### Edge Cases

**Newly transferred player:**
- Appears in match → included in next daily sync
- Fresh stats within 24 hours
- Full data in weekly sync

**Player on long injury:**
- Not in recent matches → not in daily sync
- Stats remain from last weekly sync
- Updated weekly until they return

**Newly added player:**
- Not in local database yet
- Appears in match → daily sync creates new player
- Full data in next weekly sync

## Performance Metrics

### Weekly Full Sync
- **Players:** 220,000
- **API Calls:** 4,400 (50 players/page)
- **Duration:** ~60 minutes
- **Memory Peak:** 6-7GB
- **Frequency:** Once per week (Sunday)

### Daily Stats Sync
- **Players:** 5,000-10,000 (varies by season)
- **API Calls:** 100-200 (50 players/page)
- **Duration:** 5-10 minutes
- **Memory Peak:** ~500MB-1GB
- **Frequency:** Every day

## Monitoring

### Check Active Player Count

```bash
# See how many active players will be synced
curl http://localhost:3000/api/v1/debug/active-player-count
```

### Monitor Sync Jobs

```bash
# See queue status
curl http://localhost:3000/api/queue-jobs/preview

# Check player sync checkpoint
./scripts/check-sync-simple.sh
```

### Review Sync Results

Check Payload admin logs after sync completes:
- Active players found
- Matches scanned
- Players updated/created/failed
- Total duration

## Troubleshooting

### "No active players found"

**Cause:** No completed matches in last 30 days
**Solution:** Check match sync is running, or reduce window to 7 days

### Daily sync taking too long

**Cause:** Too many active players (>15k)
**Solution:** Reduce window to 14-21 days instead of 30

### Missing player statistics

**Cause:** Player not in recent matches, missed by daily sync
**Solution:** Wait for weekly full sync, or run manual player sync for specific IDs

### Memory issues on stats sync

**Cause:** Unexpected large player batch
**Solution:** Check active player count, consider reducing 30-day window

## Best Practices

1. **Run match sync before stats sync** - Ensures fresh lineup data
2. **Monitor active player count** - Adjust window if count grows too large
3. **Keep weekly sync on Sunday** - Low-traffic day, fresh data for week
4. **Check validation results** - Use automated validation to catch discrepancies
5. **Increase window during off-season** - Fewer matches = smaller active set

## Related Documentation

- [Player Sync Memory Optimization](./PLAYER_SYNC_MEMORY.md)
- [Automated Validation](./AUTOMATED_VALIDATION.md)
- [API Route Map](../src/app/api/v1/documentation/api-route-map.md)

## Commands Reference

```bash
# Queue individual syncs
curl -X POST http://localhost:3000/api/queue-jobs/syncPlayers
curl -X POST http://localhost:3000/api/queue-jobs/syncActivePlayerStats

# Run manually with workers
NODE_OPTIONS="--expose-gc --max-old-space-size=8192" pnpm payload jobs:run syncPlayers 1
pnpm payload jobs:run syncActivePlayerStats 1

# Monitor sync status
curl http://localhost:3000/api/queue-jobs/preview
./scripts/check-sync-simple.sh

# View validation results
curl http://localhost:3000/api/v1/debug/validations?entity=playerstats&limit=10
```
