import config from '@/payload.config'
import { getPayload } from 'payload'

import type {
  LeagueDataFetcher,
  LeagueOverviewResponse,
  LeagueStandingsResponse,
  LeagueTeamsResponse,
  LeagueMatchesResponse,
  LeagueStatsResponse,
  LeagueSeasonsResponse,
  LeagueListDataFetcher,
  LeaguesListResponse,
  StandingTable,
  StandingTableRow,
  StandingsData,
  LeaguePlayerStatCategory,
  LeagueTeamStatCategory,
} from '../types/league'

// Import the team transformer since leagues use the same structure
import { transformTeamTable } from '../transformers/teamTransformers'
import { calculateTopPlayerStats } from '../utils/statsUtils'
import type { PlayerSeasonStats, TopPlayersStat } from '../types/team'
import { PlayerStatisticTypeIds, TeamStatisticTypeIds } from '@/constants/team'

// Build temporal navigation URLs for league matches (copied from team logic)
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

// Process player statistics for league aggregation (using the same logic as team stats)
function processLeaguePlayerStats(players: any[], seasonId: number, leagueId: number): PlayerSeasonStats[] {
  const playerStats: PlayerSeasonStats[] = []

  let playersWithSeasonStats = 0
  let playersWithLeagueSpecificStats = 0
  let playersProcessed = 0

  players.forEach((player) => {
    if (!player.id) {
      return
    }

    playersProcessed++
    
    // Find statistics for the requested season AND league to avoid cross-competition contamination
    const playerSeasonStats = findPlayerSeasonStats(player.statistics, seasonId, leagueId)
    
    if (playerSeasonStats) {
      playersWithSeasonStats++
      if (playerSeasonStats.league_id === leagueId) {
        playersWithLeagueSpecificStats++
      }
    }

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

    // Process statistics details if available (same logic as team stats)
    if (playerSeasonStats && Array.isArray(playerSeasonStats.details)) {
      // Primary scan - process standard statistic types using the same logic as team stats
      playerSeasonStats.details.forEach((detail: any) => {
        if (!detail || !detail.type_id || !detail.value) {
          return
        }

        const { type_id, value } = detail

        // Process different statistic types (using constants and observed type IDs)
        switch (type_id) {
          case PlayerStatisticTypeIds.APPEARANCES: // 322
            if (typeof value === 'number') {
              playerStat.appearances = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.appearances = value.total
            }
            break

          case PlayerStatisticTypeIds.MINUTES_PLAYED: // 119
          case 214: // Alternative minutes played ID observed in logs
            if (typeof value === 'number') {
              playerStat.minutes_played = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.minutes_played = value.total
            }
            break

          case PlayerStatisticTypeIds.GOALS: // 52
            if (typeof value === 'number') {
              playerStat.goals = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.goals = value.total
            } else if (value.goals && typeof value.goals === 'number') {
              playerStat.goals = value.goals
            }
            break

          case PlayerStatisticTypeIds.ASSISTS: // 79 - Only use the primary assists type ID
            // Only process assists once to avoid double-counting
            if (playerStat.assists === undefined) {
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
                }
              }
            }
            break

          case PlayerStatisticTypeIds.YELLOW_CARDS: // 84
            if (!playerStat.cards) {
              playerStat.cards = { yellow: 0, red: 0 }
            }
            if (typeof value === 'number') {
              playerStat.cards.yellow = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.cards.yellow = value.total
            }
            break

          case PlayerStatisticTypeIds.CLEAN_SHEETS: // 194
          case 32: // Alternative clean sheets ID
            if (typeof value === 'number') {
              playerStat.clean_sheets = value
            } else if (value.total && typeof value.total === 'number') {
              playerStat.clean_sheets = value.total
            }
            break

          // Add more statistic types as needed
        }
      })
    }

    // Validate and cap assists at reasonable maximum (assists > 50 in a season is highly unlikely)
    if (playerStat.assists && playerStat.assists > 50) {
      playerStat.assists = 50
    }

    // Always include all players (same as team stats)
    playerStats.push(playerStat)
  })

  return playerStats
}

// Calculate aggregated league statistics from all player stats
function calculateLeagueAggregatedStats(playerStats: PlayerSeasonStats[]): any {
  const stats = {
    total_goals: 0,
    total_assists: 0,
    total_yellow_cards: 0,
    total_red_cards: 0,
    total_appearances: 0,
    total_minutes_played: 0,
    average_goals_per_player: 0,
    average_assists_per_player: 0,
  }

  playerStats.forEach(player => {
    stats.total_goals += player.goals || 0
    stats.total_assists += player.assists || 0
    // Cards are stored in the cards object
    stats.total_yellow_cards += player.cards?.yellow || 0
    stats.total_red_cards += player.cards?.red || 0
    stats.total_appearances += player.appearances || 0
    stats.total_minutes_played += player.minutes_played || 0
  })

  // Calculate averages
  const playerCount = playerStats.length
  if (playerCount > 0) {
    stats.average_goals_per_player = Math.round((stats.total_goals / playerCount) * 100) / 100
    stats.average_assists_per_player = Math.round((stats.total_assists / playerCount) * 100) / 100
  }

  return stats
}

// Enhanced function to create player stat categories for tabbed UI
function createPlayerStatCategories(playerStats: PlayerSeasonStats[], teamsMap: Map<string, { name: string; logo?: string }>): {
  top_scorers: LeaguePlayerStatCategory
  top_assists: LeaguePlayerStatCategory
  most_minutes: LeaguePlayerStatCategory
  top_goals_assists: LeaguePlayerStatCategory
} {
  const createCategory = (
    category: 'goals' | 'assists' | 'minutes' | 'goals_assists',
    label: string,
    getValue: (player: PlayerSeasonStats) => number
  ): LeaguePlayerStatCategory => {
    const filteredPlayers = playerStats
      .filter(player => getValue(player) > 0)
      .sort((a, b) => getValue(b) - getValue(a))
      .map((player, index) => {
        const teamInfo = teamsMap.get(player.team_id || '') || { name: 'Unknown Team' }
        return {
          player_id: player.player_id,
          name: player.name,
          team_id: player.team_id,
          team_name: teamInfo.name,
          team_logo: teamInfo.logo,
          position_id: player.position_id,
          jersey_number: player.jersey_number,
          image_path: player.image_path,
          value: getValue(player),
          appearances: player.appearances || 0,
          rank: index + 1,
        }
      })

    return {
      category,
      label,
      players: filteredPlayers,
    }
  }

  return {
    top_scorers: createCategory('goals', 'Top Goal Scorers', player => player.goals || 0),
    top_assists: createCategory('assists', 'Most Assists', player => player.assists || 0),
    most_minutes: createCategory('minutes', 'Most Minutes Played', player => player.minutes_played || 0),
    top_goals_assists: createCategory('goals_assists', 'Goals + Assists', player => (player.goals || 0) + (player.assists || 0)),
  }
}

// Enhanced function to create team stat categories for tabbed UI  
function createTeamStatCategories(teamsData: any[], seasonId: number): {
  attack: LeagueTeamStatCategory
  defense: LeagueTeamStatCategory
  discipline: LeagueTeamStatCategory
  performance: LeagueTeamStatCategory
} {
  // Extract team statistics for the specific season
  let teamsWithNoStats = 0
  let teamsWithStats = 0
  
  const teamsWithStatsData = teamsData.map(team => {
    
    const teamStats = extractTeamSeasonStats(team.statistics, seasonId)
    if (!teamStats) {
      teamsWithNoStats++
    } else {
      teamsWithStats++
    }
    
    return {
      id: String(team.id || team._id),
      name: team.name || `Team ${team.id}`,
      logo: team.logo_path || team.logo,
      stats: teamStats,
    }
  })
  
  const teamsWithStatsFiltered = teamsWithStatsData

  // Create attack statistics category
  const attackStats = teamsWithStatsFiltered
    .map(team => ({
      team_id: team.id,
      team_name: team.name,
      team_logo: team.logo,
      value: team.stats?.goals_for || 0,
      rank: 0,
      additional_stats: {
        shots: team.stats?.shots || 0,
        shots_on_target: team.stats?.shots_on_target || 0,
        corners: team.stats?.corners || 0,
      },
    }))
    .filter(team => team.value > 0) // Only include teams with goals scored
    .sort((a, b) => b.value - a.value)
    .map((team, index) => ({ ...team, rank: index + 1 }))

  // Create defense statistics category
  const defenseStats = teamsWithStatsFiltered
    .map(team => ({
      team_id: team.id,
      team_name: team.name,
      team_logo: team.logo,
      value: team.stats?.clean_sheets || 0,
      rank: 0,
      additional_stats: {
        goals_against: team.stats?.goals_against || 0,
        saves: team.stats?.saves || 0,
        tackles: team.stats?.tackles || 0,
      },
    }))
    .filter(team => team.value > 0) // Only include teams with clean sheets
    .sort((a, b) => b.value - a.value)
    .map((team, index) => ({ ...team, rank: index + 1 }))

  // Create discipline statistics category (fewest cards is better)
  const disciplineStats = teamsWithStatsFiltered
    .map(team => ({
      team_id: team.id,
      team_name: team.name,
      team_logo: team.logo,
      value: (team.stats?.yellow_cards || 0) + (team.stats?.red_cards || 0) * 2, // Weight red cards more
      rank: 0,
      additional_stats: {
        yellow_cards: team.stats?.yellow_cards || 0,
        red_cards: team.stats?.red_cards || 0,
        fouls: team.stats?.fouls || 0,
      },
    }))
    .sort((a, b) => a.value - b.value) // Ascending order - fewer cards is better
    .map((team, index) => ({ ...team, rank: index + 1 }))

  // Create performance statistics category (based on wins/points)
  const performanceStats = teamsWithStatsFiltered
    .map(team => ({
      team_id: team.id,
      team_name: team.name,
      team_logo: team.logo,
      value: team.stats?.wins || 0,
      rank: 0,
      additional_stats: {
        matches_played: team.stats?.matches_played || 0,
        draws: team.stats?.draws || 0,
        losses: team.stats?.losses || 0,
        points: team.stats?.points || 0,
      },
    }))
    .filter(team => team.value > 0) // Only include teams with wins
    .sort((a, b) => b.value - a.value)
    .map((team, index) => ({ ...team, rank: index + 1 }))

  return {
    attack: {
      category: 'attack',
      label: 'Goals Scored',
      teams: attackStats,
    },
    defense: {
      category: 'defense',
      label: 'Clean Sheets',
      teams: defenseStats,
    },
    discipline: {
      category: 'discipline',
      label: 'Best Disciplinary Record',
      teams: disciplineStats,
    },
    performance: {
      category: 'performance',
      label: 'Most Wins',
      teams: performanceStats,
    },
  }
}

// Helper function to extract team statistics for a specific season
function extractTeamSeasonStats(statistics: any, seasonId: number): any {
  if (!statistics || !Array.isArray(statistics)) {
    return null
  }

  // Find the statistics object for the target season
  const seasonStats = statistics.find(stat => 
    stat && (stat.season_id === seasonId || (stat.season && stat.season.id === seasonId))
  )

  if (!seasonStats || !Array.isArray(seasonStats.details)) {
    return null
  }

  const extractedStats: any = {
    goals_for: 0,
    goals_against: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    matches_played: 0,
    points: 0,
    clean_sheets: 0,
    yellow_cards: 0,
    red_cards: 0,
  }

  // Extract statistics from details array using constants
  for (const detail of seasonStats.details) {
    if (!detail || !detail.type_id || !detail.value) continue

    // Extract the count value (most common format)
    const value = detail.value.all?.count || detail.value.all?.total || 0

    // Use constants for type_id mapping
    switch (detail.type_id) {
      case TeamStatisticTypeIds.GOALS_FOR:
        extractedStats.goals_for = value
        break
      case TeamStatisticTypeIds.GOALS_AGAINST:
        extractedStats.goals_against = value
        break
      case TeamStatisticTypeIds.CLEAN_SHEETS:
        extractedStats.clean_sheets = value
        break
      case TeamStatisticTypeIds.WINS:
        extractedStats.wins = value
        break
      case TeamStatisticTypeIds.DRAWS:
        extractedStats.draws = value
        break
      case TeamStatisticTypeIds.LOSSES:
        extractedStats.losses = value
        break
      case TeamStatisticTypeIds.YELLOW_CARDS:
        extractedStats.yellow_cards = value
        break
      case TeamStatisticTypeIds.RED_CARDS:
        extractedStats.red_cards = value
        break
      // Add more cases as needed using constants
    }
  }

  // Calculate matches played and points
  extractedStats.matches_played = extractedStats.wins + extractedStats.draws + extractedStats.losses
  extractedStats.points = (extractedStats.wins * 3) + extractedStats.draws

  return extractedStats
}

// Optimized helper function for finding player season stats
function findPlayerSeasonStats(statistics: Record<string, any> | any, seasonId: number, leagueId?: number): any {
  if (!statistics) {
    return null
  }

  const statsObj = typeof statistics === 'object' ? statistics : { default: statistics }

  // Method 1: Direct season_id match (prioritize season match, league filtering is often unreliable)
  for (const key in statsObj) {
    const stat = statsObj[key]
    if (stat && typeof stat === 'object') {
      const matchesSeason = stat.season_id === seasonId || (stat.season && stat.season.id === seasonId)
      
      if (matchesSeason) {
        // Check if league filtering is needed and available
        const hasLeagueInfo = stat.league_id !== undefined || (stat.league && stat.league.id !== undefined)
        
        if (leagueId && hasLeagueInfo) {
          const matchesLeague = stat.league_id === leagueId || (stat.league && stat.league.id === leagueId)
          if (matchesLeague) {
            return stat
          }
        } else if (!leagueId || !hasLeagueInfo) {
          // Use season-only match if no league filter requested or no league info available
          return stat
        }
      }
    }
  }

  // Method 2: Look for seasons array
  if (statsObj.seasons && Array.isArray(statsObj.seasons)) {
    const seasonStat = statsObj.seasons.find((s: any) => {
      if (!s) return false
      const matchesSeason = s.id === seasonId || s.season_id === seasonId
      
      if (matchesSeason) {
        if (leagueId) {
          const hasLeagueInfo = s.league_id !== undefined || (s.league && s.league.id !== undefined)
          if (hasLeagueInfo) {
            return s.league_id === leagueId || (s.league && s.league.id === leagueId)
          }
        }
        return true // Return season match if no league filter needed
      }
      return false
    })
    if (seasonStat) {
      return seasonStat
    }
  }

  return null
}

function getPlayerJerseyNumber(player: any): number | null {
  if (player.jersey_number) return player.jersey_number
  if (player.number) return player.number
  return null
}

function extractStatValue(seasonStats: any, field: string): number | null {
  if (!seasonStats) return null
  
  // Direct field access
  if (seasonStats[field] !== undefined) {
    const value = seasonStats[field]
    if (typeof value === 'number') {
      return value
    }
    if (typeof value === 'object' && value !== null) {
      // Handle nested value structures
      if (typeof value.total === 'number') {
        return value.total
      }
      if (typeof value.value === 'number') {
        return value.value
      }
    }
    return Number(value) || 0
  }

  // Look in details array
  if (Array.isArray(seasonStats.details)) {
    for (const detail of seasonStats.details) {
      if (detail && detail[field] !== undefined) {
        const value = detail[field]
        if (typeof value === 'number') {
          return value
        }
        if (typeof value === 'object' && value !== null) {
          if (typeof value.total === 'number') {
            return value.total
          }
          if (typeof value.value === 'number') {
            return value.value
          }
        }
        return Number(value) || 0
      }
    }
  }

  return null
}

// Transform match document to MinimalTeamFixture format
function transformMatchToFixture(match: any): any {
  // Extract team information from participants
  const participants = Array.isArray(match.participants) ? match.participants : []
  const homeTeam = participants.find((p: any) => p.meta?.location === 'home')
  const awayTeam = participants.find((p: any) => p.meta?.location === 'away')

  // Convert starting_at date to timestamp for compatibility
  const startingAtTimestamp = match.starting_at ? Math.floor(new Date(match.starting_at).getTime() / 1000) : null

  return {
    id: match.id,
    starting_at: match.starting_at,
    starting_at_timestamp: startingAtTimestamp,
    league: match.league ? {
      id: match.league.id,
      name: match.league.name,
    } : null,
    home_team: homeTeam ? {
      id: homeTeam.id,
      name: homeTeam.name,
      image_path: homeTeam.image_path || null,
    } : null,
    away_team: awayTeam ? {
      id: awayTeam.id, 
      name: awayTeam.name,
      image_path: awayTeam.image_path || null,
    } : null,
    result_info: match.result_info || null,
    state: match.state || null,
    // Add other fields as needed
  }
}

// Transform match document to MinimalNextMatch format
function transformMatchToNextMatch(match: any): any {
  const participants = Array.isArray(match.participants) ? match.participants : []
  const homeTeam = participants.find((p: any) => p.meta?.location === 'home')
  const awayTeam = participants.find((p: any) => p.meta?.location === 'away')

  return {
    starting_at: match.starting_at,
    league: match.league ? {
      id: match.league.id,
      name: match.league.name,
    } : { id: 0, name: '' },
    home_team: homeTeam ? {
      id: homeTeam.id,
      name: homeTeam.name,
      image_path: homeTeam.image_path || null,
    } : { id: 0, name: '', image_path: null },
    away_team: awayTeam ? {
      id: awayTeam.id,
      name: awayTeam.name,
      image_path: awayTeam.image_path || null,
    } : { id: 0, name: '', image_path: null },
    home_position: null, // Can be enhanced later with league position
    away_position: null,
    home_goals_per_match: null,
    away_goals_per_match: null,
    home_goals_conceded_per_match: null,
    away_goals_conceded_per_match: null,
  }
}

// Transform league table for current season only
function transformLeagueTable(
  rawLeague: { id: number; name: string; standings: Record<string, any> | null; current_season?: any },
  seasonId?: string,
): LeagueStandingsResponse {
  // Determine which season to use
  let targetSeasonId = seasonId || (rawLeague.current_season?.id ? String(rawLeague.current_season.id) : null)
  
  // If no current season, try to use the most recent season from standings
  if (!targetSeasonId && rawLeague.standings) {
    const availableSeasons = Object.keys(rawLeague.standings)
    if (availableSeasons.length > 0) {
      // Sort seasons descending and take the most recent
      targetSeasonId = availableSeasons.sort((a, b) => parseInt(b) - parseInt(a))[0]
    }
  }
  
  if (!targetSeasonId) {
    throw new Error('No current season available for this league and no standings data found')
  }

  // Only process the specific season's standings
  if (!rawLeague.standings || !rawLeague.standings[targetSeasonId]) {
    const availableSeasons = rawLeague.standings ? Object.keys(rawLeague.standings) : []
    throw new Error(`No standings data available for season ${targetSeasonId}. Available seasons: ${availableSeasons.join(', ')}`)
  }

  // Create a temporary object with only the target season for transformation
  const seasonOnlyLeague = {
    ...rawLeague,
    standings: { [targetSeasonId]: rawLeague.standings[targetSeasonId] }
  }

  // Use the team transformer but only for the specific season
  const transformedStandings = transformTeamTable(seasonOnlyLeague as any)
  
  return transformedStandings
}

// Define types for Payload documents
type League = {
  id: string | number
  name: string
  logo?: string
  country?: {
    id: string | number
    name: string
    flag?: string
  }
  current_season?: {
    id: string | number
    name: string
  }
  seasons?: Array<{
    id: string | number
    name: string
    current?: boolean
    start_date?: string
    end_date?: string
    coverage?: {
      fixtures: boolean
      standings: boolean
      players: boolean
      top_scorers: boolean
      predictions: boolean
      odds: boolean
    }
  }>
  standings?: Record<
    string,
    {
      name?: string
      type?: string
      data?: Array<any>
    }
  >
}

type Team = {
  id: string | number
  name: string
  logo?: string
  venue_name?: string
  founded?: number
  leagues?: Array<{ id: string | number }>
}

// Helper function to extract seasons from league data
function extractLeagueSeasons(league: any): Array<{ id: string; name: string }> {
  const seasons: Array<{ id: string; name: string }> = []
  
  // Get seasons from the seasons array if available
  if (league.seasons && Array.isArray(league.seasons)) {
    league.seasons.forEach((season: any) => {
      seasons.push({
        id: String(season.id),
        name: season.name || `Season ${season.id}`
      })
    })
  }
  
  // Also get seasons from standings if not in seasons array
  if (league.standings && typeof league.standings === 'object') {
    const standingSeasons = Object.keys(league.standings)
    standingSeasons.forEach(seasonId => {
      // Check if this season is already in our list
      if (!seasons.find(s => s.id === seasonId)) {
        const standingData = league.standings[seasonId]
        seasons.push({
          id: seasonId,
          name: standingData.name || `Season ${seasonId}`
        })
      }
    })
  }
  
  // Sort seasons by ID descending (most recent first)
  seasons.sort((a, b) => parseInt(b.id) - parseInt(a.id))
  
  return seasons
}

/**
 * Service for fetching league-related data
 * This is a placeholder implementation that would be replaced with actual data fetching logic
 */
export const leagueDataFetcher: LeagueDataFetcher = {
  getOverview: async (leagueId: string, seasonId?: string): Promise<LeagueOverviewResponse> => {
    try {
      const numericId = parseInt(leagueId, 10)
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid league ID format')
      }

      const payload = await getPayload({ config })
      
      // First get the league to determine available seasons
      const leagueResult = await payload.find({
        collection: 'leagues',
        where: {
          id: {
            equals: numericId,
          },
        },
        depth: 1,
      })

      if (!leagueResult.docs.length) {
        throw new Error(`No league found with ID: ${leagueId}`)
      }

      const league = leagueResult.docs[0]
      
      // Determine target season
      let targetSeasonId: number
      
      if (seasonId) {
        // Use the provided season ID
        targetSeasonId = parseInt(seasonId, 10)
        if (isNaN(targetSeasonId)) {
          throw new Error('Invalid season ID format')
        }
        
        // Verify the season exists in standings
        const standingsCheck = await payload.find({
          collection: 'leaguesstandings',
          where: {
            leagueId: {
              equals: numericId,
            },
          },
          limit: 1,
        })

        if (standingsCheck.docs.length > 0 && standingsCheck.docs[0].standings && typeof standingsCheck.docs[0].standings === 'object') {
          const standings = standingsCheck.docs[0].standings as Record<string, any>
          if (!standings[String(targetSeasonId)]) {
            const availableSeasons = Object.keys(standings)
            throw new Error(`Season ${seasonId} not found. Available seasons: ${availableSeasons.join(', ')}`)
          }
        }
      } else {
        // Use current season or most recent
        targetSeasonId = league.current_season?.id ? parseInt(String(league.current_season.id), 10) : null
        
        // If no current season, try to use the most recent season from standings
        if (!targetSeasonId) {
          const standingsForSeasonCheck = await payload.find({
            collection: 'leaguesstandings',
            where: {
              leagueId: {
                equals: numericId,
              },
            },
            limit: 1,
          })

          if (standingsForSeasonCheck.docs.length > 0 && standingsForSeasonCheck.docs[0].standings && typeof standingsForSeasonCheck.docs[0].standings === 'object') {
            const standings = standingsForSeasonCheck.docs[0].standings as Record<string, any>
            const availableSeasons = Object.keys(standings)
            if (availableSeasons.length > 0) {
              targetSeasonId = parseInt(availableSeasons.sort((a, b) => parseInt(b) - parseInt(a))[0])
            }
          }
        }

        if (!targetSeasonId) {
          throw new Error('No season available for this league')
        }
      }

      // Get season name from seasons array or standings - need to get data from new collections
      let seasonName = `Season ${targetSeasonId}`
      
      // First try to get from seasons collection
      const seasonsForName = await payload.find({
        collection: 'leaguesseason',
        where: {
          leagueId: {
            equals: numericId,
          },
        },
        limit: 1,
      })

      if (seasonsForName.docs.length > 0 && seasonsForName.docs[0].seasons && Array.isArray(seasonsForName.docs[0].seasons)) {
        const seasonInfo = seasonsForName.docs[0].seasons.find((s: any) => s.id === targetSeasonId || s.id === String(targetSeasonId))
        if (seasonInfo && seasonInfo.name) {
          seasonName = seasonInfo.name
        }
      } else {
        // Fallback to standings collection
        const standingsForName = await payload.find({
          collection: 'leaguesstandings',
          where: {
            leagueId: {
              equals: numericId,
            },
          },
          limit: 1,
        })

        if (standingsForName.docs.length > 0 && standingsForName.docs[0].standings && standingsForName.docs[0].standings[String(targetSeasonId)]?.name) {
          seasonName = standingsForName.docs[0].standings[String(targetSeasonId)].name
        }
      }
      
      // Fetch data in parallel for performance
      const [standingsData, statsData, matchesData] = await Promise.all([
        // Get standings
        leagueDataFetcher.getStandings(leagueId, String(targetSeasonId)).catch(err => {
          console.error('Error fetching standings:', err)
          return null
        }),
        // Get stats
        leagueDataFetcher.getStats(leagueId, String(targetSeasonId)).catch(err => {
          console.error('Error fetching stats:', err)
          return null
        }),
        // Get matches (both upcoming and recent)
        Promise.all([
          leagueDataFetcher.getMatches(leagueId, 1, 10, String(targetSeasonId), 'upcoming').catch(err => {
            console.error('Error fetching upcoming matches:', err)
            return null
          }),
          leagueDataFetcher.getMatches(leagueId, 1, 10, String(targetSeasonId), 'past').catch(err => {
            console.error('Error fetching past matches:', err)
            return null
          })
        ])
      ])

      const [upcomingMatchesData, recentMatchesData] = matchesData

      // Process standings to get table summary
      let tableSummary = {
        top_teams: [] as any[],
        promotion_teams: [] as any[],
        relegation_teams: [] as any[]
      }

      if (standingsData && standingsData[String(targetSeasonId)]) {
        const seasonStandings = standingsData[String(targetSeasonId)]
        
        if (seasonStandings.standings && Array.isArray(seasonStandings.standings)) {
          // Combine all standings groups to get the full table
          const allTeams: any[] = []
          
          seasonStandings.standings.forEach((standingGroup: any) => {
            if (standingGroup.standings && Array.isArray(standingGroup.standings)) {
              allTeams.push(...standingGroup.standings)
            }
          })
          
          // Sort by position to ensure correct order
          allTeams.sort((a, b) => a.position - b.position)
          
          // Remove duplicates (keep first occurrence)
          const uniqueTeams = allTeams.filter((team, index, self) => 
            index === self.findIndex(t => t.team_id === team.team_id)
          )
          
          // Get top 3 teams
          tableSummary.top_teams = uniqueTeams.slice(0, 3).map((team: any) => ({
            id: String(team.team_id),
            name: team.team_name,
            logo: team.team_logo_path,
            position: team.position,
            points: team.points,
            played: team.played,
            goal_difference: team.goal_difference,
            form: team.form ? team.form.split('').slice(-5) : [],
            qualification_status: team.qualification_status
          }))
          
          // Get teams in promotion positions (usually 2-3, but check qualification status)
          tableSummary.promotion_teams = uniqueTeams
            .filter((team: any) => 
              team.qualification_status?.type?.includes('promotion') || 
              team.qualification_status?.type?.includes('playoff')
            )
            .slice(0, 3)
            .map((team: any) => ({
              id: String(team.team_id),
              name: team.team_name,
              logo: team.team_logo_path,
              position: team.position,
              points: team.points,
              played: team.played,
              goal_difference: team.goal_difference,
              form: team.form ? team.form.split('').slice(-5) : [],
              qualification_status: team.qualification_status
            }))
          
          // Get relegation zone teams (usually bottom 3)
          tableSummary.relegation_teams = uniqueTeams
            .filter((team: any) => 
              team.qualification_status?.type?.includes('relegation')
            )
            .slice(0, 3)
            .map((team: any) => ({
              id: String(team.team_id),
              name: team.team_name,
              logo: team.team_logo_path,
              position: team.position,
              points: team.points,
              played: team.played,
              goal_difference: team.goal_difference,
              form: team.form ? team.form.split('').slice(-5) : [],
              qualification_status: team.qualification_status
            }))
        }
      }

      // Process upcoming matches
      const upcomingMatches = upcomingMatchesData?.docs.slice(0, 5).map((match: any) => ({
        id: match.id,
        starting_at: match.starting_at,
        starting_at_timestamp: match.starting_at_timestamp,
        home_team: match.home_team,
        away_team: match.away_team,
        state: match.state
      })) || []

      // Process recent results
      const recentResults = recentMatchesData?.docs.slice(0, 5).map((match: any) => ({
        id: match.id,
        starting_at: match.starting_at,
        starting_at_timestamp: match.starting_at_timestamp,
        home_team: match.home_team,
        away_team: match.away_team,
        state: match.state,
        final_score: match.result_info || { home: 0, away: 0 }
      })) || []

      // Process stats summary
      let statsSummary = {
        top_scorers: [] as any[],
        top_assists: [] as any[],
        top_rated: [] as any[]
      }

      if (statsData && statsData.player_stats) {
        // Top scorers
        statsSummary.top_scorers = statsData.player_stats.top_scorers.players.slice(0, 5).map(player => ({
          player_id: player.player_id,
          name: player.name,
          team_name: player.team_name || 'Unknown',
          team_logo: player.team_logo,
          image_path: player.image_path,
          value: player.value,
          position: player.position_name || 'Unknown'
        }))

        // Top assists
        statsSummary.top_assists = statsData.player_stats.top_assists.players.slice(0, 5).map(player => ({
          player_id: player.player_id,
          name: player.name,
          team_name: player.team_name || 'Unknown',
          team_logo: player.team_logo,
          image_path: player.image_path,
          value: player.value,
          position: player.position_name || 'Unknown'
        }))

        // For top rated, we'll use goals + assists as a proxy
        statsSummary.top_rated = statsData.player_stats.top_goals_assists.players.slice(0, 5).map(player => ({
          player_id: player.player_id,
          name: player.name,
          team_name: player.team_name || 'Unknown',
          team_logo: player.team_logo,
          image_path: player.image_path,
          value: player.value,
          position: player.position_name || 'Unknown'
        }))
      }

      // Calculate metadata
      let metadata = {
        total_teams: 0,
        total_matches_played: 0,
        total_goals: 0,
        average_goals_per_match: 0
      }

      // Get total teams from standings first (most reliable source)
      if (standingsData && standingsData[String(targetSeasonId)]) {
        const seasonStandings = standingsData[String(targetSeasonId)]
        
        // Some leagues have multiple standings groups (e.g., Scottish Premiership split)
        // We need to count unique teams across all groups
        const uniqueTeams = new Set<number>()
        let totalPlayedByAllTeams = 0
        
        if (seasonStandings.standings && Array.isArray(seasonStandings.standings)) {
          // Iterate through all standings groups
          seasonStandings.standings.forEach((standingGroup: any, index: number) => {
            if (standingGroup.standings && Array.isArray(standingGroup.standings)) {
              
              standingGroup.standings.forEach((team: any) => {
                uniqueTeams.add(team.team_id)
                // Only count played matches from the first occurrence of each team
                if (!Array.from(uniqueTeams).slice(0, -1).includes(team.team_id)) {
                  totalPlayedByAllTeams += team.played || 0
                }
              })
            }
          })
          
          metadata.total_teams = uniqueTeams.size
          metadata.total_matches_played = Math.floor(totalPlayedByAllTeams / 2)
          
        }
      }

      // Get goals data from stats if available
      if (statsData && statsData.overview) {
        // Only use teams_count if we didn't get it from standings
        if (metadata.total_teams === 0) {
          metadata.total_teams = statsData.overview.teams_count || 0
        }
        metadata.total_goals = statsData.overview.total_goals || 0
        
      }

      // If we still don't have team count, try to get it from the teams endpoint
      if (metadata.total_teams === 0) {
        try {
          const teamsData = await leagueDataFetcher.getTeams(leagueId, 1, 1)
          metadata.total_teams = teamsData.pagination.totalItems || 0
        } catch (err) {
          console.error('Error fetching teams count:', err)
        }
      }

      // Calculate average goals per match
      if (metadata.total_matches_played > 0) {
        metadata.average_goals_per_match = Math.round((metadata.total_goals / metadata.total_matches_played) * 100) / 100
      }


      // Get all available seasons for the dropdown - need to get data from new collections
      const seasonsResultOverview = await payload.find({
        collection: 'leaguesseason',
        where: {
          leagueId: {
            equals: numericId,
          },
        },
        limit: 1,
      })

      const standingsResultOverview = await payload.find({
        collection: 'leaguesstandings',
        where: {
          leagueId: {
            equals: numericId,
          },
        },
        limit: 1,
      })

      // Create a mock league object with seasons and standings data
      const mockLeagueOverview = {
        ...league,
        seasons: seasonsResultOverview.docs.length > 0 ? seasonsResultOverview.docs[0].seasons : null,
        standings: standingsResultOverview.docs.length > 0 ? standingsResultOverview.docs[0].standings : null,
      }

      const seasons = extractLeagueSeasons(mockLeagueOverview)

      // Build the response
      const response: LeagueOverviewResponse = {
        id: leagueId,
        name: league.name as string,
        logo: league.logo as string | undefined,
        country: league.country ? {
          id: String(league.country.id),
          name: league.country.name as string,
          flag: league.country.flag as string | undefined
        } : undefined,
        season_id: targetSeasonId,
        season_name: seasonName,
        seasons,
        table_summary: tableSummary,
        upcoming_matches: upcomingMatches,
        recent_results: recentResults,
        stats_summary: statsSummary,
        metadata
      }

      return response
    } catch (error) {
      console.error('Error in getOverview:', {
        leagueId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  },

  getStandings: async (leagueId: string, seasonId?: string): Promise<LeagueStandingsResponse> => {
    try {
      const numericId = parseInt(leagueId, 10)
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid league ID format')
      }

      const payload = await getPayload({ config })
      
      // Get league basic info
      const leagueResult = await payload.find({
        collection: 'leagues',
        where: {
          id: {
            equals: numericId,
          },
        },
        depth: 1,
      })

      if (!leagueResult.docs.length) {
        throw new Error(`No league found with ID: ${leagueId}`)
      }

      const league = leagueResult.docs[0]

      // Get standings data from leaguesstandings collection
      const standingsResult = await payload.find({
        collection: 'leaguesstandings',
        where: {
          leagueId: {
            equals: numericId,
          },
        },
        limit: 1,
      })

      let standings: Record<string, any> | null = null
      if (standingsResult.docs.length > 0) {
        standings = typeof standingsResult.docs[0].standings === 'object' 
          ? (standingsResult.docs[0].standings as Record<string, any>) 
          : null
      }

      // Create a properly structured raw league object
      const rawLeague = {
        id: league.id as number,
        name: league.name as string,
        standings,
        current_season: league.current_season || null,
      }

      // Transform the standings using the same logic as team standings
      const transformedStandings = transformLeagueTable(rawLeague, seasonId)

      return transformedStandings
    } catch (error) {
      console.error('Error in getStandings:', {
        leagueId,
        seasonId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  },

  getTeams: async (
    leagueId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<LeagueTeamsResponse> => {
    try {
      const payload = await getPayload({ config })

      // First get the league to ensure it exists
      const leagueResult = await payload.find({
        collection: 'leagues',
        where: {
          id: {
            equals: parseInt(leagueId, 10),
          },
        },
      })

      if (!leagueResult.docs.length) {
        throw new Error(`No league found with ID: ${leagueId}`)
      }

      const league = leagueResult.docs[0]
      const leagueIdNum = parseInt(leagueId, 10)

      // Use direct MongoDB query since Payload queries don't work properly on JSON arrays
      // The seasons/activeseasons fields are stored as arrays of objects with league_id property
      const mongoTeams = await payload.db.collections.teams
        .find({
          $or: [
            { seasons: { $elemMatch: { league_id: leagueIdNum } } },
            { activeseasons: { $elemMatch: { league_id: leagueIdNum } } },
            // For season_map, it might store season IDs, not league IDs, so this might not match
            { season_map: { $elemMatch: { id: leagueIdNum } } }
          ]
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()

      // Count total for pagination (separate query)
      const totalTeams = await payload.db.collections.teams
        .countDocuments({
          $or: [
            { seasons: { $elemMatch: { league_id: leagueIdNum } } },
            { activeseasons: { $elemMatch: { league_id: leagueIdNum } } },
            { season_map: { $elemMatch: { id: leagueIdNum } } }
          ]
        })

      // Transform the MongoDB results to match the expected format
      // The MongoDB _id field needs to be mapped to 'id'
      const teamsResult = {
        docs: mongoTeams.map((team: any) => ({
          ...team,
          id: team._id || team.id, // Use _id from MongoDB or fallback to id field
        })),
        page: page,
        limit: limit,
        totalDocs: totalTeams,
        totalPages: Math.ceil(totalTeams / limit),
      }

      // Map the results
      const teams = teamsResult.docs.map((team) => ({
        id: String(team.id),
        name: team.name as string,
        logo: team.logo as string | undefined,
        venue_name: team.venue_name as string | undefined,
        founded: team.founded as number | undefined,
      }))

      return {
        id: String(league.id),
        name: league.name as string,
        teams,
        pagination: {
          page: teamsResult.page || page,
          limit: teamsResult.limit || limit,
          totalItems: teamsResult.totalDocs || 0,
          totalPages: teamsResult.totalPages || 0,
        },
      }
    } catch (error) {
      console.error('Error in getTeams:', error)
      return {
        id: leagueId,
        name: `League ${leagueId}`,
        teams: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
        },
      }
    }
  },

  getMatches: async (
    leagueId: string,
    page: number = 1,
    limit: number = 50,
    seasonId?: string,
    type: 'all' | 'past' | 'upcoming' | 'auto' = 'auto',
    includeNextMatch: boolean = false,
  ): Promise<LeagueMatchesResponse> => {
    try {
      const numericId = parseInt(leagueId, 10)
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid league ID format')
      }

      const payload = await getPayload({ config })
      
      // Validate pagination parameters
      const validatedPage = Math.max(1, page)
      const validatedLimit = Math.max(1, Math.min(100, limit)) // Cap at 100

      // Build the query for matches in this league
      const where: any = {
        league_id: {
          equals: numericId,
        },
      }

      // Add season filter if provided
      if (seasonId) {
        where.season_id = {
          equals: parseInt(seasonId, 10),
        }
      }

      // Add time-based filtering based on type
      const now = new Date() // Current date
      if (type === 'past') {
        where.starting_at = {
          less_than: now,
        }
      } else if (type === 'upcoming') {
        where.starting_at = {
          greater_than_equal: now,
        }
      }
      // 'all' and 'auto' don't add time filtering

      // Fetch matches with pagination
      // Always sort by most recent first (descending), except for upcoming which should be soonest first
      const sortOrder = type === 'upcoming' ? 'starting_at' : '-starting_at'
      
      const matchesResult = await payload.find({
        collection: 'matches',
        where,
        page: validatedPage,
        limit: validatedLimit,
        sort: sortOrder,
      })

      // Transform matches to MinimalTeamFixture format
      const docs = matchesResult.docs.map(transformMatchToFixture)

      // Handle auto type logic - try upcoming first, then past if no upcoming matches
      let finalDocs = docs
      let actualType = type
      let finalPagination = {
        page: matchesResult.page || validatedPage,
        limit: matchesResult.limit || validatedLimit,
        total: matchesResult.totalDocs || 0,
        totalPages: matchesResult.totalPages || 0,
      }

      if (type === 'auto') {
        // First try upcoming matches
        const upcomingResult = await payload.find({
          collection: 'matches',
          where: {
            ...where,
            starting_at: { greater_than_equal: now },
          },
          page: validatedPage,
          limit: validatedLimit,
          sort: 'starting_at', // Soonest upcoming first
        })

        if (upcomingResult.docs.length > 0) {
          finalDocs = upcomingResult.docs.map(transformMatchToFixture)
          actualType = 'upcoming'
          finalPagination = {
            page: upcomingResult.page || validatedPage,
            limit: upcomingResult.limit || validatedLimit,
            total: upcomingResult.totalDocs || 0,
            totalPages: upcomingResult.totalPages || 0,
          }
        } else {
          // Fall back to past matches (most recent first)
          const pastResult = await payload.find({
            collection: 'matches',
            where: {
              ...where,
              starting_at: { less_than: now },
            },
            page: validatedPage,
            limit: validatedLimit,
            sort: '-starting_at', // Most recent past first
          })
          finalDocs = pastResult.docs.map(transformMatchToFixture)
          actualType = 'past'
          finalPagination = {
            page: pastResult.page || validatedPage,
            limit: pastResult.limit || validatedLimit,
            total: pastResult.totalDocs || 0,
            totalPages: pastResult.totalPages || 0,
          }
        }
      }

      // Calculate next match if requested
      let nextMatch: any = null
      if (includeNextMatch) {
        const nextMatchResult = await payload.find({
          collection: 'matches',
          where: {
            league_id: { equals: numericId },
            starting_at: { greater_than_equal: now },
          },
          limit: 1,
          sort: 'starting_at',
        })

        if (nextMatchResult.docs.length > 0) {
          nextMatch = transformMatchToNextMatch(nextMatchResult.docs[0])
        }
      }

      // Build temporal navigation URLs
      const baseUrl = `/api/v1/league/${leagueId}/matches`
      const navigationUrls = buildTemporalNavigationUrls(baseUrl, finalPagination.page, finalPagination.totalPages, {
        limit: finalPagination.limit,
        type: actualType,
        season_id: seasonId || undefined,
        includeNextMatch: includeNextMatch ? 'true' : undefined,
      }, actualType)

      return {
        docs: finalDocs,
        meta: {
          pagination: {
            page: finalPagination.page,
            limit: finalPagination.limit,
            total: finalPagination.total,
            totalPages: finalPagination.totalPages,
            type: actualType,
            // Standard pagination
            hasMorePages: finalPagination.page < finalPagination.totalPages,
            hasPreviousPages: finalPagination.page > 1,
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
    } catch (error) {
      console.error('Error in getMatches:', {
        leagueId,
        page,
        limit,
        seasonId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  },

  getStats: async (leagueId: string, seasonId?: string): Promise<LeagueStatsResponse> => {
    try {
      const numericId = parseInt(leagueId, 10)
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid league ID format')
      }

      const payload = await getPayload({ config })

      // First get the league to determine the current season if not provided
      const leagueResult = await payload.find({
        collection: 'leagues',
        where: {
          id: {
            equals: numericId,
          },
        },
        depth: 1,
      })

      if (!leagueResult.docs.length) {
        throw new Error(`No league found with ID: ${leagueId}`)
      }

      const league = leagueResult.docs[0]
      
      // Determine target season (provided or current season)
      let targetSeasonId = seasonId ? parseInt(seasonId, 10) : null
      if (!targetSeasonId && league.current_season?.id) {
        targetSeasonId = parseInt(String(league.current_season.id), 10)
      }

      // If no current season, try to use the most recent season from standings
      if (!targetSeasonId) {
        // Get standings data from leaguesstandings collection
        const standingsResult = await payload.find({
          collection: 'leaguesstandings',
          where: {
            leagueId: {
              equals: numericId,
            },
          },
          limit: 1,
        })

        if (standingsResult.docs.length > 0 && standingsResult.docs[0].standings && typeof standingsResult.docs[0].standings === 'object') {
          const availableSeasons = Object.keys(standingsResult.docs[0].standings as Record<string, any>)
          if (availableSeasons.length > 0) {
            // Sort seasons descending and take the most recent
            targetSeasonId = parseInt(availableSeasons.sort((a, b) => parseInt(b) - parseInt(a))[0])
          }
        }
      }

      if (!targetSeasonId) {
        throw new Error('No season specified and no current season available for this league')
      }

      // Find all teams in this league using the same MongoDB query approach as league teams endpoint
      const mongoTeams = await payload.db.collections.teams
        .find({
          $or: [
            { seasons: { $elemMatch: { league_id: numericId } } },
            { activeseasons: { $elemMatch: { league_id: numericId } } },
            { season_map: { $elemMatch: { id: numericId } } }
          ]
        })
        .limit(100) // Should be enough for most leagues
        .lean()
        .exec()

      // Transform the MongoDB results to match the expected format
      const teamsResult = {
        docs: mongoTeams.map((team: any) => ({
          ...team,
          id: team._id || team.id, // Use _id from MongoDB or fallback to id field
        })),
      }

      if (teamsResult.docs.length === 0) {
        throw new Error(`No teams found for league ${leagueId}`)
      }

      // Collect all player IDs from all teams
      const allPlayerIds = new Set<number>()
      
      teamsResult.docs.forEach((team: any) => {
        if (Array.isArray(team.players)) {
          team.players.forEach((p: any) => {
            // Extract player ID using the same logic as team stats
            if (typeof p.player_id === 'number') {
              allPlayerIds.add(p.player_id)
            }
            if (typeof p.id === 'number') {
              allPlayerIds.add(p.id)
            }
            if (p.player && typeof p.player.id === 'number') {
              allPlayerIds.add(p.player.id)
            }
          })
        }
      })

      if (allPlayerIds.size === 0) {
        throw new Error(`No players found for teams in league ${leagueId}`)
      }

      // Fetch all players with their statistics
      const playersResult = await payload.find({
        collection: 'players',
        where: {
          id: {
            in: Array.from(allPlayerIds),
          },
        },
        limit: Math.max(500, allPlayerIds.size), // Ensure we get all players
        pagination: false,
      })

      // Process player statistics for the target season AND league to avoid cross-competition contamination
      const playerStats = processLeaguePlayerStats(playersResult.docs, targetSeasonId, numericId)

      // Calculate aggregated league statistics
      const leagueAggregatedStats = calculateLeagueAggregatedStats(playerStats)

      // Create teams map for player stat categories
      const teamsMap = new Map<string, { name: string; logo?: string }>()
      teamsResult.docs.forEach(team => {
        teamsMap.set(String(team.id || team._id), {
          name: team.name || `Team ${team.id}`,
          logo: team.logo,
        })
      })

      // Add team_id to player stats by finding which team each player belongs to
      const enhancedPlayerStats = playerStats.map(player => {
        // Find the team this player belongs to
        const playerTeam = teamsResult.docs.find(team => {
          if (Array.isArray(team.players)) {
            return team.players.some((p: any) => {
              return (
                (typeof p.player_id === 'number' && p.player_id === parseInt(player.player_id)) ||
                (typeof p.id === 'number' && p.id === parseInt(player.player_id)) ||
                (p.player && typeof p.player.id === 'number' && p.player.id === parseInt(player.player_id))
              )
            })
          }
          return false
        })

        return {
          ...player,
          team_id: playerTeam ? String(playerTeam.id || playerTeam._id) : undefined,
        }
      })

      // Create enhanced player stat categories for tabbed UI
      const playerStatCategories = createPlayerStatCategories(enhancedPlayerStats, teamsMap)

      // Create team stat categories for tabbed UI
      const teamStatCategories = createTeamStatCategories(teamsResult.docs, targetSeasonId)

      // Calculate top player stats using the same utility as team stats (for backward compatibility)
      const topStats = calculateTopPlayerStats(playerStats, {
        maxPlayersPerCategory: 10, // More players for league-wide stats
        verbose: false,
      })

      // Determine season name
      const seasonName = league.current_season?.name || `Season ${targetSeasonId}`

      // Get all available seasons for the dropdown - need to get data from new collections
      const seasonsResult = await payload.find({
        collection: 'leaguesseason',
        where: {
          leagueId: {
            equals: numericId,
          },
        },
        limit: 1,
      })

      const standingsResultForSeasons = await payload.find({
        collection: 'leaguesstandings',
        where: {
          leagueId: {
            equals: numericId,
          },
        },
        limit: 1,
      })

      // Create a mock league object with seasons and standings data
      const mockLeagueForSeasons = {
        ...league,
        seasons: seasonsResult.docs.length > 0 ? seasonsResult.docs[0].seasons : null,
        standings: standingsResultForSeasons.docs.length > 0 ? standingsResultForSeasons.docs[0].standings : null,
      }

      const seasons = extractLeagueSeasons(mockLeagueForSeasons)

      const response = {
        id: leagueId,
        name: league.name as string,
        season_id: targetSeasonId,
        season_name: seasonName,
        seasons,
        overview: {
          teams_count: teamsResult.docs.length,
          total_players: enhancedPlayerStats.length,
          total_goals: leagueAggregatedStats.total_goals,
          total_assists: leagueAggregatedStats.total_assists,
          total_yellow_cards: leagueAggregatedStats.total_yellow_cards,
          total_red_cards: leagueAggregatedStats.total_red_cards,
          total_appearances: leagueAggregatedStats.total_appearances,
          total_minutes_played: leagueAggregatedStats.total_minutes_played,
          average_goals_per_player: leagueAggregatedStats.average_goals_per_player,
          average_assists_per_player: leagueAggregatedStats.average_assists_per_player,
        },
        player_stats: playerStatCategories,
        team_stats: teamStatCategories,
        // Legacy fields for backward compatibility
        top_stats: topStats,
        legacy_player_stats: enhancedPlayerStats.slice(0, 50), // Limit to top 50 for performance
      }
      
      return response
    } catch (error) {
      console.error('Error in getStats:', {
        leagueId,
        seasonId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  },

  getSeasons: async (leagueId: string): Promise<LeagueSeasonsResponse> => {
    try {
      const numericId = parseInt(leagueId, 10)
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid league ID format')
      }

      const payload = await getPayload({ config })
      
      // Get league basic info
      const leagueResult = await payload.find({
        collection: 'leagues',
        where: {
          id: {
            equals: numericId,
          },
        },
        depth: 1,
      })

      if (!leagueResult.docs.length) {
        throw new Error(`No league found with ID: ${leagueId}`)
      }

      const league = leagueResult.docs[0]

      // Get seasons data from leaguesseason collection
      const seasonsResult = await payload.find({
        collection: 'leaguesseason',
        where: {
          leagueId: {
            equals: numericId,
          },
        },
        limit: 1,
      })

      // Get standings data to extract seasons (for fallback)
      const standingsResult = await payload.find({
        collection: 'leaguesstandings',
        where: {
          leagueId: {
            equals: numericId,
          },
        },
        limit: 1,
      })

      // Create a mock league object with seasons and standings data
      const mockLeague = {
        ...league,
        seasons: seasonsResult.docs.length > 0 ? seasonsResult.docs[0].seasons : null,
        standings: standingsResult.docs.length > 0 ? standingsResult.docs[0].standings : null,
      }
      
      // Get simplified seasons for the dropdown
      const simplifiedSeasons = extractLeagueSeasons(mockLeague)
      
      // Convert to full LeagueSeason format with additional details
      const seasons: LeagueSeason[] = simplifiedSeasons.map(simpleSeason => {
        // Find full season data if available
        const fullSeasonData = mockLeague.seasons?.find?.((s: any) => String(s.id) === simpleSeason.id)
        
        return {
          id: simpleSeason.id,
          name: simpleSeason.name,
          start_date: fullSeasonData?.start_date,
          end_date: fullSeasonData?.end_date,
          current: simpleSeason.id === String(league.current_season?.id),
          coverage: fullSeasonData?.coverage || {
            fixtures: true,
            standings: true,
            players: true,
            top_scorers: true,
            predictions: false,
            odds: false,
          }
        }
      })
      
      return {
        id: leagueId,
        name: league.name as string,
        seasons
      }
    } catch (error) {
      console.error('Error in getSeasons:', {
        leagueId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  },
}

/**
 * Service for fetching list of leagues
 */
export const leagueListDataFetcher: LeagueListDataFetcher = {
  getLeagues: async (options: {
    page: number
    limit: number
    countryId?: string
    search?: string
    season?: string
  }): Promise<LeaguesListResponse> => {
    const { page, limit, countryId, search, season } = options
    try {
      const payload = await getPayload({ config })

      const where: Record<string, any> = {}

      // Add country filter if provided
      if (countryId) {
        where.country_id = {
          equals: parseInt(countryId, 10),
        }
      }

      // Add search filter if provided
      if (search) {
        where.name = {
          contains: search,
        }
      }

      // Get the leagues from database
      const result = await payload.find({
        collection: 'leagues',
        where,
        page,
        limit,
      })

      // Map the results to match the expected LeaguesListResponse format
      const leagues = result.docs.map((league) => {
        // Extract current season if available
        let currentSeason = undefined
        if (league.current_season) {
          currentSeason = {
            id: String(league.current_season.id),
            name: league.current_season.name as string,
          }
        }

        // Create the league object
        return {
          id: String(league.id),
          name: league.name as string,
          logo: league.logo as string | undefined,
          country: league.country
            ? {
                id: String(league.country.id),
                name: league.country.name as string,
                flag: league.country.flag as string | undefined,
              }
            : undefined,
          current_season: currentSeason,
        }
      })

      return {
        data: leagues,
        meta: {
          pagination: {
            page: result.page || page,
            limit: result.limit || limit,
            totalItems: result.totalDocs || 0,
            totalPages: result.totalPages || 0,
          },
        },
      }
    } catch (error) {
      console.error('Error fetching leagues:', error)
      return {
        data: [],
        meta: {
          pagination: {
            page,
            limit,
            totalItems: 0,
            totalPages: 0,
          },
        },
      }
    }
  },
}
