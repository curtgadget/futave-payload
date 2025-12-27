import { TaskHandler } from 'payload'
import { createRivalWithH2HSync } from '@/services/sync/handlers/rivalWithH2H.sync'

export const syncRivalsHandler: TaskHandler<'syncRivals'> = async (args) => {
  // Check if we should skip H2H sync (useful for testing or quick syncs)
  const skipH2H = (args?.job?.input as any)?.skipH2H === true
  
  const rivalSync = createRivalWithH2HSync({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }, {
    rivalDataTtlDays: 90, // TTL for base rival data (90 days)
    h2hTtlDays: 7, // TTL for H2H data (7 days)
  })

  try {
    const result = await rivalSync.sync()
    
    // Extract H2H stats if available
    const h2hStats = (result.stats as any).h2hPairs ? {
      h2hPairs: (result.stats as any).h2hPairs,
      h2hSynced: (result.stats as any).h2hSynced,
      h2hFailed: (result.stats as any).h2hFailed,
    } : {}
    
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
          ...h2hStats,
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