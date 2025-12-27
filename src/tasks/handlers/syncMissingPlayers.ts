import { TaskHandler, TaskHandlerArgs } from 'payload'
import { createMissingPlayersSync } from '@/services/sync/handlers/missingPlayers.sync'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface SyncMissingPlayersInput {
  playerIds: number[]
  teamId?: number
  teamName?: string
}

export const syncMissingPlayersHandler = async (args: any) => {
  const { input } = args
  
  if (!input || !input.playerIds || input.playerIds.length === 0) {
    return {
      success: false,
      output: {
        message: 'No player IDs provided for sync',
        stats: {
          requested: 0,
          fetched: 0,
          created: 0,
          updated: 0,
          failed: 0,
          errors: [],
        },
      },
    }
  }

  const missingPlayersSync = createMissingPlayersSync({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
    concurrencyLimit: 5, // Conservative to stay within rate limits
  })

  try {
    const result = await missingPlayersSync({
      playerIds: input.playerIds,
      teamId: input.teamId,
      teamName: input.teamName,
      concurrency: 5,
    })

    return {
      success: result.success,
      output: {
        message: result.message,
        stats: result.stats,
      },
    }
  } catch (error) {
    return {
      success: false,
      output: {
        message: error instanceof Error ? error.message : 'Unknown error occurred during missing players sync',
        stats: {
          requested: input.playerIds.length,
          fetched: 0,
          created: 0,
          updated: 0,
          failed: input.playerIds.length,
          errors: [{ playerId: -1, error: error instanceof Error ? error.message : 'Unknown error' }],
        },
      },
    }
  }
}