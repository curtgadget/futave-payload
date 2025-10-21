import { TaskHandler } from 'payload'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createResumablePlayerSync } from '@/services/sync/handlers/player.sync.resumable'
import { validateTeamData } from '@/services/validation/dataValidator'

export const syncPlayersHandler: TaskHandler<'syncPlayers'> = async () => {
  // Check for reset flag to force fresh start
  const resetCheckpoint = process.env.PLAYER_SYNC_RESET === 'true'
  const maxPagesPerRun = parseInt(process.env.PLAYER_SYNC_MAX_PAGES || '2800', 10) // ~2800 pages = 140k players, leaving buffer for other API calls

  const playerSync = createResumablePlayerSync(
    {
      apiKey: process.env.SPORTMONKS_API_KEY || '',
      baseUrl: process.env.SPORTMONKS_BASE_URL,
      concurrencyLimit: 8, // Optimized API request concurrency (within 3000/hour rate limit)
    },
    {
      resetCheckpoint,
      maxPagesPerRun,
      syncId: 'player-sync-main',
    }
  )

  try {
    const result = await playerSync.sync()

    // Run post-sync validation if sync was successful and complete
    if (result.success && result.stats.isComplete && process.env.ENABLE_AUTO_VALIDATION === 'true') {
      const payload = await getPayload({ config })

      try {
        // Get a sample of teams to validate player stats
        const teamsToValidate = await payload.find({
          collection: 'teams',
          limit: 3,
          sort: '-updatedAt',
        })

        // Run validations
        const validationPromises = teamsToValidate.docs.map(async (team: any) => {
          try {
            const validationResult = await validateTeamData(team.id, 'playerstats')

            await payload.create({
              collection: 'validation-results',
              data: {
                jobType: 'syncPlayers',
                teamId: validationResult.teamId,
                teamName: validationResult.teamName,
                entity: validationResult.entity,
                status: validationResult.status,
                totalDiscrepancies: validationResult.totalDiscrepancies,
                comparisonSummary: validationResult.comparisonSummary,
                discrepancies: validationResult.discrepancies,
                syncRecommendations: validationResult.syncRecommendations,
                error: validationResult.error,
                executionTime: validationResult.executionTime,
              },
            })

            return validationResult
          } catch (error) {
            console.error(`Validation failed for team ${team.id}:`, error)
            return null
          }
        })

        const validationResults = await Promise.all(validationPromises)
        const successfulValidations = validationResults.filter((r) => r !== null)

        payload.logger.info({
          msg: `Post-sync validation completed: ${successfulValidations.length}/${teamsToValidate.docs.length} teams validated`,
          validations: successfulValidations.length,
        })
      } catch (validationError) {
        payload.logger.warn({
          msg: 'Post-sync validation failed',
          error: validationError instanceof Error ? validationError.message : 'Unknown error',
        })
      }
    }

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
          pagesProcessed: result.stats.pagesProcessed,
          totalPlayersProcessed: result.stats.totalPlayersProcessed,
          isComplete: result.stats.isComplete,
          nextResumeTime: result.stats.nextResumeTime?.toISOString(),
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
