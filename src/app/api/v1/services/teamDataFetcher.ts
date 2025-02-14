import config from '@/payload.config'
import { getPayload } from 'payload'

import { getPositionGroup } from '@/constants/team'
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
  TeamPlayer,
  TeamResultsResponse,
  TeamSquadByPosition,
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
      const numericId = validateTeamId(teamId)
      const payload = await getPayload({ config })

      const result = await payload.find({
        collection: 'teams',
        where: {
          id: {
            equals: numericId,
          },
        },
        depth: 1,
      })

      if (!result.docs.length) {
        throw new Error(`No team found with ID: ${teamId}`)
      }

      const team = result.docs[0]
      if (!team.id || !team.name) {
        throw new Error(`Invalid team data structure for ID: ${teamId}`)
      }

      const rawTeam = {
        id: team.id,
        name: team.name,
        activeseasons: Array.isArray(team.activeseasons) ? team.activeseasons : null,
        seasons: Array.isArray(team.seasons) ? team.seasons : null,
        upcoming: Array.isArray(team.upcoming) ? team.upcoming : null,
        latest: Array.isArray(team.latest) ? team.latest : null,
        players: Array.isArray(team.players) ? team.players : null,
        coaches: Array.isArray(team.coaches) ? team.coaches : null,
        statistics: team.statistics || null,
      }

      return transformTeamOverview(rawTeam)
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

      const team = result.docs[0]
      return transformTeamFixtures({
        id: team.id,
        name: team.name,
        upcoming: Array.isArray(team.upcoming) ? team.upcoming : null,
      })
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

    if (!result.docs.length) {
      throw new Error(`No team found with ID: ${teamId}`)
    }

    const team = result.docs[0]
    return transformTeamResults({
      id: team.id,
      name: team.name,
      latest: Array.isArray(team.latest) ? team.latest : null,
    })
  },

  async getSquad(teamId: string): Promise<TeamSquadResponse> {
    const payload = await getPayload({ config })

    interface RawTeam {
      id: number
      players?: Array<{
        player_id: number
        captain?: boolean
        jersey_number?: number
        position_id?: number
        detailed_position_id?: number
      }>
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
      return {
        players: {
          goalkeepers: [],
          defenders: [],
          midfielders: [],
          forwards: [],
        },
        coaches: [],
      }
    }

    // Get all player IDs from the team
    const playerIds = team.players.map((player) => player.player_id)

    if (playerIds.length === 0) {
      console.log('No player IDs found')
      return {
        players: {
          goalkeepers: [],
          defenders: [],
          midfielders: [],
          forwards: [],
        },
        coaches: [],
      }
    }

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

    // Create a map of player details for quick lookup
    const playerDetailsMap = new Map(playersResult.docs.map((player) => [player.id, player]))

    // Initialize squad structure
    const squadByPosition: TeamSquadByPosition = {
      goalkeepers: [],
      defenders: [],
      midfielders: [],
      forwards: [],
    }

    // Transform and group players by position
    team.players.forEach((squadMember) => {
      const playerDetails = playerDetailsMap.get(squadMember.player_id)
      let transformedPlayer: TeamPlayer

      if (!playerDetails) {
        transformedPlayer = {
          id: String(squadMember.player_id),
          name: '',
          captain: squadMember.captain,
          jersey_number: squadMember.jersey_number,
          position_id: squadMember.position_id,
          detailed_position_id: squadMember.detailed_position_id,
        }
      } else {
        // Transform the player details
        const basePlayer = transformPlayer(playerDetails)

        // Override with squad-specific data
        transformedPlayer = {
          ...basePlayer,
          captain: squadMember.captain ?? basePlayer.captain,
          jersey_number: squadMember.jersey_number ?? basePlayer.jersey_number,
          position_id: squadMember.position_id ?? basePlayer.position_id,
          detailed_position_id: squadMember.detailed_position_id ?? basePlayer.detailed_position_id,
        }
      }

      // Add to the appropriate position group
      const group = getPositionGroup(transformedPlayer.position_id)
      squadByPosition[group].push(transformedPlayer)
    })

    // Sort each position group by jersey number if available
    Object.values(squadByPosition).forEach((players) => {
      players.sort((a, b) => {
        // Put players with jersey numbers first
        if (a.jersey_number && !b.jersey_number) return -1
        if (!a.jersey_number && b.jersey_number) return 1
        if (a.jersey_number && b.jersey_number) return a.jersey_number - b.jersey_number
        // If no jersey numbers, sort by name
        return a.name.localeCompare(b.name)
      })
    })

    return {
      players: squadByPosition,
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
