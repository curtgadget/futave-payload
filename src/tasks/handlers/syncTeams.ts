import { TaskHandler } from 'payload'
import { SportmonksClient } from '@/services/sportmonks/client'
import { TeamsEndpoint } from '@/services/sportmonks/client/endpoints/teams'
import { TeamSyncService } from '@/services/sync/handlers/team.sync'

export const syncTeamsHandler: TaskHandler<'syncTeams'> = async () => {
  const client = new SportmonksClient({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  })

  const teamsEndpoint = new TeamsEndpoint({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  })

  const teamSync = new TeamSyncService(teamsEndpoint)

  try {
    const result = await teamSync.sync()
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
