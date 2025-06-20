import { TaskHandler } from 'payload'
import { createResumablePlayerSync } from '@/services/sync/handlers/player.sync.resumable'

export const syncPlayersHandler: TaskHandler<'syncPlayers'> = async () => {
  // Check for reset flag to force fresh start
  const resetCheckpoint = process.env.PLAYER_SYNC_RESET === 'true'
  const maxPagesPerRun = parseInt(process.env.PLAYER_SYNC_MAX_PAGES || '2800', 10) // ~2800 pages = 140k players, leaving buffer for other API calls

  const playerSync = createResumablePlayerSync(
    {
      apiKey: process.env.SPORTMONKS_API_KEY || '',
      baseUrl: process.env.SPORTMONKS_BASE_URL,
      concurrencyLimit: 8, // Optimized API request concurrency (within 3000/hour rate limit)
    },
    {
      resetCheckpoint,
      maxPagesPerRun,
      syncId: 'player-sync-main',
    }
  )

  try {
    const result = await playerSync.sync()
    return {
      success: result.success,
      output: {
        message: result.message,
        stats: {
          created: result.stats.created,
          updated: result.stats.updated,
          failed: result.stats.failed,
          errors: result.stats.errors,
          duration: result.stats.endTime ? result.stats.endTime - result.stats.startTime : 0,
          pagesProcessed: result.stats.pagesProcessed,
          totalPlayersProcessed: result.stats.totalPlayersProcessed,
          isComplete: result.stats.isComplete,
          nextResumeTime: result.stats.nextResumeTime?.toISOString(),
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      output: {
        message: error instanceof Error ? error.message : 'Unknown error occurred during sync',
      },
    }
  }
}
