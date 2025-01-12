import { createSportmonksClient, createTeamSync } from '@/services/SportsmonksService'
import type { TaskHandler } from 'payload'

export const syncTeamsHandler: TaskHandler<'syncTeams'> = async () => {
  const sportmonks = createSportmonksClient({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL || '',
  })

  const teamSync = createTeamSync(sportmonks)

  try {
    const stats = await teamSync.syncTeamData()

    return {
      success: true,
      output: {
        message: `Team sync completed: ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed`,
        stats,
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
