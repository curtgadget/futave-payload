import { TaskHandler } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createMatchSync, createMatchSyncByRange } from '@/services/sync/handlers/match.sync'
import { createMatchSyncWithWaveScore } from '@/services/sync/handlers/matchWithWaveScore.sync'

type SyncMatchesInput = {
  startDate?: string
  endDate?: string
  backfill?: boolean
  calculateWaveScores?: boolean
}

export const syncMatchesHandler: TaskHandler<'syncMatches'> = async ({ input }) => {
  const { startDate, endDate, calculateWaveScores = true } = input as SyncMatchesInput // Default to true
  const apiConfig = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }

  // Use enhanced sync if wave scores requested and we have a date range
  if (calculateWaveScores && startDate && endDate) {
    const payload = await getPayload({ config })
    const matchSync = createMatchSyncWithWaveScore(
      apiConfig, 
      payload, 
      startDate, 
      endDate,
      {
        calculateWaveScores: true,
        onlyFutureMatches: true,
        maxDaysAhead: 14
      }
    )
    
    try {
      const result = await matchSync.sync()
      return {
        success: result.success,
        output: {
          message: `${result.message} (with enhanced wave scores)`,
          stats: {
            created: result.stats.created,
            updated: result.stats.updated,
            failed: result.stats.failed,
            errors: result.stats.errors,
            duration: result.stats.endTime ? result.stats.endTime - result.stats.startTime : 0,
            waveScoresNote: "Wave scores calculated for upcoming matches within 14 days"
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

  // Default behavior - now WITH wave scores for date ranges
  if (startDate && endDate) {
    // Use wave score sync for date ranges (most common production case)
    const payload = await getPayload({ config })
    const matchSync = createMatchSyncWithWaveScore(
      apiConfig, 
      payload, 
      startDate, 
      endDate,
      {
        calculateWaveScores: true,
        onlyFutureMatches: true,
        maxDaysAhead: 14
      }
    )
    
    try {
      const result = await matchSync.sync()
      return {
        success: result.success,
        output: {
          message: `${result.message} (with wave scores - default behavior)`,
          stats: {
            created: result.stats.created,
            updated: result.stats.updated,
            failed: result.stats.failed,
            errors: result.stats.errors,
            duration: result.stats.endTime ? result.stats.endTime - result.stats.startTime : 0,
            waveScoresNote: "Wave scores calculated by default for date range syncs"
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
  
  // Fallback for syncs without date range (no wave scores)
  const matchSync = createMatchSync(apiConfig)

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
