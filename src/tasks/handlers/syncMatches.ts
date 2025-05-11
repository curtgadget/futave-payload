import { TaskHandler } from 'payload'
import { createMatchSync, createMatchSyncByRange } from '@/services/sync/handlers/match.sync'

type SyncMatchesInput = {
  startDate?: string
  endDate?: string
  backfill?: boolean
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

// New: Backfill handler for legacy matches (last calendar year by default)
export const syncMatchesBackfillHandler: TaskHandler<'syncMatches'> = async ({ input }) => {
  const { startDate, endDate, backfill } = input as SyncMatchesInput
  if (!backfill) {
    return {
      success: false,
      output: { message: 'Backfill flag not set. This task only runs for manual backfill.' },
    }
  }
  // Default to last calendar year if not provided
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
  const start = startDate || new Date(Date.now() - ONE_YEAR_MS).toISOString().split('T')[0]
  const end = endDate || new Date().toISOString().split('T')[0]
  const config = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }
  const matchSync = createMatchSyncByRange(config, start, end)
  try {
    const result = await matchSync.sync()
    return {
      success: result.success,
      output: {
        message: `[BACKFILL] ${result.message}`,
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
        message: error instanceof Error ? error.message : 'Unknown error occurred during backfill',
      },
    }
  }
}
