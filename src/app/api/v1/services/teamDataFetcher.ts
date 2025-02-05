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

function validateTeamId(teamId: string): number {
  const numericId = parseInt(teamId, 10)
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error('Invalid team ID format')
  }
  return numericId
}

export const teamDataFetcher: TabDataFetcher = {
  async getOverview(teamId: string): Promise<TeamOverviewResponse> {
    try {
      console.log('Fetching team overview for ID:', teamId)
      const numericId = validateTeamId(teamId)

      const payload = await getPayload({ config })
      console.log('Querying teams collection with ID:', numericId)

      const result = await payload.find({
        collection: 'teams',
        where: {
          id: {
            equals: numericId,
          },
        },
        depth: 0,
      })

      console.log('Team overview query result:', {
        totalDocs: result.totalDocs,
        hasResults: result.docs.length > 0,
      })

      if (!result.docs.length) {
        throw new Error(`No team found with ID: ${teamId}`)
      }

      const team = result.docs[0]
      if (!team.id || !team.name) {
        throw new Error(`Invalid team data structure for ID: ${teamId}`)
      }

      console.log('Team data before transform:', {
        id: team.id,
        name: team.name,
      })

      const transformed = transformTeamOverview(team)
      console.log('Team data after transform:', {
        id: transformed.id,
        name: transformed.name,
      })

      return transformed
    } catch (error) {
      console.error('Error in getOverview:', {
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  },

  async getTable(teamId: string): Promise<TeamTableResponse> {
    try {
      console.log('Fetching team table for ID:', teamId)
      const numericId = validateTeamId(teamId)

      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: 'teams',
        where: {
          id: {
            equals: numericId,
          },
        },
        depth: 0,
      })

      if (!result.docs.length) {
        throw new Error(`No team found with ID: ${teamId}`)
      }

      return transformTeamTable(result.docs[0])
    } catch (error) {
      console.error('Error in getTable:', {
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  },

  async getFixtures(teamId: string): Promise<TeamFixturesResponse> {
    try {
      console.log('Fetching team fixtures for ID:', teamId)
      const numericId = validateTeamId(teamId)

      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: 'teams',
        where: {
          id: {
            equals: numericId,
          },
        },
        depth: 0,
      })

      if (!result.docs.length) {
        throw new Error(`No team found with ID: ${teamId}`)
      }

      return transformTeamFixtures(result.docs[0])
    } catch (error) {
      console.error('Error in getFixtures:', {
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
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
