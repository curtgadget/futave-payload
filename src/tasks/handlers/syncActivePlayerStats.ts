import { TaskHandler } from 'payload'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createPlayerEndpoint } from '@/services/sportmonks/client/endpoints/player'
import { transformPlayer } from '@/services/sportmonks/transformers/player.transformer'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export const syncActivePlayerStatsHandler: TaskHandler<'syncActivePlayerStats'> = async () => {
  const startTime = Date.now()
  const payload = await getPayload({ config })

  const stats = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
    activePlayersFound: 0,
    matchesScanned: 0,
  }

  try {
    payload.logger.info('Starting active player stats sync')

    // Step 1: Find completed matches from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS)

    const completedMatches = await payload.find({
      collection: 'matches',
      where: {
        and: [
          { state_id: { equals: 5 } }, // FULL_TIME
          { starting_at: { greater_than_equal: thirtyDaysAgo } },
        ],
      },
      limit: 10000, // ~300 matches/day × 30 days = ~9000 matches
      pagination: false,
    })

    stats.matchesScanned = completedMatches.docs.length
    payload.logger.info(`Found ${stats.matchesScanned} completed matches in last 30 days`)

    // Step 2: Extract unique active player IDs from lineups
    const activePlayerIds = new Set<number>()

    completedMatches.docs.forEach((match: any) => {
      if (match.lineups && Array.isArray(match.lineups)) {
        match.lineups.forEach((lineup: any) => {
          if (lineup.player_id) {
            activePlayerIds.add(lineup.player_id)
          }
        })
      }
    })

    stats.activePlayersFound = activePlayerIds.size
    payload.logger.info(`Found ${stats.activePlayersFound} unique active players`)

    if (activePlayerIds.size === 0) {
      return {
        success: true,
        output: {
          message: 'No active players found in recent matches',
          stats,
        },
      }
    }

    // Step 3: Fetch updated player data from Sportmonks
    const playerEndpoint = createPlayerEndpoint({
      apiKey: process.env.SPORTMONKS_API_KEY || '',
      baseUrl: process.env.SPORTMONKS_BASE_URL,
    })

    const playerIdsArray = Array.from(activePlayerIds)
    const BATCH_SIZE = 50 // Sportmonks pagination limit

    // Process players in batches
    for (let i = 0; i < playerIdsArray.length; i += BATCH_SIZE) {
      const batch = playerIdsArray.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(playerIdsArray.length / BATCH_SIZE)

      try {
        payload.logger.info(
          `Processing batch ${batchNumber}/${totalBatches} (${batch.length} players)`
        )

        // Fetch players by IDs
        // Note: Sportmonks uses semicolon-separated IDs in filter
        const playerIdsFilter = batch.join(';')

        const response = await playerEndpoint.client.fetchFromApi('/players', {
          filters: `playerIds:${playerIdsFilter}`,
          include: 'statistics.details;teams', // Stats + teams for transfers
          per_page: BATCH_SIZE,
        })

        if (!response.data || !Array.isArray(response.data)) {
          payload.logger.warn(`Batch ${batchNumber}: Invalid response from Sportmonks`)
          continue
        }

        // Update each player's statistics
        for (const sportmonksPlayer of response.data) {
          try {
            const transformedPlayer = transformPlayer(sportmonksPlayer as any)

            // Find existing player
            const existing = await payload.find({
              collection: 'players',
              where: { id: { equals: transformedPlayer.id } },
              limit: 1,
            })

            if (existing.docs.length > 0) {
              // Update only statistics and teams fields
              await payload.update({
                collection: 'players',
                id: existing.docs[0].id,
                data: {
                  statistics: transformedPlayer.statistics,
                  teams: transformedPlayer.teams,
                } as any,
              })
              stats.updated++
            } else {
              // Player doesn't exist - create it
              // This can happen for newly added players who played recently
              await payload.create({
                collection: 'players',
                data: transformedPlayer as any,
              })
              stats.created++
            }
          } catch (error) {
            stats.failed++
            const errorMsg = `Player ${(sportmonksPlayer as any).id}: ${error instanceof Error ? error.message : 'Unknown error'}`
            if (stats.errors.length < 100) {
              stats.errors.push(errorMsg)
            }
            payload.logger.error(errorMsg)
          }
        }

        payload.logger.info(
          `Batch ${batchNumber} complete: +${stats.updated} updated, +${stats.created} created`
        )
      } catch (error) {
        const errorMsg = `Batch ${batchNumber} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        stats.errors.push(errorMsg)
        payload.logger.error(errorMsg)
      }
    }

    const duration = Date.now() - startTime
    const message = `Active player stats sync completed: ${stats.updated} updated, ${stats.created} created, ${stats.failed} failed in ${Math.round(duration / 1000)}s`

    payload.logger.info(message)

    return {
      success: true,
      output: {
        message,
        stats: {
          ...stats,
          duration,
        },
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    payload.logger.error(`Active player stats sync failed: ${errorMessage}`)

    return {
      success: false,
      output: {
        message: errorMessage,
        stats,
      },
    }
  }
}
