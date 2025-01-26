import { TaskHandler } from 'payload'
import { createMatchSync, createMatchSyncByRange } from '@/services/sync/handlers/match.sync'

type SyncMatchesInput = {
  startDate?: string
  endDate?: string
}

export const syncMatchesHandler: TaskHandler<'syncMatches'> = async ({ input }) => {
  const { startDate, endDate } = input as SyncMatchesInput
  const config = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }

  const matchSync =
    startDate && endDate
      ? createMatchSyncByRange(config, startDate, endDate)
      : createMatchSync(config)

  try {
    const result = await matchSync.sync()
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
