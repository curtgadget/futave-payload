import { TaskHandler } from 'payload'
import { createMetadataTypeSync } from '@/services/sync/handlers/metadataType.sync'

export const syncMetadataTypesHandler: TaskHandler<'syncMetadataTypes'> = async () => {
  const metadataTypeSync = createMetadataTypeSync({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  })

  try {
    const result = await metadataTypeSync.sync()
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
