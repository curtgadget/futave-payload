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

interface SportmonksTeam {
  id: number
  name: string
  image_path: string
  country_id: number
  coaches?: any
  players?: any
  latest?: any
  upcoming?: any
  seasons?: any
  activeseasons?: any
  statistics?: any
  trophies?: any
  socials?: any
  rankings?: any
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

    getAllTeams: (
      params: FetchParams = {
        include:
          'coaches;players;latest;upcoming;seasons;activeseasons;statistics;trophies;trophies.trophy;trophies.season;trophies.league;socials;rankings',
      },
    ) => fetchFromApi('/teams', { include: params.include }),
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

interface SyncOptions<T> {
  collection: string
  fetchData: () => Promise<{ data: T[] }>
  transformData: (item: T) => Record<string, any>
}

function createDataSync<T extends { id: number }>(options: SyncOptions<T>) {
  return async () => {
    const startTime = Date.now()
    const payload = await getPayload({ config })
    const stats = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ id: number; error: string }>,
    }

    try {
      const response = await options.fetchData()

      // Process items in batches
      const BATCH_SIZE = 10
      const batches = []

      for (let i = 0; i < response.data.length; i += BATCH_SIZE) {
        batches.push(response.data.slice(i, i + BATCH_SIZE))
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (item: T) => {
          try {
            const transformedData = options.transformData(item)
            const existing = await payload.find({
              collection: options.collection,
              where: { id: { equals: item.id } },
            })

            if (existing.totalDocs > 0) {
              await payload.update({
                collection: options.collection,
                where: { id: { equals: item.id } },
                data: transformedData,
              })
              stats.updated++
            } else {
              await payload.create({
                collection: options.collection,
                data: transformedData,
              })
              stats.created++
            }
          } catch (error) {
            stats.failed++
            stats.errors.push({
              id: item.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            payload.logger.error(`Failed to sync ${options.collection} ${item.id}:`, error)
          }
        })

        await Promise.all(batchPromises)
      }

      const duration = Date.now() - startTime
      payload.logger.info({
        msg: `${options.collection} sync completed in ${duration}ms`,
        stats: {
          created: stats.created,
          updated: stats.updated,
          failed: stats.failed,
          totalProcessed: stats.created + stats.updated + stats.failed,
        },
      })

      if (stats.errors.length > 0) {
        payload.logger.warn({ msg: `${options.collection} sync errors`, errors: stats.errors })
      }

      return stats
    } catch (error) {
      payload.logger.error(`Failed to fetch ${options.collection} from Sportmonks:`, error)
      throw error
    }
  }
}

// Usage for leagues and teams
const createLeagueSync = (sportmonksClient: ReturnType<typeof createSportmonksClient>) => ({
  syncLeagueData: createDataSync<SportmonksLeague>({
    collection: 'leagues',
    fetchData: () => sportmonksClient.getAllLeagues(),
    transformData: transformLeagueData,
  }),
})

const transformTeamData = (team: SportmonksTeam) => ({
  id: team.id,
  name: team.name,
  logo_path: team.image_path,
  country_id: team.country_id,
  coaches: team.coaches || null,
  players: team.players || null,
  latest: team.latest || null,
  upcoming: team.upcoming || null,
  seasons: team.seasons || null,
  activeseasons: team.activeseasons || null,
  statistics: team.statistics || null,
  trophies: team.trophies || null,
  socials: team.socials || null,
  rankings: team.rankings || null,
})

const createTeamSync = (sportmonksClient: ReturnType<typeof createSportmonksClient>) => ({
  syncTeamData: createDataSync<SportmonksTeam>({
    collection: 'teams',
    fetchData: () => sportmonksClient.getAllTeams(),
    transformData: transformTeamData,
  }),
})

export { createSportmonksClient, createLeagueSync, createTeamSync }
