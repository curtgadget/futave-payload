import { createSportmonksClient, createLeagueSync } from '@/services/SportsmonksService'
import type { TaskHandler } from 'payload'

export const syncLeaguesHandler: TaskHandler<'syncLeagues'> = async () => {
  const sportmonks = createSportmonksClient({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL || '',
  })

  const leagueSync = createLeagueSync(sportmonks)

  try {
    const stats = await leagueSync.syncLeagueData()

    return {
      success: true,
      output: {
        message: `Sync completed: ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed in ${stats.duration}ms`,
        currentSync: stats,
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

const testMessage = async () => 'ian is cool'

export const testJobsHandler: TaskHandler<'testJobs'> = async () => {
  const message = await testMessage()
  console.log("🚀 ~ consttestJobsHandler:TaskHandler<'testJobs'>= ~ message:", message)

  return {
    success: true,
    output: {
      testJobsOutput: message,
    },
  }
}
