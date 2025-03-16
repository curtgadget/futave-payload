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
      const numericId = validateTeamId(teamId)

      const payload = await getPayload({ config })
      const teamResult = await payload.find({
        collection: 'teams',
        where: {
          id: {
            equals: numericId,
          },
        },
        depth: 1,
      })

      if (!teamResult.docs.length) {
        throw new Error(`No team found with ID: ${teamId}`)
      }

      const team = teamResult.docs[0]

      // Create a properly structured raw team object to avoid type issues
      const rawTeam = {
        id: team.id as number,
        name: team.name as string,
        standings:
          typeof team.standings === 'object' ? (team.standings as Record<string, any>) : null,
      }

      const transformedStandings = transformTeamTable(rawTeam)

      // In development, check if qualification statuses were found
      if (process.env.NODE_ENV === 'development') {
        // Check for qualification statuses
        Object.entries(transformedStandings).forEach(([seasonId, standingsData]) => {
          standingsData.standings.forEach((table) => {
            const teamsWithQualification = table.standings.filter((row) => row.qualification_status)

            if (teamsWithQualification.length > 0) {
              console.log(
                `Found ${teamsWithQualification.length} teams with qualification status in season ${seasonId}, table ${table.name}`,
              )

              // Group teams by qualification type for more helpful debugging
              const qualificationGroups: Record<string, any[]> = {}

              teamsWithQualification.forEach((team) => {
                const status = team.qualification_status!.type
                if (!qualificationGroups[status]) {
                  qualificationGroups[status] = []
                }
                qualificationGroups[status].push({
                  position: team.position,
                  name: team.team_name,
                  qualification: team.qualification_status!.name,
                })
              })

              // Log each qualification group
              Object.entries(qualificationGroups).forEach(([type, teams]) => {
                console.log(
                  `  - ${type} (${teams.length} teams):`,
                  teams.map((t) => `${t.position}. ${t.name}`).join(', '),
                )
              })
            }
          })
        })

        // Discover and log all rule type IDs for future reference
        logAllRuleTypeIds(rawTeam)
      }

      return transformedStandings
    } catch (error) {
      console.error('Error in getTable:', {
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  },

  async getFixtures(teamId: string): Promise<TeamFixturesResponse> {
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

      // Create a properly structured raw team object
      const rawTeam = {
        id: team.id as number,
        name: team.name as string,
        statistics: team.statistics || null,
      }

      return transformTeamStats(rawTeam)
    } catch (error) {
      console.error('Error in getStats:', {
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  },
}

/**
 * Logs all unique rule type IDs found in the standings data
 * This is used for development only to help discover new rule types
 */
function logAllRuleTypeIds(rawTeam: any): void {
  if (process.env.NODE_ENV !== 'development') return

  try {
    const typeIdMap: Record<string, Set<number>> = {}
    const leagueInfo: Record<string, number> = {}

    // Handle the structure from the team standings data
    const standings = rawTeam?.standings || {}

    // Iterate through each season in the standings
    Object.entries(standings).forEach(([seasonId, seasonData]: [string, any]) => {
      // Access the standings array from the season data
      const standingsData = seasonData?.standings?.data || []

      standingsData.forEach((table: any) => {
        // Get league ID if available
        const leagueId = table?.league_id

        // Access rows from each table
        const rows = table?.standings?.data || []

        rows.forEach((row: any) => {
          if (row?.rule?.type_id) {
            const typeId = row.rule.type_id
            const key = `${typeId}`

            if (!typeIdMap[key]) {
              typeIdMap[key] = new Set()
              if (leagueId) {
                leagueInfo[key] = leagueId
              }
            }
            typeIdMap[key].add(row.position)
          }
        })
      })
    })

    // Log the discovered type IDs
    if (Object.keys(typeIdMap).length > 0) {
      console.log(`\n--- RULE TYPE ID DISCOVERY FOR TEAM ${rawTeam.name} (ID: ${rawTeam.id}) ---`)
      Object.entries(typeIdMap).forEach(([typeId, positions]) => {
        const posArray = Array.from(positions).sort((a, b) => a - b)
        const leagueId = leagueInfo[typeId] ? ` (League ID: ${leagueInfo[typeId]})` : ''
        console.log(`Rule type_id ${typeId}${leagueId} found in positions: ${posArray.join(', ')}`)
      })
      console.log('--------------------------------\n')
    } else {
      console.log(`\n--- NO RULE TYPE IDS FOUND FOR TEAM ${rawTeam.name} (ID: ${rawTeam.id}) ---\n`)
    }
  } catch (error) {
    console.error('Error in logAllRuleTypeIds:', error)
  }
}
