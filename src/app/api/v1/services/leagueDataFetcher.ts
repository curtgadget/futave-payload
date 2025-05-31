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
} from '../types/league'

// Import the team transformer since leagues use the same structure
import { transformTeamTable } from '../transformers/teamTransformers'

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
      console.log(`No current season set for league ${rawLeague.id}, using most recent season: ${targetSeasonId}`)
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

/**
 * Service for fetching league-related data
 * This is a placeholder implementation that would be replaced with actual data fetching logic
 */
export const leagueDataFetcher: LeagueDataFetcher = {
  getOverview: async (leagueId: string): Promise<LeagueOverviewResponse> => {
    console.log(`Fetching overview for league ${leagueId}`)
    // In a real implementation, this would fetch data from a database or external API
    return {
      id: leagueId,
      name: `League ${leagueId}`,
      logo: `https://example.com/logos/league-${leagueId}.png`,
      country: {
        id: '1',
        name: 'England',
        flag: 'https://example.com/flags/england.png',
      },
      current_season: {
        id: '2023',
        name: '2023/2024',
      },
      seasons: [
        {
          id: '2023',
          name: '2023/2024',
          current: true,
        },
        {
          id: '2022',
          name: '2022/2023',
          current: false,
        },
      ],
    }
  },

  getStandings: async (leagueId: string, seasonId?: string): Promise<LeagueStandingsResponse> => {
    console.log(`Fetching standings for league ${leagueId}, season ${seasonId || 'current'}`)
    
    try {
      const numericId = parseInt(leagueId, 10)
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid league ID format')
      }

      const payload = await getPayload({ config })
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

      // Create a properly structured raw league object
      const rawLeague = {
        id: league.id as number,
        name: league.name as string,
        standings:
          typeof league.standings === 'object' ? (league.standings as Record<string, any>) : null,
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
    console.log(`Fetching teams for league ${leagueId}, page ${page}, limit ${limit}`)

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

      // Now fetch teams associated with this league
      const teamsResult = await payload.find({
        collection: 'teams',
        where: {
          or: [
            // Look for league ID in the seasons field
            {
              seasons: {
                like: `%${leagueIdNum}%`,
              },
            },
            // Look for league ID in the activeseasons field
            {
              activeseasons: {
                like: `%${leagueIdNum}%`,
              },
            },
            // Look for league ID in the season_map field
            {
              season_map: {
                like: `%"id":"${leagueIdNum}"%`,
              },
            },
          ],
        },
        page,
        limit,
      })

      console.log(`Found ${teamsResult.docs.length} teams for league ${leagueId}`)

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
  ): Promise<LeagueMatchesResponse> => {
    console.log(`Fetching matches for league ${leagueId}, page ${page}, limit ${limit}, season ${seasonId || 'current'}`)
    
    // TODO: Implement real match fetching from database
    // This is a placeholder implementation
    return {
      id: leagueId,
      name: `League ${leagueId}`,
      matches: [], // Empty for now - will be implemented later
      pagination: {
        page,
        limit,
        totalItems: 0,
        totalPages: 0,
      },
    }
  },

  getStats: async (leagueId: string, seasonId?: string): Promise<LeagueStatsResponse> => {
    console.log(`Fetching stats for league ${leagueId}, season ${seasonId || 'current'}`)
    
    // TODO: Implement real stats calculation from database
    // This is a placeholder implementation with sample data
    return {
      id: leagueId,
      name: `League ${leagueId}`,
      stats: {
        teams_count: 20,
        matches_played: 380,
        goals_scored: 1024,
        goals_conceded: 1024,
        yellow_cards: 1567,
        red_cards: 89,
        top_scorer: {
          player_id: 12345,
          player_name: 'Sample Player',
          goals: 28,
        },
        top_assists: {
          player_id: 54321,
          player_name: 'Another Player',
          assists: 18,
        },
      },
    }
  },

  getSeasons: async (leagueId: string): Promise<LeagueSeasonsResponse> => {
    console.log(`Fetching seasons for league ${leagueId}`)
    // In a real implementation, this would fetch data from a database or external API
    return {
      id: leagueId,
      name: `League ${leagueId}`,
      seasons: [
        {
          id: '2023',
          name: '2023/2024',
          start_date: '2023-08-11',
          end_date: '2024-05-19',
          current: true,
          coverage: {
            fixtures: true,
            standings: true,
            players: true,
            top_scorers: true,
            predictions: true,
            odds: true,
          },
        },
        {
          id: '2022',
          name: '2022/2023',
          start_date: '2022-08-05',
          end_date: '2023-05-28',
          current: false,
          coverage: {
            fixtures: true,
            standings: true,
            players: true,
            top_scorers: true,
            predictions: false,
            odds: false,
          },
        },
        // More seasons would be included in a real implementation
      ],
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
    console.log('Fetching leagues with options:', { page, limit, countryId, search, season })

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
