import config from '@/payload.config'
import { getPayload } from 'payload'

import type {
  LeagueDataFetcher,
  LeagueOverviewResponse,
  LeagueStandingsResponse,
  LeagueTeamsResponse,
  LeagueSeasonsResponse,
  LeagueListDataFetcher,
  LeaguesListResponse,
  StandingTable,
  StandingTableRow,
  StandingsData,
} from '../types/league'

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
    const currentSeasonId = seasonId || '2023'

    // Create sample standing rows for demonstration
    const standingRows: StandingTableRow[] = [
      {
        position: 1,
        team_id: 1,
        team_name: 'Team A',
        team_logo_path: 'https://example.com/logos/team-1.png',
        points: 30,
        played: 10,
        won: 10,
        draw: 0,
        lost: 0,
        goals_for: 30,
        goals_against: 5,
        goal_difference: 25,
        form: 'WWWWW',
        qualification_status: {
          type: 'champions_league',
          name: 'Champions League',
          color: '#0000FF',
        },
      },
      {
        position: 2,
        team_id: 2,
        team_name: 'Team B',
        team_logo_path: 'https://example.com/logos/team-2.png',
        points: 25,
        played: 10,
        won: 8,
        draw: 1,
        lost: 1,
        goals_for: 20,
        goals_against: 8,
        goal_difference: 12,
        form: 'WDWWW',
      },
    ]

    // Create a standing table with the rows
    const standingTable: StandingTable = {
      id: 1,
      name: 'Regular Season',
      type: 'regular',
      standings: standingRows,
    }

    // In a real implementation, this would fetch data from a database or external API
    return {
      id: leagueId,
      name: `League ${leagueId}`,
      season_id: currentSeasonId,
      standings: {
        id: 1,
        name: 'Regular Season',
        type: 'regular',
        league_id: parseInt(leagueId),
        season_id: parseInt(currentSeasonId),
        stage_id: null,
        stage_name: null,
        standings: [standingTable],
      },
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

      // Now fetch teams associated with this league
      const teamsResult = await payload.find({
        collection: 'teams',
        page,
        limit,
      })

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
