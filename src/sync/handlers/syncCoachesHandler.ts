import { createCoachSync } from '@/services/sync/handlers/coach.sync'

/**
 * Handler for syncing coaches data from Sportmonks
 */
export const syncCoachesHandler = async () => {
  try {
    console.log('Starting coaches sync job')

    const coachSync = createCoachSync({
      apiKey: process.env.SPORTMONKS_API_KEY || '',
      baseUrl: process.env.SPORTMONKS_BASE_URL,
      concurrencyLimit: 5, // Control API request concurrency
    })

    // Run the sync process
    const result = await coachSync.sync()

    console.log(
      `Coaches sync completed. Created: ${result.stats.created}, Updated: ${result.stats.updated}, Failed: ${result.stats.failed}`,
    )

    return {
      success: result.success,
      message: result.message,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Failed to sync coaches: ${errorMessage}`)
    return {
      success: false,
      message: `Failed to sync coaches: ${errorMessage}`,
    }
  }
}
