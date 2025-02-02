import { getPayload } from 'payload'
import config from '@/payload.config'
import type {
  TabDataFetcher,
  TeamOverviewResponse,
  TeamTableResponse,
  TeamFixturesResponse,
  TeamResultsResponse,
  TeamSquadResponse,
  TeamStatsResponse,
  TeamBase,
  TeamSeason,
  TeamFixture,
  TeamPlayer,
  TeamCoach,
} from '../types/team'

export const teamDataFetcher: TabDataFetcher = {
  async getOverview(teamId: string): Promise<TeamOverviewResponse> {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: teamId,
        },
      },
      depth: 0,
    })
    return result.docs[0] as TeamBase
  },

  async getTable(teamId: string): Promise<TeamTableResponse> {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: teamId,
        },
      },
      depth: 1,
    })
    const team = result.docs[0]
    return {
      activeseasons: (team?.activeseasons || []) as TeamSeason[],
      seasons: (team?.seasons || []) as TeamSeason[],
    }
  },

  async getFixtures(teamId: string): Promise<TeamFixturesResponse> {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: teamId,
        },
      },
      depth: 1,
    })
    const team = result.docs[0]
    return (team?.upcoming || []) as TeamFixture[]
  },

  async getResults(teamId: string): Promise<TeamResultsResponse> {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: teamId,
        },
      },
      depth: 1,
    })
    const team = result.docs[0]
    return (team?.latest || []) as TeamFixture[]
  },

  async getSquad(teamId: string): Promise<TeamSquadResponse> {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: teamId,
        },
      },
      depth: 1,
    })
    const team = result.docs[0]
    return {
      players: (team?.players || []) as TeamPlayer[],
      coaches: (team?.coaches || []) as TeamCoach[],
    }
  },

  async getStats(teamId: string): Promise<TeamStatsResponse> {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: teamId,
        },
      },
      depth: 1,
    })
    const team = result.docs[0]
    return team?.statistics || {}
  },
}
