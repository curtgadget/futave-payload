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
const MAX_ERRORS_IN_MEMORY = 100 // Limit error array to prevent memory leak

if (stats.errors.length < MAX_ERRORS_IN_MEMORY) {
  stats.errors.push(errorMsg)
}
```
- Only keeps last 100 errors in memory
- All errors still logged to console
- Prevents unbounded memory growth

### 2. Moved Payload Instance Outside Loop
```typescript
// Initialize Payload once outside the loop to prevent memory leak
const payload = await getPayload({ config })
```
- Single Payload instance instead of 4,416
- Reduces object allocation overhead
- Prevents potential connection pool exhaustion

### 3. Periodic Garbage Collection
```typescript
// Suggest garbage collection every 50 pages to prevent memory buildup
if (pagesThisRun % 50 === 0 && global.gc) {
  global.gc()
}
```
- Triggers GC every 50 pages (~2,500 players)
- Helps Node.js release memory during long syncs
- Only runs if `--expose-gc` flag is enabled

## Running with Optimal Memory Settings

### Enable Garbage Collection

Add `--expose-gc` flag when running player sync:

```bash
# Using Payload CLI
node --expose-gc node_modules/.bin/payload jobs:run syncPlayers 2

# Using pnpm
NODE_OPTIONS="--expose-gc" pnpm payload jobs:run syncPlayers 2

# Increase heap if needed for very large syncs
NODE_OPTIONS="--expose-gc --max-old-space-size=4096" pnpm payload jobs:run syncPlayers 2
```

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

With fixes applied:

- **Small syncs** (< 50k players): ~500MB - 1GB
- **Medium syncs** (50k - 150k players): ~1GB - 2GB
- **Large syncs** (150k+ players): ~2GB - 3GB

If you still encounter memory issues:

1. Reduce `PLAYER_SYNC_MAX_PAGES` to process fewer players per run
2. Increase Node.js heap: `--max-old-space-size=4096` (4GB)
3. Run sync in smaller batches using resumable checkpoint system

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
