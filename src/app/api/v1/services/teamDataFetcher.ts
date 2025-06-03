import config from '@/payload.config'
import { getPayload } from 'payload'

import { getPositionGroup, PlayerStatisticTypeIds } from '@/constants/team'
import { calculateTopPlayerStats } from '../utils/statsUtils'
import {
  transformPlayer,
  transformTeamStats,
  transformTeamTable,
  transformFixture,
  transformCoach,
} from '../transformers/teamTransformers'
import type {
  TabDataFetcher,
  TeamFixturesResponse,
  TeamPlayer,
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
  TeamFixture,
  MinimalTeamFixture,
  MinimalNextMatch,
  TeamCoach,
} from '../types/team'

// Team raw data types
type RawTeam = {
  id: number
  players?: Array<{
    player_id: number
    captain?: boolean
    jersey_number?: number
    position_id?: number
    detailed_position_id?: number
  }>
  coaches?: Array<{
    coach_id: number
    active?: boolean
    start?: string
    end?: string
    temporary?: boolean
  }>
}

// Create a utility function to validate team ID
function validateTeamId(teamId: string): number {
  const numericId = parseInt(teamId, 10)
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error('Invalid team ID format')
  }
  return numericId
}

// Helper function to get empty squad response
function getEmptySquadResponse(): TeamSquadResponse {
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

// Helper function to get and process coach data
async function getTeamCoaches(payload: any, team: any): Promise<TeamCoach[]> {
  // If no coaches, return empty array
  if (!team.coaches || team.coaches.length === 0) {
    return []
  }

  // Get all coach IDs from the team
  const coachIds = team.coaches.map((coach: any) => coach.coach_id)

  // Fetch coaches from the coaches collection
  const coachesResult = await payload.find({
    collection: 'coaches',
    where: {
      id: { in: coachIds },
    },
  })

  // Transform and merge coach data
  const transformedCoaches = coachesResult.docs.map((coach: any) => transformCoach(coach))
  return transformedCoaches.map((coach: any) => {
    // Find matching coach data from team.coaches
    const teamCoachData = team.coaches.find((tc: any) => tc.coach_id === coach.id)

    if (teamCoachData) {
      // Merge the data, preserving the transformed coach data but adding team-specific fields
      return {
        ...coach,
        ...(teamCoachData.active !== undefined && { active: teamCoachData.active }),
        ...(teamCoachData.start && { start: teamCoachData.start }),
        ...(teamCoachData.end && { end: teamCoachData.end }),
        ...(teamCoachData.temporary !== undefined && { temporary: teamCoachData.temporary }),
      }
    }

    return coach
  })
}

// Helper function to fetch position metadata
async function getPositionMetadata(payload: any, positionIds: number[]): Promise<Map<number, any>> {
  if (positionIds.length === 0) return new Map()

  try {
    const metadataResult = await payload.db.collections['metadata-types']
      .find({ _id: { $in: positionIds } })
      .lean()
      .exec()

    return new Map(metadataResult.map((metadata: any) => [metadata._id, metadata]))
  } catch (error) {
    console.error('Error fetching position metadata:', error)
    return new Map()
  }
}

// Helper function to get and process player data
async function getTeamPlayers(payload: any, team: any): Promise<TeamSquadByPosition> {
  // If no players, return empty structure
  if (!team.players || team.players.length === 0) {
    return {
      goalkeepers: [],
      defenders: [],
      midfielders: [],
      forwards: [],
    }
  }

  // Get all player IDs from the team
  const playerIds = team.players.map((player: any) => player.player_id)

  // Fetch detailed player information
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
  const playerDetailsMap = new Map(playersResult.docs.map((player: any) => [player.id, player]))

  // Collect all unique position IDs for metadata lookup
  const positionIds = new Set<number>()
  team.players.forEach((player: any) => {
    if (player.position_id) positionIds.add(player.position_id)
    if (player.detailed_position_id) positionIds.add(player.detailed_position_id)
  })

  // Fetch position metadata
  const positionMetadata: Map<number, any> = await getPositionMetadata(payload, Array.from(positionIds))

  // Initialize squad structure by position groups
  const squadByPosition: TeamSquadByPosition = {
    goalkeepers: [],
    defenders: [],
    midfielders: [],
    forwards: [],
  }

  // Transform and organize players by position
  organizePlayersByPosition(team.players, playerDetailsMap, squadByPosition, positionMetadata)
  
  // Sort each position group
  sortPlayerGroups(squadByPosition)
  
  return squadByPosition
}

// Helper function to transform and organize players by position
function organizePlayersByPosition(
  squadMembers: any[],
  playerDetailsMap: Map<number, any>,
  squadByPosition: TeamSquadByPosition,
  positionMetadata: Map<number, any>,
): void {
  squadMembers.forEach((squadMember) => {
    const playerDetails = playerDetailsMap.get(squadMember.player_id)
    let transformedPlayer: TeamPlayer

    if (!playerDetails) {
      // Handle missing player details
      transformedPlayer = {
        id: String(squadMember.player_id),
        name: '',
        captain: squadMember.captain,
        jersey_number: squadMember.jersey_number,
        position_id: squadMember.position_id,
        detailed_position_id: squadMember.detailed_position_id,
      }
    } else {
      // Transform player details and override with squad-specific data
      const basePlayer = transformPlayer(playerDetails)
      transformedPlayer = {
        ...basePlayer,
        captain: squadMember.captain ?? basePlayer.captain,
        jersey_number: squadMember.jersey_number ?? basePlayer.jersey_number,
        position_id: squadMember.position_id ?? basePlayer.position_id,
        detailed_position_id: squadMember.detailed_position_id ?? basePlayer.detailed_position_id,
      }
    }

    // Add position names from metadata
    if (transformedPlayer.position_id) {
      const positionMeta = positionMetadata.get(transformedPlayer.position_id)
      if (positionMeta) {
        transformedPlayer.position_name = positionMeta.name
      }
    }

    if (transformedPlayer.detailed_position_id) {
      const detailedPositionMeta = positionMetadata.get(transformedPlayer.detailed_position_id)
      if (detailedPositionMeta) {
        transformedPlayer.detailed_position_name = detailedPositionMeta.name
      }
    }

    // Add to the appropriate position group
    const group = getPositionGroup(transformedPlayer.position_id)
    squadByPosition[group].push(transformedPlayer)
  })
}

// Helper function to sort player groups
function sortPlayerGroups(squadByPosition: TeamSquadByPosition): void {
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
}

/**
 * Helper function to combine and deduplicate fixtures from upcoming and latest arrays
 */
function combineAndDedupeFixtures(upcoming: any[], latest: any[]): any[] {
  const upcomingArray = Array.isArray(upcoming) ? upcoming : []
  const latestArray = Array.isArray(latest) ? latest : []
  
  // Combine arrays
  const allFixtures = [...upcomingArray, ...latestArray]
  
  // Deduplicate by fixture ID (keep first occurrence)
  const seen = new Set<string>()
  return allFixtures.filter((fixture) => {
    const id = typeof fixture === 'string' ? fixture : fixture?.id
    if (!id || seen.has(String(id))) return false
    seen.add(String(id))
    return true
  })
}

/**
 * Helper function to enrich fixtures with match details from matches collection
 */
async function enrichWithMatchDetails(payload: any, fixtures: any[]): Promise<any[]> {
  if (fixtures.length === 0) return []
  
  const fixtureIds = fixtures.map((f) => (typeof f === 'string' ? f : f.id)).filter(Boolean)
  
  if (fixtureIds.length === 0) return fixtures
  
  const matchesResult = await payload.find({
    collection: 'matches',
    where: { id: { in: fixtureIds } },
    limit: fixtureIds.length,
    pagination: false,
  })
  
  const matchMap = new Map(matchesResult.docs.map((m: any) => [String(m.id), m]))
  
  return fixtures.map((fixture) => {
    const id = typeof fixture === 'string' ? fixture : fixture.id
    const match = matchMap.get(String(id))
    // Merge: prefer match fields, fallback to fixture fields
    return match ? { ...fixture, ...match } : fixture
  })
}

/**
 * Helper function to filter fixtures by type (past/upcoming/all)
 */
function filterFixturesByType(fixtures: any[], type: 'all' | 'past' | 'upcoming'): any[] {
  if (type === 'all') return fixtures
  
  const now = Date.now()
  
  return fixtures.filter((fixture) => {
    const timestamp = fixture.starting_at_timestamp * 1000
    return type === 'past' ? timestamp < now : timestamp >= now
  })
}

/**
 * Helper function to build temporal navigation URLs
 */
function buildTemporalNavigationUrls(
  baseUrl: string,
  currentPage: number,
  totalPages: number,
  queryParams: Record<string, any>,
  type: string
): { 
  next: string | null; 
  previous: string | null;
  newer: string | null;
  older: string | null;
} {
  const buildUrl = (page: number, newType?: string) => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    
    // Add other query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key === 'type' && newType) {
        params.set(key, newType)
      } else if (value !== undefined && value !== null) {
        params.set(key, String(value))
      }
    })
    
    return `${baseUrl}?${params.toString()}`
  }
  
  // Standard pagination
  const next = currentPage < totalPages ? buildUrl(currentPage + 1) : null
  const previous = currentPage > 1 ? buildUrl(currentPage - 1) : null
  
  // Temporal navigation based on fixture type
  let newer: string | null = null
  let older: string | null = null
  
  if (type === 'upcoming') {
    // For upcoming: newer = more future fixtures, older = past results
    newer = currentPage < totalPages ? buildUrl(currentPage + 1) : null
    older = buildUrl(1, 'past') // Switch to past results
  } else if (type === 'past') {
    // For past: newer = upcoming fixtures, older = more past fixtures  
    newer = buildUrl(1, 'upcoming') // Switch to upcoming
    older = currentPage < totalPages ? buildUrl(currentPage + 1) : null
  } else {
    // For 'all': use standard pagination
    newer = next
    older = previous
  }
  
  return { next, previous, newer, older }
}

/**
 * Fetches paginated fixtures for a team using both 'latest' and 'upcoming' arrays from the teams collection.
 * Uses simple page/limit pagination with comprehensive metadata for client URL construction.
 */
export async function getTeamFixturesCombined(
  teamId: string,
  options: {
    page?: number
    limit?: number
    type?: 'all' | 'past' | 'upcoming' | 'auto'
    includeNextMatch?: boolean
  } = {},
): Promise<TeamFixturesResponse<MinimalTeamFixture, MinimalNextMatch>> {
  const payload = await getPayload({ config })
  const { 
    page = 1, 
    limit = 10, 
    type: requestedType = 'auto',
    includeNextMatch = false 
  } = options

  // Validate pagination parameters
  const validatedPage = Math.max(1, page)
  const validatedLimit = Math.max(1, Math.min(100, limit)) // Cap at 100

  // Fetch the team document
  const team = await payload.findByID({
    collection: 'teams',
    id: teamId,
  })

  if (!team) {
    throw new Error(`Team with ID ${teamId} not found`)
  }

  // 1. Combine and deduplicate fixtures
  const combinedFixtures = combineAndDedupeFixtures(team.upcoming, team.latest)
  
  // 2. Enrich with match details
  const enrichedFixtures = await enrichWithMatchDetails(payload, combinedFixtures)
  
  // 3. Sort chronologically (will be re-sorted after type determination)
  const sortedFixtures = enrichedFixtures.sort((a, b) => {
    const aTime = a.starting_at_timestamp || 0
    const bTime = b.starting_at_timestamp || 0
    return bTime - aTime // Most recent first initially
  })
  
  // 4. Smart default: try upcoming first, fall back to past if empty
  let actualType = requestedType
  let filteredFixtures = sortedFixtures
  
  if (requestedType === 'auto') {
    // Try upcoming first
    const upcomingFixtures = filterFixturesByType(sortedFixtures, 'upcoming')
    if (upcomingFixtures.length > 0) {
      actualType = 'upcoming'
      filteredFixtures = upcomingFixtures
    } else {
      // Fall back to past fixtures
      const pastFixtures = filterFixturesByType(sortedFixtures, 'past')
      if (pastFixtures.length > 0) {
        actualType = 'past'
        filteredFixtures = pastFixtures
      } else {
        // Show all if no upcoming or past
        actualType = 'all'
        filteredFixtures = sortedFixtures
      }
    }
  } else {
    actualType = requestedType
    filteredFixtures = filterFixturesByType(sortedFixtures, requestedType)
  }
  
  // 5. Calculate pagination
  const totalFixtures = filteredFixtures.length
  const totalPages = Math.ceil(totalFixtures / validatedLimit)
  const offset = (validatedPage - 1) * validatedLimit
  const paginatedFixtures = filteredFixtures.slice(offset, offset + validatedLimit)
  
  // 6. Transform fixtures
  const docs = paginatedFixtures.map(transformFixture)
  
  // 6. Re-sort based on determined type for better UX
  if (actualType === 'upcoming') {
    // For upcoming: soonest first (ascending order)
    filteredFixtures = filteredFixtures.sort((a, b) => {
      const aTime = a.starting_at_timestamp || 0
      const bTime = b.starting_at_timestamp || 0
      return aTime - bTime
    })
  }
  // Past and all remain in descending order (most recent first)
  
  // 7. Build temporal navigation URLs
  const baseUrl = `/api/v1/team/${teamId}/fixtures`
  const navigationUrls = buildTemporalNavigationUrls(baseUrl, validatedPage, totalPages, {
    limit: validatedLimit,
    type: actualType,
    includeNextMatch: includeNextMatch ? 'true' : undefined,
  }, actualType)
  
  // 8. Optional next match calculation
  let nextMatch: MinimalNextMatch | null = null
  if (includeNextMatch) {
    const now = Date.now()
    const nextFixture = sortedFixtures
      .filter((f) => f.starting_at_timestamp * 1000 >= now)
      .sort((a, b) => a.starting_at_timestamp - b.starting_at_timestamp)[0]
    
    if (nextFixture) {
      // Simplified next match calculation (can be expanded as needed)
      const home = Array.isArray(nextFixture.participants)
        ? nextFixture.participants.find((p: any) => p.meta?.location === 'home')
        : null
      const away = Array.isArray(nextFixture.participants)
        ? nextFixture.participants.find((p: any) => p.meta?.location === 'away')
        : null
        
      nextMatch = {
        starting_at: nextFixture.starting_at,
        league: nextFixture.league
          ? { id: nextFixture.league.id, name: nextFixture.league.name }
          : { id: 0, name: '' },
        home_team: home
          ? { id: home.id, name: home.name, image_path: home.image_path ?? null }
          : { id: 0, name: '', image_path: null },
        away_team: away
          ? { id: away.id, name: away.name, image_path: away.image_path ?? null }
          : { id: 0, name: '', image_path: null },
        home_position: null, // Can be enhanced later
        away_position: null,
        home_goals_per_match: null,
        away_goals_per_match: null,
        home_goals_conceded_per_match: null,
        away_goals_conceded_per_match: null,
      }
    }
  }

  return {
    docs,
    meta: {
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total: totalFixtures,
        totalPages,
        type: actualType,
        // Standard pagination
        hasMorePages: validatedPage < totalPages,
        hasPreviousPages: validatedPage > 1,
        nextPage: navigationUrls.next,
        previousPage: navigationUrls.previous,
        // Temporal navigation (UX-friendly)
        hasNewer: navigationUrls.newer !== null,
        hasOlder: navigationUrls.older !== null,
        newerUrl: navigationUrls.newer,
        olderUrl: navigationUrls.older,
      },
    },
    nextMatch,
  }
}

export const teamDataFetcher: TabDataFetcher = {
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
    options: {
      page?: number
      limit?: number
      type?: 'all' | 'past' | 'upcoming'
      includeNextMatch?: boolean
    } = {},
  ): Promise<TeamFixturesResponse<MinimalTeamFixture, MinimalNextMatch>> {
    // Use the new simplified fixtures fetcher
    return getTeamFixturesCombined(teamId, options)
  },

  async getSquad(teamId: string): Promise<TeamSquadResponse> {
    try {
      const payload = await getPayload({ config })

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

      const team = teamResult.docs[0]

      // Return empty response if no team found
      if (!team) {
        return getEmptySquadResponse()
      }

      // Process coaches
      const coaches = await getTeamCoaches(payload, team)
      
      // Process players
      const players = await getTeamPlayers(payload, team)
      
      return {
        players,
        coaches,
      }
    } catch (error) {
      console.error('Error fetching team squad:', error)
      return getEmptySquadResponse()
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
        
        // Count total players in all positions
        let totalPlayers = 0
        Object.values(squadResponse.players).forEach((positionGroup) => {
          totalPlayers += positionGroup.length
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

        // Get player statistics for the selected season

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

          } catch (error) {
            console.error('Error fetching squad data:', error)
          }

          // 3. Combine player IDs from both sources
          const allPlayerIds = [
            ...Array.from(playerIdsFromTeamData),
            ...Array.from(playerIdsFromSquad),
          ]

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



            // 5. Process player statistics for the selected season
            if (playersResult.docs.length > 0) {
              const playerStats = processPlayerStats(
                playersResult.docs,
                seasonIdNumber,
                includeAllPlayers,
              )

              // Add player statistics to the response
              teamStatsResponse.player_stats = playerStats

              // 6. Calculate top stats using the complete player stats data
              if (playerStats.length > 0) {
                // Calculate top_stats using the shared utility function
                teamStatsResponse.top_stats = calculateTopPlayerStats(playerStats, {
                  maxPlayersPerCategory: 3,
                  verbose: true,
                })

                // Log the results
                if (teamStatsResponse.top_stats.length === 0) {
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


      // Last attempt - force a known good value directly onto the object if there are no top_stats
      if (
        teamStatsResponse.player_stats.length > 0 &&
        (!teamStatsResponse.top_stats || teamStatsResponse.top_stats.length === 0)
      ) {
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
        }
      }

      // Final check before returning
      if (!teamStatsResponse.top_stats) {
        teamStatsResponse.top_stats = []
      }

      // LAST RESORT FOR ASSISTS: Override the assists category
      if (teamStatsResponse.player_stats && teamStatsResponse.player_stats.length > 0) {
        // Sort players by assists (highest first)
        const playersByAssists = [...teamStatsResponse.player_stats]
          .filter((p) => p.assists !== undefined && p.assists > 0)
          .sort((a, b) => (b.assists || 0) - (a.assists || 0))

        if (playersByAssists.length > 0) {
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

  // Create a map of player IDs to player data for better debugging
  const playerMap = new Map(players.map((p) => [String(p.id), p]))

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
          playerStat.assists = assistValue
        }
      }
    } else {
      // Track players without statistics
      playerIdsWithoutStats.add(String(player.id))
    }

    // Always include all players, no filtering
    playerStats.push(playerStat)

  })


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
    countryId?: string
    search?: string
  }): Promise<TeamsListResponse> => {
    const { page, limit, countryId, search } = options

    try {
      const payload = await getPayload({ config })

      // Build the where query based on provided filters
      const where: Record<string, any> = {}

      // Add country filter if provided
      if (countryId) {
        where.country_id = {
          equals: parseInt(countryId, 10),
        }
      }

      // Add search filter if provided
      if (search) {
        where.or = [{ name: { like: `%${search}%` } }, { venue_name: { like: `%${search}%` } }]
      }


      // Query the database
      const result = await payload.find({
        collection: 'teams',
        where,
        page,
        limit,
      })


      // Transform the results to match the expected response format
      const teams = result.docs.map((team) => ({
        id: String(team.id),
        name: team.name as string,
        country_id: team.country_id as number,
        season_map: Array.isArray(team.season_map)
          ? team.season_map.map((s: any) => ({
              id: String(s.id),
              name: s.name,
            }))
          : [],
      }))

      return {
        data: teams,
        meta: {
          pagination: {
            page: result.page || page,
            limit: result.limit || limit,
            totalItems: result.totalDocs || 0,
            pageCount: result.totalPages || 0,
          },
        },
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
      // Return empty result on error
      return {
        data: [],
        meta: {
          pagination: {
            page,
            limit,
            totalItems: 0,
            pageCount: 0,
          },
        },
      }
    }
  },
}
