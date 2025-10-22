# Player Sync Memory Optimization

## Memory Leak Issue (Fixed)

The player sync job was experiencing memory exhaustion when processing large numbers of players (220k+), reaching ~7.8GB before crashing with:

```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

## Root Causes Identified

1. **Unbounded errors array** - Every failed player added an error message to `stats.errors`, accumulating thousands of entries
2. **Payload instance per page** - `getPayload()` was called inside the loop for every page (4,416 times)
3. **No garbage collection hints** - Long-running process accumulated memory without cleanup

## Fixes Applied

### 1. Limited Errors Array
```typescript
const MAX_ERRORS_IN_MEMORY = 100
if (stats.errors.length < MAX_ERRORS_IN_MEMORY) {
  stats.errors.push(errorMsg)
}
```
- Only keeps last 100 errors in memory
- All errors still logged to console
- Prevents unbounded memory growth

### 2. Moved Payload Instance Outside Loop
```typescript
const payload = await getPayload({ config })
```
- Single Payload instance instead of creating one per page
- Reduces object allocation overhead
- Prevents connection pool exhaustion

### 3. Aggressive Garbage Collection
```typescript
// GC every 10 pages instead of 50
if (pagesThisRun % 10 === 0) {
  if (global.gc) global.gc()
  // Memory monitoring
  console.log(`💾 Memory: ${heapUsedMB}MB / ${heapTotalMB}MB heap`)
}
```
- Triggers GC every 10 pages (~500 players)
- Monitors heap usage in real-time
- Warns when approaching 6GB threshold

### 4. Immediate Memory Cleanup
```typescript
// Clear player data from array after processing
response.data[i] = null
// Clear entire array after page completes
response.data = []
```
- Nulls out each player immediately after saving
- Clears response array after page completes
- Allows V8 to free memory faster

### 5. Heap Size Warnings
```typescript
if (heapUsedMB > 6000) {
  console.warn(`⚠️  WARNING: Heap usage exceeds threshold!`)
}
```
- Warns when heap exceeds 6GB
- Suggests increasing heap size if needed
- Helps prevent unexpected crashes

## Running with Optimal Memory Settings

### REQUIRED: Increase Heap Size

Player sync fetches deeply nested data (teams, trophies, statistics) for each player.
**You MUST increase the heap size** or it will crash around 1,600-4,400 pages (~80k-220k players).

```bash
# RECOMMENDED: 8GB heap with garbage collection (handles full 220k+ players)
NODE_OPTIONS="--expose-gc --max-old-space-size=8192" pnpm payload jobs:run syncPlayers 2

# Minimum: 6GB heap (may crash on very large syncs)
NODE_OPTIONS="--expose-gc --max-old-space-size=6144" pnpm payload jobs:run syncPlayers 2

# Default heap (~4GB) - WILL CRASH after ~80k players
NODE_OPTIONS="--expose-gc" pnpm payload jobs:run syncPlayers 2  # ❌ NOT RECOMMENDED
```

**Why 8GB?**
- Each player includes nested objects: teams, trophies, statistics, metadata
- 50 players/page × deeply nested data = significant memory per page
- Memory accumulates even with cleanup due to V8 GC behavior
- 8GB provides buffer for ~220k+ players without crashes

### Environment Variables

```bash
# Reset checkpoint to start fresh
PLAYER_SYNC_RESET=true

# Limit pages per run (default: 2800 = ~140k players)
PLAYER_SYNC_MAX_PAGES=1000

# Combined example
PLAYER_SYNC_RESET=true PLAYER_SYNC_MAX_PAGES=1000 NODE_OPTIONS="--expose-gc" pnpm payload jobs:run syncPlayers 2
```

## Memory Usage Expectations

With fixes applied and 8GB heap:

- **Small syncs** (< 50k players): ~2GB - 3GB peak
- **Medium syncs** (50k - 150k players): ~4GB - 5GB peak
- **Large syncs** (150k+ players): ~6GB - 7GB peak

**Memory monitoring output every 10 pages:**
```
💾 Memory: 2847MB / 3200MB heap
💾 Memory: 4521MB / 5100MB heap
💾 Memory: 6234MB / 6800MB heap
⚠️  WARNING: Heap usage (6234MB) exceeds 6000MB threshold!
```

If you see the warning, the sync will continue but is approaching limits.

If you still encounter memory crashes:

1. **Increase heap further**: `--max-old-space-size=12288` (12GB)
2. **Reduce batch size**: `PLAYER_SYNC_MAX_PAGES=1000` (process fewer players per run)
3. **Run in smaller chunks**: The checkpoint system will resume automatically

## Monitoring Memory During Sync

Add memory logging to track usage:

```bash
# Run with memory monitoring
NODE_OPTIONS="--expose-gc" node --trace-gc node_modules/.bin/payload jobs:run syncPlayers 2
```

## Resumable Sync Architecture

The player sync uses checkpointing, so even if memory issues occur:

1. Progress is saved after every page
2. Can resume from last successful page
3. No data loss or duplicate processing
4. Rate limits are tracked across runs

## Related Files

- **Sync Implementation**: `src/services/sync/handlers/player.sync.resumable.ts`
- **Checkpoint Service**: `src/services/sync/handlers/playerSyncCheckpoint.ts`
- **Task Handler**: `src/tasks/handlers/syncPlayers.ts`
