import { SportmonksPlayer } from '../../sportmonks/client/types'
import { createPlayerEndpoint } from '../../sportmonks/client/endpoints/player'
import { transformPlayer } from '../../sportmonks/transformers/player.transformer'
import { SportmonksConfig } from '../../sportmonks/client/types'
import { getPayload } from 'payload'
import config from '@/payload.config'
import pLimit from 'p-limit'
import { logMissingPlayer } from '@/utilities/debugMissingPlayers'

export interface MissingPlayersSyncOptions {
  playerIds: number[]
  teamId?: number
  teamName?: string
  concurrency?: number
}

export interface MissingPlayersSyncResult {
  success: boolean
  message: string
  stats: {
    requested: number
    fetched: number
    created: number
    updated: number
    failed: number
    errors: Array<{
      playerId: number
      error: string
    }>
  }
}

export function createMissingPlayersSync(sportmonksConfig: SportmonksConfig) {
  const playerEndpoint = createPlayerEndpoint(sportmonksConfig)

  return async function syncMissingPlayers(
    options: MissingPlayersSyncOptions
  ): Promise<MissingPlayersSyncResult> {
    const { playerIds, teamId, teamName, concurrency = 5 } = options
    const payload = await getPayload({ config })
    
    const stats = {
      requested: playerIds.length,
      fetched: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ playerId: number; error: string }>,
    }

    if (playerIds.length === 0) {
      return {
        success: true,
        message: 'No players to sync',
        stats,
      }
    }

    console.log(`Starting targeted sync for ${playerIds.length} missing players`)
    if (teamId && teamName) {
      console.log(`Team: ${teamName} (ID: ${teamId})`)
    }

    // Create a concurrency limiter
    const limit = pLimit(concurrency)

    // Fetch players with concurrency control
    const fetchPromises = playerIds.map((playerId) =>
      limit(async () => {
        try {
          console.log(`Fetching player ${playerId}...`)
          const player = await playerEndpoint.getById(playerId)
          stats.fetched++
          return { playerId, player, error: null }
        } catch (error) {
          stats.failed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          stats.errors.push({ playerId, error: errorMessage })
          console.error(`Failed to fetch player ${playerId}: ${errorMessage}`)
          
          // Log the failure
          if (teamId) {
            logMissingPlayer(playerId, teamId, 'sync', {
              teamName,
              error: errorMessage,
              syncFailed: true,
            })
          }
          
          return { playerId, player: null, error: errorMessage }
        }
      })
    )

    const fetchResults = await Promise.all(fetchPromises)
    
    // Filter successful fetches
    const successfulFetches = fetchResults.filter(
      (result): result is { playerId: number; player: SportmonksPlayer; error: null } => 
        result.player !== null
    )

    if (successfulFetches.length === 0) {
      return {
        success: false,
        message: `Failed to fetch any players. ${stats.errors.length} errors occurred.`,
        stats,
      }
    }

    console.log(`Successfully fetched ${successfulFetches.length} players, processing...`)

    // Debug: Log the structure of the first player
    if (successfulFetches.length > 0) {
      const firstPlayer = successfulFetches[0].player
      console.log('Debug: First player structure:', JSON.stringify(firstPlayer, null, 2).substring(0, 500) + '...')
    }

    // Transform and save players
    for (const { player, playerId } of successfulFetches) {
      try {
        // Transform the player data
        const transformedPlayer = await transformPlayer(player)

        // Check if player already exists
        const existingPlayer = await payload.find({
          collection: 'players',
          where: { id: { equals: player.id } },
          limit: 1,
        })

        if (existingPlayer.docs.length > 0) {
          // Update existing player
          await payload.update({
            collection: 'players',
            id: existingPlayer.docs[0].id,
            data: transformedPlayer,
          })
          stats.updated++
          console.log(`Updated player ${player.id}: ${transformedPlayer.name}`)
        } else {
          // Create new player
          await payload.create({
            collection: 'players',
            data: transformedPlayer,
          })
          stats.created++
          console.log(`Created player ${player.id}: ${transformedPlayer.name}`)
        }
      } catch (error) {
        stats.failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        stats.errors.push({ playerId: playerId || player.id, error: `Save failed: ${errorMessage}` })
        console.error(`Failed to save player ${playerId || player.id}: ${errorMessage}`)
      }
    }

    const totalProcessed = stats.created + stats.updated
    const success = totalProcessed > 0

    return {
      success,
      message: success
        ? `Successfully synced ${totalProcessed} players (${stats.created} created, ${stats.updated} updated, ${stats.failed} failed)`
        : 'No players were successfully synced',
      stats,
    }
  }
}