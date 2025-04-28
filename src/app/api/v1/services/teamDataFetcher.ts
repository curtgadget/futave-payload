import config from '@/payload.config'
import { getPayload } from 'payload'

import { getPositionGroup, PlayerStatisticTypeIds } from '@/constants/team'
import { calculateTopPlayerStats } from '../utils/statsUtils'
import {
  transformPlayer,
  transformTeamOverview,
  transformTeamResults,
  transformTeamStats,
  transformTeamTable,
  transformFixture,
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
  PlayerSeasonStats,
  TopPlayersStat,
  TopStatCategory,
  TopPlayerStatItem,
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
        season_map: Array.isArray(team.season_map) ? team.season_map : null,
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

  async getFixtures(
    teamId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<TeamFixturesResponse> {
    try {
      const numericId = validateTeamId(teamId)
      const payload = await getPayload({ config })

      // First get all matches for this team
      const result = await payload.find({
        collection: 'matches',
        where: {
          'participants.id': {
            equals: numericId,
          },
        },
        sort: '-starting_at',
        depth: 1,
        page,
        limit,
      })

      if (!result.docs.length) {
        return {
          docs: [],
          pagination: {
            totalDocs: 0,
            totalPages: 0,
            page: 1,
            hasNextPage: false,
            hasPrevPage: false,
            nextPage: null,
            prevPage: null,
            nextPageUrl: null,
            prevPageUrl: null,
          },
          nextMatch: null,
        }
      }

      const matches = result.docs.map(transformFixture)

      // Create the next and previous page URLs
      const nextPageUrl = result.hasNextPage
        ? `/api/v1/team/${teamId}?tab=fixtures&page=${page + 1}&limit=${limit}`
        : null

      const prevPageUrl = result.hasPrevPage
        ? `/api/v1/team/${teamId}?tab=fixtures&page=${page - 1}&limit=${limit}`
        : null

      // Find the next upcoming match
      const now = new Date()

      // Separately find the next upcoming match (regardless of pagination)
      // We need to use a different query to ensure we get the next match regardless of current page
      const nextMatchResult = await payload.find({
        collection: 'matches',
        where: {
          and: [
            {
              'participants.id': {
                equals: numericId,
              },
            },
            {
              starting_at: {
                greater_than: now.toISOString(),
              },
            },
          ],
        },
        sort: 'starting_at', // Ascending to get the soonest match
        limit: 1,
        depth: 1,
      })

      // Transform the next match if found
      const nextMatch =
        nextMatchResult.docs.length > 0 ? transformFixture(nextMatchResult.docs[0]) : null

      return {
        docs: matches,
        pagination: {
          totalDocs: result.totalDocs || 0,
          totalPages: result.totalPages || 0,
          page: result.page || 1,
          hasNextPage: result.hasNextPage || false,
          hasPrevPage: result.hasPrevPage || false,
          nextPage: result.nextPage || null,
          prevPage: result.prevPage || null,
          nextPageUrl,
          prevPageUrl,
        },
        nextMatch,
      }
    } catch (error) {
      console.error('Error in getFixtures:', {
        teamId,
        page,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
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

    type RawTeam = {
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

  async getStats(teamId: string, seasonId?: string): Promise<TeamStatsResponse> {
    try {
      const numericId = validateTeamId(teamId)
      const payload = await getPayload({ config })

      // First, get the team data
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

      // Create a properly structured raw team object for team stats
      const rawTeam = {
        id: team.id as number,
        name: team.name as string,
        statistics: team.statistics || null,
        season_map: Array.isArray(team.season_map) ? team.season_map : null,
      }

      // Transform team stats
      const teamStatsResponse = transformTeamStats(rawTeam, seasonId)

      // If we have players in the team, fetch their individual statistics
      if (Array.isArray(team.players) && team.players.length > 0) {
        const seasonIdNumber = seasonId ? parseInt(seasonId) : teamStatsResponse.season_id

        // Log how many players we're working with for debugging
        console.log(`Team ${team.name} has ${team.players.length} players in the team data`)

        try {
          // Extract player IDs from the team, with better error handling
          const playerIds = team.players
            .filter(
              (p: any) =>
                p &&
                // Accept different formats of player IDs
                (typeof p.player_id === 'number' ||
                  typeof p.id === 'number' ||
                  (p.player && typeof p.player.id === 'number')),
            )
            .map((p: any) => {
              // Extract the ID based on where it's found
              if (typeof p.player_id === 'number') return p.player_id
              if (typeof p.id === 'number') return p.id
              if (p.player && typeof p.player.id === 'number') return p.player.id
              return null
            })
            .filter(Boolean) // Remove any null values

          console.log(`Found ${playerIds.length} valid player IDs to look up`)

          if (playerIds.length > 0) {
            // Fetch player data with statistics - disable pagination to get all results
            const playersResult = await payload.find({
              collection: 'players',
              where: {
                id: {
                  in: playerIds,
                },
              },
              depth: 1,
              pagination: false,
              limit: 100, // Set a high limit to avoid pagination issues
            })

            console.log(
              `Retrieved ${playersResult.docs.length} players from the players collection`,
            )

            // Process player statistics for the selected season
            if (playersResult.docs.length > 0) {
              const playerStats = processPlayerStats(playersResult.docs, seasonIdNumber)

              // Add player statistics to the response
              teamStatsResponse.player_stats = playerStats
              console.log(
                `Processed ${playerStats.length} players with statistics for season ${seasonIdNumber}`,
              )

              // DIRECT IMPLEMENTATION: Add top_stats manually after all processing
              if (playerStats.length > 0) {
                console.log(`Creating top_stats with shared utility function`)

                // Calculate top_stats using the shared utility function
                teamStatsResponse.top_stats = calculateTopPlayerStats(playerStats, {
                  maxPlayersPerCategory: 3,
                  verbose: true,
                })

                // Log the results
                if (teamStatsResponse.top_stats.length > 0) {
                  console.log(
                    `SERVICE: Added ${teamStatsResponse.top_stats.length} stat categories:`,
                    teamStatsResponse.top_stats.map((stat) => stat.category).join(', '),
                  )
                } else {
                  console.error('SERVICE: calculateTopPlayerStats returned no stats')
                }
              }
            }
          }
        } catch (err) {
          console.error('Error retrieving player statistics:', err)
          // Don't fail the whole request if player stats retrieval fails
        }
      }

      // Final check before returning
      if (!teamStatsResponse.top_stats) {
        teamStatsResponse.top_stats = []
        console.log('Created top_stats array because it was undefined')
      }

      if (teamStatsResponse.top_stats && teamStatsResponse.top_stats.length === 0) {
        console.log('WARNING: top_stats is still empty after all processing!')
      }

      // Explicitly verify the shape of the object right before returning
      console.log(
        `FINAL CHECK - teamStatsResponse has these fields:`,
        Object.keys(teamStatsResponse),
      )
      console.log(
        `FINAL CHECK - top_stats in teamStatsResponse is array:`,
        Array.isArray(teamStatsResponse.top_stats),
      )
      console.log(`FINAL CHECK - top_stats length:`, teamStatsResponse.top_stats.length)

      // Check if player_stats is available
      console.log(`FINAL CHECK - player_stats length:`, teamStatsResponse.player_stats.length)

      // Last attempt - force a known good value directly onto the object
      if (
        teamStatsResponse.player_stats.length > 0 &&
        (!teamStatsResponse.top_stats || teamStatsResponse.top_stats.length === 0)
      ) {
        console.log('LAST RESORT: Forcing top_stats with a hardcoded value')

        const testTopStats: TopPlayersStat[] = []

        // Find a player with goals and add them
        const playerWithGoals = teamStatsResponse.player_stats.find(
          (p) => typeof p.goals === 'number' && p.goals > 0,
        )
        if (playerWithGoals) {
          testTopStats.push({
            category: 'goals' as TopStatCategory,
            players: [
              {
                player_id: playerWithGoals.player_id,
                name: playerWithGoals.name,
                value: playerWithGoals.goals || 0,
              },
            ],
          })
        }

        teamStatsResponse.top_stats = testTopStats
      }

      // Final verification
      console.log(`FINAL CHECK - top_stats after last resort:`, teamStatsResponse.top_stats.length)

      return teamStatsResponse
    } catch (error) {
      console.error('Error in getStats:', {
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error',
        seasonId,
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

/**
 * Process player statistics data for a specific season
 */
function processPlayerStats(players: any[], seasonId: number): PlayerSeasonStats[] {
  const playerStats: PlayerSeasonStats[] = []

  // For debugging
  const playerIdsWithStats: Set<string> = new Set()
  const playerIdsWithoutStats: Set<string> = new Set()

  // Debug: Log the raw players data
  console.log(
    'Debug - Raw players data sample:',
    players.slice(0, 2).map((p) => ({
      id: p.id,
      name: p.name,
      stats_keys: p.statistics ? Object.keys(p.statistics) : 'no statistics',
      first_stat: p.statistics ? JSON.stringify(Object.values(p.statistics)[0]) : 'none',
    })),
  )

  players.forEach((player) => {
    if (!player.id) {
      return
    }

    // Find statistics for the requested season
    const playerSeasonStats = findPlayerSeasonStats(player.statistics, seasonId)

    // Create the base player stats object with available data
    const playerStat: PlayerSeasonStats = {
      player_id: String(player.id),
      name: player.name || player.display_name || player.common_name || `Player ${player.id}`,
      position_id: player.position_id,
      jersey_number: playerSeasonStats?.jersey_number || getPlayerJerseyNumber(player),
      image_path: player.image_path || null,
      appearances: 0,
      minutes_played: 0,
    }

    // Add position name if we can determine it
    if (player.position_id) {
      const positionGroup = getPositionGroup(player.position_id)
      playerStat.position = positionGroup.charAt(0).toUpperCase() + positionGroup.slice(0, -1)
    }

    // Process statistics details if available
    if (playerSeasonStats && Array.isArray(playerSeasonStats.details)) {
      playerIdsWithStats.add(String(player.id))

      playerSeasonStats.details.forEach((detail: any) => {
        if (!detail || !detail.type_id || !detail.value) {
          return
        }

        const { type_id, value } = detail

        // Process different statistic types
        switch (type_id) {
          case PlayerStatisticTypeIds.APPEARANCES:
            // Appearances might be stored directly or in a total field
            if (typeof value === 'number') {
              playerStat.appearances = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.appearances = value.total
            }
            break

          case PlayerStatisticTypeIds.MINUTES_PLAYED:
            // Minutes might be stored directly or in a total field
            if (typeof value === 'number') {
              playerStat.minutes_played = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.minutes_played = value.total
            }
            break

          case PlayerStatisticTypeIds.GOALS:
            // Goals might be stored directly or in various fields
            if (typeof value === 'number') {
              playerStat.goals = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.goals = value.total
            } else if (value.goals && typeof value.goals === 'number') {
              playerStat.goals = value.goals
            }
            break

          case PlayerStatisticTypeIds.ASSISTS:
            // Assists might be stored directly or in a total field
            if (typeof value === 'number') {
              playerStat.assists = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.assists = value.total
            }
            break

          case PlayerStatisticTypeIds.YELLOW_CARDS:
            if (!playerStat.cards) {
              playerStat.cards = { yellow: 0, red: 0 }
            }
            // Yellow cards might be stored directly or in various fields
            if (typeof value === 'number') {
              playerStat.cards.yellow = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.cards.yellow = value.total
            }
            break

          case PlayerStatisticTypeIds.CLEAN_SHEETS:
            // Clean sheets (relevant for goalkeepers)
            if (typeof value === 'number') {
              playerStat.clean_sheets = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.clean_sheets = value.total
            }
            break

          // Add more statistic types as needed
        }
      })
    } else {
      // Track players without statistics
      playerIdsWithoutStats.add(String(player.id))
    }

    // Include all players with meaningful information, not just those with stats
    // This ensures squad players who haven't played are still included
    if (playerStat.appearances > 0 || playerStat.minutes_played > 0 || playerStat.jersey_number) {
      playerStats.push(playerStat)
    }
  })

  // Log stats about player statistics for debugging
  console.log(`Player stats summary:`)
  console.log(`- Players with stats for season ${seasonId}: ${playerIdsWithStats.size}`)
  console.log(`- Players without stats for season ${seasonId}: ${playerIdsWithoutStats.size}`)
  console.log(`- Total players returned: ${playerStats.length}`)

  // Sort by appearances (descending), then by minutes played (descending)
  return playerStats.sort((a, b) => {
    if (a.appearances !== b.appearances) {
      return b.appearances - a.appearances
    }
    return b.minutes_played - a.minutes_played
  })
}

/**
 * Extract jersey number from player data if not found in season stats
 */
function getPlayerJerseyNumber(player: any): number | undefined {
  // Try different potential locations of jersey number
  if (typeof player.jersey_number === 'number') {
    return player.jersey_number
  }

  // Look inside team data if available
  if (player.teams && Array.isArray(player.teams)) {
    const latestTeam = player.teams[0] // Often sorted with newest first
    if (latestTeam && typeof latestTeam.jersey_number === 'number') {
      return latestTeam.jersey_number
    }
  }

  return undefined
}

/**
 * Find player statistics for a specific season
 */
function findPlayerSeasonStats(statistics: Record<string, any>, seasonId: number): any {
  if (!statistics || typeof statistics !== 'object') {
    return null
  }

  // Look through all statistics entries to find the matching season
  for (const key in statistics) {
    const stat = statistics[key]
    if (stat && typeof stat === 'object' && stat.season_id === seasonId) {
      return stat
    }
  }

  return null
}
