import { TaskHandler } from 'payload'
import { createPlayerSync } from '@/services/sync/handlers/player.sync'

export const syncPlayersHandler: TaskHandler<'syncPlayers'> = async () => {
  const playerSync = createPlayerSync({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
    concurrencyLimit: 5, // Control API request concurrency
  })

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
