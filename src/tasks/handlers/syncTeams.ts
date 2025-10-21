import { TaskHandler } from 'payload'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createTeamSync } from '@/services/sync/handlers/team.sync'
import { validateTeamData } from '@/services/validation/dataValidator'

export const syncTeamsHandler: TaskHandler<'syncTeams'> = async () => {
  const teamSync = createTeamSync({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  })

  try {
    const result = await teamSync.sync()

    // Run post-sync validation if sync was successful
    if (result.success && process.env.ENABLE_AUTO_VALIDATION === 'true') {
      const payload = await getPayload({ config })

      try {
        // Get a sample of teams to validate (limit to avoid long execution)
        const teamsToValidate = await payload.find({
          collection: 'teams',
          limit: 5,
          sort: '-updatedAt', // Get recently updated teams
        })

        // Run validations for sample teams
        const validationPromises = teamsToValidate.docs.map(async (team: any) => {
          try {
            const validationResult = await validateTeamData(team.id, 'standings')

            // Store validation result
            await payload.create({
              collection: 'validation-results',
              data: {
                jobType: 'syncTeams',
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
