import { TaskHandler } from 'payload'
import { createPlayerSync } from '@/services/sync/handlers/player.sync'

export const syncPlayersHandler: TaskHandler<'syncPlayers'> = async () => {
  // Check for incremental sync flag from environment or default to false
  const isIncremental = process.env.PLAYER_SYNC_INCREMENTAL === 'true'
  const lastSyncHours = parseInt(process.env.PLAYER_SYNC_HOURS || '24', 10)

  const playerSync = createPlayerSync(
    {
      apiKey: process.env.SPORTMONKS_API_KEY || '',
      baseUrl: process.env.SPORTMONKS_BASE_URL,
      concurrencyLimit: 8, // Optimized API request concurrency (within 3000/hour rate limit)
    },
    {
      incremental: isIncremental,
      lastSyncHours: lastSyncHours,
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
