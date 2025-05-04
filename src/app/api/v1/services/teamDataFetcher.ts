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
  TeamListDataFetcher,
  TeamsListResponse,
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

  async getStats(
    teamId: string,
    seasonId?: string,
    includeAllPlayers: boolean = false,
  ): Promise<TeamStatsResponse> {
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

      // For comparison, get the squad data
      try {
        const squadResponse = await this.getSquad(teamId)
        console.log('SQUAD INFO:')

        // Count total players in all positions
        let totalPlayers = 0
        Object.values(squadResponse.players).forEach((positionGroup) => {
          totalPlayers += positionGroup.length
        })

        console.log(`Squad has ${totalPlayers} total players`)

        // Log each position group
        Object.entries(squadResponse.players).forEach(([position, players]) => {
          console.log(`${position}: ${players.length} players`)
          players.forEach((player) => {
            console.log(
              `- ${player.name} (ID: ${player.id}, Jersey: ${player.jersey_number || 'none'})`,
            )
          })
        })
      } catch (err) {
        console.error('Error fetching squad for comparison:', err)
      }

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
          // 1. Get player IDs from the team data using multiple extraction methods
          const playerIdsFromTeamData = new Set<number>()

          // Extract using original method (specific object structures)
          team.players.forEach((p: any) => {
            if (!p) return

            // Try all possible locations where player ID might be stored
            if (typeof p.player_id === 'number') {
              playerIdsFromTeamData.add(p.player_id)
            }
            if (typeof p.id === 'number') {
              playerIdsFromTeamData.add(p.id)
            }
            if (p.player && typeof p.player.id === 'number') {
              playerIdsFromTeamData.add(p.player.id)
            }

            // Try additional formats that might appear in different data structures
            if (p.player_identifier && typeof p.player_identifier === 'number') {
              playerIdsFromTeamData.add(p.player_identifier)
            }
            if (p.player_ref && typeof p.player_ref === 'number') {
              playerIdsFromTeamData.add(p.player_ref)
            }

            // Try to extract from nested objects generically
            Object.entries(p).forEach(([key, value]) => {
              // If the key contains "player" and value is a number, it might be an ID
              if (key.toLowerCase().includes('player') && typeof value === 'number') {
                playerIdsFromTeamData.add(value as number)
              }

              // If value is an object with an id property, extract it
              if (
                value &&
                typeof value === 'object' &&
                'id' in value &&
                typeof value.id === 'number'
              ) {
                playerIdsFromTeamData.add(value.id as number)
              }
            })
          })

          console.log(`Found ${playerIdsFromTeamData.size} player IDs from team data`)

          // 2. Get player IDs from the squad data as a backup source
          let playerIdsFromSquad = new Set<number>()
          try {
            const squadResponse = await this.getSquad(teamId)

            // Extract player IDs from each position group
            Object.values(squadResponse.players).forEach((positionGroup) => {
              positionGroup.forEach((player) => {
                if (player.id) {
                  playerIdsFromSquad.add(parseInt(player.id, 10))
                }
              })
            })

            console.log(`Found ${playerIdsFromSquad.size} player IDs from squad data`)
          } catch (error) {
            console.error('Error fetching squad data:', error)
          }

          // 3. Combine player IDs from both sources
          const allPlayerIds = [
            ...Array.from(playerIdsFromTeamData),
            ...Array.from(playerIdsFromSquad),
          ]
          console.log(`Combined ${allPlayerIds.length} unique player IDs from all sources`)

          if (allPlayerIds.length > 0) {
            // 4. Fetch player data for all IDs
            const playersResult = await payload.find({
              collection: 'players',
              where: {
                id: {
                  in: allPlayerIds,
                },
              },
              depth: 1,
              pagination: false,
              // Increase limit to ensure we get all players
              limit: Math.max(100, allPlayerIds.length),
            })

            console.log(
              `Retrieved ${playersResult.docs.length} players from the players collection`,
            )

            // Log detailed information about retrieved player data
            console.log('PLAYERS DATA QUALITY CHECK:')
            console.log('-----------------------------------------------------')
            playersResult.docs.slice(0, 2).forEach((player: any, index) => {
              console.log(
                `Player ${index + 1}: ${player.name || player.display_name || 'Unknown'} (ID: ${player.id})`,
              )

              // Check for statistics structure
              if (player.statistics && typeof player.statistics === 'object') {
                const statKeys = Object.keys(player.statistics)
                console.log(`  Has statistics object with ${statKeys.length} entries`)

                // Check for the season we're looking for
                const seasonStats = findPlayerSeasonStats(player.statistics, seasonIdNumber)

                if (seasonStats) {
                  console.log(
                    `  FOUND STATS FOR SEASON ${seasonIdNumber}:`,
                    JSON.stringify(seasonStats).substring(0, 100) + '...',
                  )
                } else {
                  console.log(`  NO STATS FOR SEASON ${seasonIdNumber} found`)
                }
              } else {
                console.log('  NO STATISTICS FOUND for this player')
              }
              console.log('-----------------------------------------------------')
            })

            // 5. Process player statistics for the selected season
            if (playersResult.docs.length > 0) {
              const playerStats = processPlayerStats(
                playersResult.docs,
                seasonIdNumber,
                includeAllPlayers,
              )

              // Add player statistics to the response
              teamStatsResponse.player_stats = playerStats
              console.log(
                `Processed ${playerStats.length} players with statistics for season ${seasonIdNumber}`,
              )

              // 6. Calculate top stats using the complete player stats data
              if (playerStats.length > 0) {
                console.log(`Creating top_stats with ${playerStats.length} players`)

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

      // Final verification
      console.log(`FINAL CHECK - top_stats after last resort:`, teamStatsResponse.top_stats.length)

      // Last attempt - force a known good value directly onto the object if there are no top_stats
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

      // LAST RESORT: Directly override the assists category if we detect missing data
      if (teamStatsResponse.player_stats && teamStatsResponse.player_stats.length > 0) {
        // Sort players by assists (highest first)
        const playersByAssists = [...teamStatsResponse.player_stats]
          .filter((p) => p.assists !== undefined && p.assists > 0)
          .sort((a, b) => (b.assists || 0) - (a.assists || 0))

        if (playersByAssists.length > 0) {
          console.log('CRITICAL OVERRIDE: Manually fixing assists data')
          console.log('Top assist players found:')
          playersByAssists.slice(0, 3).forEach((p) => {
            console.log(`- ${p.name}: ${p.assists} assists`)
          })

          // Find the assists category in top_stats
          const assistsIndex = teamStatsResponse.top_stats.findIndex(
            (s) => s.category === 'assists',
          )

          // Create corrected assists category
          const correctedAssists = {
            category: 'assists' as TopStatCategory,
            players: playersByAssists.slice(0, 3).map((p) => ({
              player_id: p.player_id,
              name: p.name,
              value: p.assists || 0,
            })),
          }

          // Replace or add the category
          if (assistsIndex >= 0) {
            teamStatsResponse.top_stats[assistsIndex] = correctedAssists
          } else {
            teamStatsResponse.top_stats.push(correctedAssists)
          }

          console.log('CRITICAL OVERRIDE: Assists category fixed/added')
        } else {
          console.log('No players with assists found for direct override')
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

      // LAST RESORT FOR ASSISTS: Override the assists category
      if (teamStatsResponse.player_stats && teamStatsResponse.player_stats.length > 0) {
        // Sort players by assists (highest first)
        const playersByAssists = [...teamStatsResponse.player_stats]
          .filter((p) => p.assists !== undefined && p.assists > 0)
          .sort((a, b) => (b.assists || 0) - (a.assists || 0))

        if (playersByAssists.length > 0) {
          console.log('CRITICAL OVERRIDE: Manually fixing assists data')

          // Create corrected assists category
          const correctedAssists = {
            category: 'assists' as TopStatCategory,
            players: playersByAssists.slice(0, 3).map((p) => ({
              player_id: p.player_id,
              name: p.name,
              value: p.assists || 0,
            })),
          }

          // Find and replace or add the assists category
          const assistsIndex = teamStatsResponse.top_stats.findIndex(
            (s) => s.category === 'assists',
          )
          if (assistsIndex >= 0) {
            teamStatsResponse.top_stats[assistsIndex] = correctedAssists
          } else {
            teamStatsResponse.top_stats.push(correctedAssists)
          }

          console.log('ASSISTS OVERRIDE APPLIED')
        }
      }

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
 * @param players Array of player objects
 * @param seasonId Season ID to find statistics for
 * @param includeAllPlayers If true, include all players regardless of whether they have stats
 */
function processPlayerStats(
  players: any[],
  seasonId: number,
  includeAllPlayers: boolean = false,
): PlayerSeasonStats[] {
  const playerStats: PlayerSeasonStats[] = []

  // For debugging
  const playerIdsWithStats: Set<string> = new Set()
  const playerIdsWithoutStats: Set<string> = new Set()

  // Create a map of player IDs to player data for better debugging
  const playerMap = new Map(players.map((p) => [String(p.id), p]))

  // Log total available players
  console.log(`Processing ${players.length} players for season ${seasonId}`)
  console.log(`Player IDs available: ${Array.from(playerMap.keys()).join(', ')}`)

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

      // Primary scan - process standard statistic types
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
            // Assists might be stored in various formats
            if (typeof value === 'number') {
              playerStat.assists = value
            } else if (value && typeof value === 'object') {
              // Check multiple possible locations for assist data
              if (typeof value.total === 'number') {
                playerStat.assists = value.total
              } else if (typeof value.assists === 'number') {
                playerStat.assists = value.assists
              } else if (typeof value.value === 'number') {
                playerStat.assists = value.value
              } else if (Array.isArray(value.data) && value.data.length > 0) {
                // Some APIs store assists in a data array
                const assistData = value.data.find(
                  (d: any) => d && (d.type === 'assist' || d.type === 'assists'),
                )
                if (assistData && typeof assistData.value === 'number') {
                  playerStat.assists = assistData.value
                }
              }
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

      // Secondary scan - look for alternative statistic formats
      if (playerStat.assists === undefined) {
        // Look for assists that might be stored under different type IDs
        const alternateAssistIds = [
          102,
          103,
          104,
          1001,
          1002,
          1003,
          'assistances',
          'assist',
          'total_assist',
          'passing_assists',
        ]

        // Try the known alternate IDs
        const assistStat = playerSeasonStats.details.find((detail: any) => {
          if (!detail) return false

          // Check if type_id matches any alternate assist IDs
          if (alternateAssistIds.includes(detail.type_id)) {
            return true
          }

          // Check if the type name contains 'assist'
          if (
            detail.type &&
            typeof detail.type === 'string' &&
            detail.type.toLowerCase().includes('assist')
          ) {
            return true
          }

          return false
        })

        if (assistStat && assistStat.value) {
          console.log(
            `Found alternate assist stat for player ${player.name} (ID: ${player.id}):`,
            assistStat,
          )

          // Extract the assist value
          if (typeof assistStat.value === 'number') {
            playerStat.assists = assistStat.value
          } else if (assistStat.value && typeof assistStat.value === 'object') {
            if (typeof assistStat.value.total === 'number') {
              playerStat.assists = assistStat.value.total
            } else if (typeof assistStat.value.value === 'number') {
              playerStat.assists = assistStat.value.value
            }
          }
        }
      }

      // Tertiary scan - deep search in entire player statistics object
      if (playerStat.assists === undefined && player.statistics) {
        console.log(`Deep scanning player ${player.name} (ID: ${player.id}) for assist statistics`)

        // Define a recursive function to search the stats object
        const findAssistValue = (obj: any): number | undefined => {
          if (!obj || typeof obj !== 'object') return undefined

          // Check direct properties that might contain assist data
          if (obj.assists && typeof obj.assists === 'number') {
            return obj.assists
          }

          // Search for properties named with assist variations
          for (const key of Object.keys(obj)) {
            const lowerKey = key.toLowerCase()

            // Check for assist keywords
            if (lowerKey.includes('assist')) {
              const value = obj[key]

              // Handle direct number
              if (typeof value === 'number') {
                return value
              }

              // Handle object with total or value property
              if (value && typeof value === 'object') {
                if (typeof value.total === 'number') return value.total
                if (typeof value.value === 'number') return value.value
              }
            }

            // Recursively search nested objects
            if (obj[key] && typeof obj[key] === 'object') {
              // Skip circular references
              if (key === 'parent' || key === 'root') continue

              const nestedValue = findAssistValue(obj[key])
              if (nestedValue !== undefined) {
                return nestedValue
              }
            }
          }

          // Check arrays
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const arrayValue = findAssistValue(item)
              if (arrayValue !== undefined) {
                return arrayValue
              }
            }
          }

          return undefined
        }

        // Try to find assist data in the player statistics
        const assistValue = findAssistValue(player.statistics)
        if (assistValue !== undefined) {
          console.log(`Found deep-scan assist value for player ${player.name}: ${assistValue}`)
          playerStat.assists = assistValue
        }
      }
    } else {
      // Track players without statistics
      playerIdsWithoutStats.add(String(player.id))
    }

    // Always include all players, no filtering
    playerStats.push(playerStat)

    // Log if player has no stats for debugging purposes
    if (
      !(
        playerStat.appearances > 0 ||
        playerStat.minutes_played > 0 ||
        playerStat.jersey_number !== undefined
      )
    ) {
      console.log(
        `INCLUDED WITHOUT STATS: Player ${playerStat.name} (${playerStat.player_id}) has no stats or jersey number`,
      )
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
 * Find player statistics for a specific season - improved to handle more data formats
 */
function findPlayerSeasonStats(statistics: Record<string, any> | any, seasonId: number): any {
  // Handle missing statistics
  if (!statistics) {
    return null
  }

  // Convert to object if it's not already
  const statsObj = typeof statistics === 'object' ? statistics : { default: statistics }

  // Method 1: Direct season_id match in top-level stat objects
  for (const key in statsObj) {
    const stat = statsObj[key]
    if (stat && typeof stat === 'object') {
      // Direct match on season_id
      if (stat.season_id === seasonId) {
        return stat
      }

      // Look for season ID in a "season" property
      if (stat.season && stat.season.id === seasonId) {
        return stat
      }
    }
  }

  // Method 2: Look for a "seasons" array containing our season
  if (statsObj.seasons && Array.isArray(statsObj.seasons)) {
    const seasonStat = statsObj.seasons.find(
      (s: any) => s && (s.id === seasonId || s.season_id === seasonId),
    )
    if (seasonStat) {
      return seasonStat
    }
  }

  // Method 3: Look inside nested structures
  for (const key in statsObj) {
    const stat = statsObj[key]
    if (stat && typeof stat === 'object') {
      // Check for details array that might contain season-specific stats
      if (Array.isArray(stat.details)) {
        // If we have a details array with season info
        const seasonDetail = stat.details.find((d: any) => d && d.season_id === seasonId)
        if (seasonDetail) {
          return { ...stat, details: [seasonDetail] }
        }
      }

      // Check for a nested data object
      if (stat.data && typeof stat.data === 'object') {
        // Check if this data object has our season
        if (stat.data.season_id === seasonId) {
          return stat.data
        }

        // Some data might be stored in a 'statistics' field
        if (stat.data.statistics && typeof stat.data.statistics === 'object') {
          return findPlayerSeasonStats(stat.data.statistics, seasonId)
        }
      }
    }
  }

  // Method 4: Look for specially-named fields that could contain our season
  const possibleSeasonKeys = [`season_${seasonId}`, `${seasonId}`, `s${seasonId}`]

  for (const seasonKey of possibleSeasonKeys) {
    if (statsObj[seasonKey] && typeof statsObj[seasonKey] === 'object') {
      return statsObj[seasonKey]
    }
  }

  // Nothing found
  return null
}

/**
 * Service for fetching list of teams
 * This is a placeholder implementation that would be replaced with actual data fetching logic
 */
export const teamListDataFetcher: TeamListDataFetcher = {
  getTeams: async (options: {
    page: number
    limit: number
    leagueId?: string
    countryId?: string
    search?: string
    season?: string
  }): Promise<TeamsListResponse> => {
    const { page, limit, leagueId, countryId, search, season } = options
    console.log('Fetching teams with options:', {
      page,
      limit,
      leagueId,
      countryId,
      search,
      season,
    })

    // In a real implementation, this would fetch data from a database or external API
    // and apply the filtering options
    return {
      data: [
        {
          id: '1',
          name: 'Team A',
          season_map: [{ id: '2023', name: '2023/2024' }],
        },
        {
          id: '2',
          name: 'Team B',
          season_map: [{ id: '2023', name: '2023/2024' }],
        },
        {
          id: '3',
          name: 'Team C',
          season_map: [{ id: '2023', name: '2023/2024' }],
        },
        // More teams would be included in a real implementation
      ],
      meta: {
        pagination: {
          page,
          limit,
          totalItems: 100,
          totalPages: Math.ceil(100 / limit),
        },
      },
    }
  },
}
