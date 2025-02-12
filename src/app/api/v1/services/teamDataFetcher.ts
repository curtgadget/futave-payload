import config from '@/payload.config'
import { getPayload } from 'payload'

import {
  transformPlayer,
  transformTeamFixtures,
  transformTeamOverview,
  transformTeamResults,
  transformTeamStats,
  transformTeamTable,
} from '../transformers/teamTransformers'
import type {
  TabDataFetcher,
  TeamFixturesResponse,
  TeamOverviewResponse,
  TeamResultsResponse,
  TeamSquadResponse,
  TeamStatsResponse,
  TeamTableResponse,
} from '../types/team'

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

      console.log('We are here...')

      /*
      console.log('Team data before transform:', {
        id: team.id,
        name: team.name,
      })
      */

      const transformed = transformTeamOverview(team)
      /*
      console.log('Team data after transform:', {
        id: transformed.id,
        name: transformed.name,
      })
      */

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
    // console.log('Team data:', team.players)

    if (!team || !team.players) {
      return { players: [], coaches: [] }
    }

    // Get all player IDs from the team
    const playerIds = team.players.map((player) => player.player_id)
    console.log('🚀 ~ getSquad ~ playerIds:', playerIds)

    if (playerIds.length === 0) {
      console.log('No player IDs found')
      return { players: [], coaches: [] }
    }

    console.log('🚀 ~ here....')

    // Fetch detailed player information with pagination handling
    const playersResult = await payload.find({
      collection: 'players',
      where: {
        id: {
          in: playerIds,
        },
      },
      pagination: false,
    })

    console.log('🚀 ~ getSquad ~ playersResult:', playersResult)

    // Create a map of player details for quick lookup
    const playerDetailsMap = new Map(playersResult.docs.map((player) => [player.id, player]))

    // Merge team squad data with player details
    const enrichedSquad = team.players.map((squadMember) => {
      const playerDetails = playerDetailsMap.get(squadMember.player_id)
      if (!playerDetails) {
        return {
          id: String(squadMember.player_id),
          name: '',
        }
      }
      const transformed = transformPlayer(playerDetails)
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
