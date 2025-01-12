import { getPayload } from 'payload'
import config from '@/payload.config'

interface SportmonksConfig {
  apiKey: string
  baseUrl: string
}

interface FetchParams {
  include?: string
}

interface SportmonksLeague {
  id: number
  name: string
  image_path: string
  country_id: number
  type: string
  stages?: any
  latest?: any
  upcoming?: any
  inplay?: any
  today?: any
  currentseason?: any
  seasons?: any
}

const createSportmonksClient = (config: SportmonksConfig) => {
  const apiKey = config.apiKey
  const baseUrl = config.baseUrl || 'https://api.sportmonks.com/v3/football'

  const fetchFromApi = async (endpoint: string, params = {}) => {
    const queryString = new URLSearchParams({
      ...params,
      api_token: apiKey,
    }).toString()

    const url = `${baseUrl}${endpoint}?${queryString}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Sportmonks API error: ${response.statusText}`)
    }

    return response.json()
  }

  return {
    getAllLeagues: (
      params: FetchParams = {
        include: 'stages;latest;upcoming;inplay;today;currentseason;seasons',
      },
    ) => fetchFromApi('/leagues', { include: params.include }),

    getAllMatches: (params: FetchParams = { include: 'participants;scores' }) =>
      fetchFromApi('/fixtures', { include: params.include }),

    getAllTeams: (params: FetchParams = { include: 'country;coaches;players' }) =>
      fetchFromApi('/teams', { include: params.include }),
  }
}

const transformLeagueData = (league: SportmonksLeague) => ({
  id: league.id,
  name: league.name,
  logo_path: league.image_path,
  country_id: league.country_id,
  league_type: league.type,
  stages: league.stages || null,
  latest: league.latest || null,
  upcoming: league.upcoming || null,
  inplay: league.inplay || null,
  today: league.today || null,
  currentseason: league.currentseason || null,
  seasons: league.seasons || null,
})

const createLeagueSync = (sportmonksClient: ReturnType<typeof createSportmonksClient>) => {
  const syncLeagueData = async () => {
    const startTime = Date.now()
    const payload = await getPayload({ config })
    const stats = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ id: number; error: string }>,
    }

    try {
      const leagues = await sportmonksClient.getAllLeagues()

      // Process leagues in batches
      const BATCH_SIZE = 10
      const leagueBatches = []

      for (let i = 0; i < leagues.data.length; i += BATCH_SIZE) {
        leagueBatches.push(leagues.data.slice(i, i + BATCH_SIZE))
      }

      for (const batch of leagueBatches) {
        const batchPromises = batch.map(async (league: SportmonksLeague) => {
          try {
            const transformedLeague = transformLeagueData(league)
            const existingLeague = await payload.find({
              collection: 'leagues',
              where: { id: { equals: league.id } },
            })

            if (existingLeague.totalDocs > 0) {
              await payload.update({
                collection: 'leagues',
                where: { id: { equals: league.id } },
                data: transformedLeague,
              })
              stats.updated++
            } else {
              await payload.create({
                collection: 'leagues',
                data: transformedLeague,
              })
              stats.created++
            }
          } catch (error) {
            stats.failed++
            stats.errors.push({
              id: league.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            payload.logger.error(`Failed to sync league ${league.id}:`, error)
          }
        })

        await Promise.all(batchPromises)
      }

      const duration = Date.now() - startTime
      payload.logger.info({
        msg: `League sync completed in ${duration}ms`,
        stats: {
          created: stats.created,
          updated: stats.updated,
          failed: stats.failed,
          totalProcessed: stats.created + stats.updated + stats.failed,
        },
      })

      if (stats.errors.length > 0) {
        payload.logger.warn({ msg: 'Sync errors', errors: stats.errors })
      }

      return stats
    } catch (error) {
      payload.logger.error('Failed to fetch leagues from Sportmonks:', error)
      throw error
    }
  }

  return { syncLeagueData }
}

export { createSportmonksClient, createLeagueSync }
