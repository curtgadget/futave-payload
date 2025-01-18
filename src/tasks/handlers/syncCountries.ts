import { TaskHandler } from 'payload'
import { createCountrySync } from '@/services/sync/handlers/country.sync'

export const syncCountriesHandler: TaskHandler<'syncCountries'> = async () => {
  const sync = createCountrySync({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
  })

  try {
    const result = await sync.sync()
    return {
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
      output: {
        message: error instanceof Error ? error.message : 'Unknown error occurred during sync',
      },
    }
  }
}
