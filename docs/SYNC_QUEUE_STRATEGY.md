# Sync Queue Strategy

This document explains the queue structure for organizing data synchronization jobs by frequency and priority.

## Queue Structure

FutAve uses a **frequency-based queue system** where queue names match their actual execution schedule:

| Queue | Schedule | Purpose | Total Duration |
|-------|----------|---------|----------------|
| **hourly** | Every hour | Live/time-sensitive data | ~5-10 min |
| **daily** | Once/day (2 AM) | Fresh data needed daily | ~35-70 min |
| **weekly** | Sunday 2 AM | Complete refresh | ~65 min |
| **monthly** | 1st of month | Static/reference data | ~5 min |
| **backfill** | On-demand | Historical data loads | Varies |

## Job Assignments

### HOURLY Queue
**Schedule:** Every hour during match days
**Purpose:** Time-sensitive data (live scores, new fixtures)

| Job | Data | Duration | Why Hourly |
|-----|------|----------|------------|
| `syncMatches` | Match schedules, live scores, results | ~5-10 min | Matches update constantly during match days |

**Total hourly duration:** ~5-10 minutes

### DAILY Queue
**Schedule:** Once per day at 2 AM
**Purpose:** Data that changes daily and users expect to be fresh

| Job | Data | Duration | Why Daily |
|-----|------|----------|-----------|
| `syncActivePlayerStats` | Stats for ~5k-10k active players | ~5-10 min | Player stats update after every match |
| `syncTeams` | Team metadata, form, transfers | ~30-60 min | Team data changes with matches and transfers |

**Total daily duration:** ~35-70 minutes
**API calls:** ~300-500/day

### WEEKLY Queue
**Schedule:** Sunday 2 AM
**Purpose:** Complete refresh of large datasets that don't need daily updates

| Job | Data | Duration | Why Weekly |
|-----|------|----------|------------|
| `syncPlayers` | All 220k players (complete data) | ~60 min | Full refresh, baseline for daily stats |
| `syncLeagues` | League metadata, seasons | ~2 min | League info rarely changes |
| `syncCoaches` | Coach information | ~3 min | Coach changes are occasional |

**Total weekly duration:** ~65 minutes
**API calls:** ~4,500/week

**Why Sunday?**
- Low traffic day for maintenance
- Fresh data for the week ahead
- Doesn't interfere with daily syncs

### MONTHLY Queue
**Schedule:** 1st of each month (or on-demand)
**Purpose:** Reference data that rarely changes

| Job | Data | Duration | Why Monthly |
|-----|------|----------|-------------|
| `syncMetadataTypes` | Metadata type definitions | ~1 min | Rarely changes |
| `syncCountries` | Country data | ~2 min | Static data |
| `syncRivals` | Rivalry definitions | ~2 min | Rarely changes |

**Total monthly duration:** ~5 minutes
**API calls:** ~50/month

## Queue Workflow Example

### Typical Daily Schedule (Non-Match Day)

```
00:00 - Hourly queue: syncMatches (~5 min)
01:00 - Hourly queue: syncMatches (~5 min)
02:00 - Daily queue starts:
  ├─ syncActivePlayerStats (~5 min)
  └─ syncTeams (~45 min)
03:00 - Hourly queue: syncMatches (~5 min)
04:00 - Hourly queue: syncMatches (~5 min)
...continues hourly
```

### Sunday Schedule (Weekly Sync Day)

```
00:00 - Hourly queue: syncMatches (~5 min)
01:00 - Hourly queue: syncMatches (~5 min)
02:00 - Daily queue:
  ├─ syncActivePlayerStats (~5 min)
  └─ syncTeams (~45 min)
02:00 - Weekly queue (parallel):
  ├─ syncPlayers (~60 min, worker 1)
  ├─ syncLeagues (~2 min, worker 2)
  └─ syncCoaches (~3 min, worker 3)
03:00 - Hourly queue: syncMatches (~5 min)
...continues hourly
```

### 1st of Month Schedule

```
02:00 - Daily queue: (runs normally)
02:00 - Weekly queue: (if Sunday, runs normally)
02:00 - Monthly queue:
  ├─ syncMetadataTypes (~1 min)
  ├─ syncCountries (~2 min)
  └─ syncRivals (~2 min)
```

## API Rate Limit Management

### Daily API Usage (Typical)

| Queue | Jobs | Calls/Day | Notes |
|-------|------|-----------|-------|
| Hourly | syncMatches | ~480 | 20 calls × 24 hours |
| Daily | syncActivePlayerStats, syncTeams | ~500 | Active players + teams |
| **Total** | | **~980/day** | Well under 3000/hour limit |

### Weekly API Usage

| Day | Calls | Notes |
|-----|-------|-------|
| Mon-Sat | ~980/day | Daily + hourly |
| Sunday | ~5,480 | Daily + hourly + weekly |
| **Total** | **~11,360/week** | Sustainable |

### Monthly Spike

- 1st of month: +50 calls for monthly queue
- Minimal impact

## Triggering Syncs

### Automatic (Payload Scheduled)

Payload's job scheduler runs queues automatically based on configuration.

### Manual Trigger - All Jobs in Queue

```bash
# Trigger all hourly jobs
curl http://localhost:3000/api/queue-jobs/sync?queue=hourly

# Trigger all daily jobs
curl http://localhost:3000/api/queue-jobs/sync?queue=daily

# Trigger all weekly jobs
curl http://localhost:3000/api/queue-jobs/sync?queue=weekly

# Trigger all monthly jobs
curl http://localhost:3000/api/queue-jobs/sync?queue=monthly
```

### Manual Trigger - Individual Job

```bash
# Queue specific job
curl -X POST http://localhost:3000/api/queue-jobs/syncMatches
curl -X POST http://localhost:3000/api/queue-jobs/syncActivePlayerStats
curl -X POST http://localhost:3000/api/queue-jobs/syncPlayers

# Run job with worker
pnpm payload jobs:run syncMatches 1
pnpm payload jobs:run syncActivePlayerStats 1
NODE_OPTIONS="--expose-gc --max-old-space-size=8192" pnpm payload jobs:run syncPlayers 1
```

## Queue Design Principles

### 1. Frequency-Based Organization

Queue names match actual execution frequency:
- ✅ **Good:** `daily` queue runs daily
- ❌ **Bad:** `hourly` queue runs daily (old design)

### 2. Data Freshness Requirements

Jobs assigned based on how fresh users expect the data:
- Live scores → hourly
- Player stats → daily
- Full datasets → weekly
- Reference data → monthly

### 3. Duration Awareness

Long-running jobs in separate queues to avoid blocking:
- `syncPlayers` (60 min) in weekly queue
- `syncActivePlayerStats` (5 min) in daily queue
- Don't mix in same queue

### 4. API Rate Limit Optimization

Distribute API-heavy jobs across time:
- Hourly: ~20 calls
- Daily: ~500 calls
- Weekly: ~4,500 calls (concentrated on Sunday)
- Never approach 3000 calls/hour limit

### 5. Dependency Awareness

Some jobs depend on others:
- `syncActivePlayerStats` depends on recent match data
- Run `syncMatches` before `syncActivePlayerStats`
- Hourly queue ensures matches update first

## Monitoring Queues

### View Current Queue State

```bash
# See all queued and processing jobs
curl http://localhost:3000/api/queue-jobs/preview
```

**Response:**
```json
{
  "message": "Current queue state retrieved",
  "processingJobs": [
    {
      "task": "syncPlayers",
      "queue": "weekly",
      "startedAt": "2025-10-21T09:00:00Z",
      "duration": "00:15:32"
    }
  ],
  "queuedJobs": [
    {
      "task": "syncActivePlayerStats",
      "queue": "daily",
      "queuedAt": "2025-10-21T02:00:00Z"
    }
  ]
}
```

### Check Specific Job Status

```bash
# For player sync specifically
./scripts/check-sync-simple.sh

# For any job via Payload admin
# Navigate to: /admin/collections/payload-jobs
```

## Migration Notes

### Changes from Old Queue Structure

**Old queues:**
- `hourly` - Actually ran daily
- `nightly` - Actually ran weekly
- `daily` - Not used
- Confusing and misleading

**New queues:**
- `hourly` - Runs every hour ✅
- `daily` - Runs once per day ✅
- `weekly` - Runs once per week ✅
- `monthly` - Runs once per month ✅
- Clear and accurate

### Job Reassignments

| Job | Old Queue | New Queue | Reason |
|-----|-----------|-----------|--------|
| syncMatches | hourly | hourly | ✅ No change (was correct) |
| syncActivePlayerStats | hourly | **daily** | Fixed: actually runs daily |
| syncTeams | default | **daily** | Added: needs daily freshness |
| syncPlayers | nightly | **weekly** | Fixed: actually runs weekly |
| syncLeagues | default | **weekly** | Added: weekly refresh sufficient |
| syncCoaches | nightly | **weekly** | Fixed: weekly is sufficient |
| syncMetadataTypes | default | **monthly** | Added: rarely changes |
| syncCountries | default | **monthly** | Added: rarely changes |
| syncRivals | nightly | **monthly** | Fixed: rarely changes |

## Best Practices

1. **Monitor queue duration** - Ensure jobs complete before next execution
2. **Adjust if needed** - Move jobs between queues if patterns change
3. **Check API usage** - Monitor rate limits, especially on Sunday
4. **Use manual triggers sparingly** - Let scheduler handle routine syncs
5. **Document changes** - Update this file if you change queue assignments

## Troubleshooting

### Queue backlog building up

**Symptom:** Jobs queued but not processing
**Cause:** Workers not running or too slow
**Solution:** Increase worker count or move long jobs to less frequent queue

### Jobs running too frequently

**Symptom:** API rate limit warnings
**Cause:** Job in wrong queue
**Solution:** Move to less frequent queue (daily → weekly)

### Stale data complaints

**Symptom:** Users report outdated stats
**Cause:** Job in too infrequent queue
**Solution:** Move to more frequent queue (weekly → daily)

### Sunday performance issues

**Symptom:** High load on Sunday mornings
**Cause:** All weekly jobs running at once
**Solution:** Normal - weekly jobs complete in ~65 min, acceptable

## Related Documentation

- [Player Sync Strategy](./PLAYER_SYNC_STRATEGY.md)
- [Player Sync Memory](./PLAYER_SYNC_MEMORY.md)
- [Automated Validation](./AUTOMATED_VALIDATION.md)
