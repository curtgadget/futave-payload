import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '@/payload.config'
import type {
  TabDataFetcher,
  TeamOverviewResponse,
  TeamTableResponse,
  TeamFixturesResponse,
  TeamResultsResponse,
  TeamSquadResponse,
  TeamStatsResponse,
} from '../types/team'
import {
  transformTeamOverview,
  transformTeamTable,
  transformTeamFixtures,
  transformTeamResults,
  transformTeamSquad,
  transformTeamStats,
  transformPlayer,
} from '../transformers/teamTransformers'

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
    return transformTeamOverview(result.docs[0])
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
    return transformTeamTable(result.docs[0])
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
    return transformTeamFixtures(result.docs[0])
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
    return transformTeamResults(result.docs[0])
  },

  async getSquad(teamId: string): Promise<TeamSquadResponse> {
    const payload = await getPayload({ config })

    interface RawTeam {
      id: number
      players?: Array<{ player_id: number }>
    }

    interface RawPlayer {
      id: number
      name: string
      position_id?: number
      detailed_position_id?: number
      common_name?: string
      firstname?: string
      lastname?: string
      display_name?: string
    }

    // First get the team data
    const teamResult = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: parseInt(teamId, 10),
        },
      },
      depth: 1,
    })

    const team = teamResult.docs[0] as unknown as RawTeam

    if (!team || !team.players) {
      return { players: [], coaches: [] }
    }

    // Get all player IDs from the team
    const playerIds = team.players.map((player) => player.player_id)

    if (playerIds.length === 0) {
      return { players: [], coaches: [] }
    }

    console.log('Player IDs to fetch:', playerIds)

    // Fetch detailed player information
    const playersResult = await payload.find({
      collection: 'players',
      where: {
        id: {
          in: playerIds,
        },
      },
      depth: 0,
    })

    console.log('Raw player data:', JSON.stringify(playersResult.docs, null, 2))

    const players = playersResult.docs as unknown as RawPlayer[]

    // Create a map of player details for quick lookup
    const playerDetailsMap = new Map(players.map((player) => [player.id, player]))

    // Merge team squad data with player details
    const enrichedSquad = team.players.map((squadMember) => {
      const playerDetails = playerDetailsMap.get(squadMember.player_id)
      if (!playerDetails) {
        console.log('No details found for player:', squadMember.player_id)
        return {
          id: String(squadMember.player_id),
          name: '',
        }
      }
      const transformed = transformPlayer(playerDetails)
      console.log('Transformed player:', JSON.stringify(transformed, null, 2))
      return transformed
    })

    return {
      players: enrichedSquad,
      coaches: [], // We're not handling coaches in this update
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
    return transformTeamStats(result.docs[0])
  },
}
