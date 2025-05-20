import { TaskHandler } from 'payload'
import { createCoachSync } from '@/services/sync/handlers/coach.sync'

export const syncCoachesHandler: TaskHandler<'syncCoaches'> = async () => {
  console.log('Starting coaches sync job')

  try {
    const coachSync = createCoachSync({
      apiKey: process.env.SPORTMONKS_API_KEY || '',
      baseUrl: process.env.SPORTMONKS_BASE_URL || 'https://api.sportmonks.com/v3/football',
      concurrencyLimit: 5, // Control API request concurrency
    })

    // Logging is managed by the sync service

    const result = await coachSync.sync()

    console.log(
      `Coaches sync completed. Created: ${result.stats.created}, Updated: ${result.stats.updated}, Failed: ${result.stats.failed}`,
    )

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(`Coaches sync failed: ${errorMessage}`, error)

    return {
      success: false,
      output: {
        message: `Coaches sync failed: ${errorMessage}`,
        stats: {
          created: 0,
          updated: 0,
          failed: 0,
          errors: [errorMessage],
          duration: 0,
        },
      },
    }
  }
}
