/**
 * API Testing Framework for v1 endpoints
 * Provides utilities for testing Next.js API routes with Payload CMS
 */

import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import type { PayloadRequest } from 'payload'
import type { APIRouteV1 } from '../index'

// Create mock functions with any type to avoid strict typing issues
const createMockFn = () => jest.fn() as any

// Mock Payload CMS and dependencies  
export const mockPayload = {
  find: createMockFn(),
  create: createMockFn(),
  update: createMockFn(),
  delete: createMockFn(),
  findByID: createMockFn(),
}

// Mock team data fetcher
export const mockTeamDataFetcher = {
  getTable: createMockFn(),
  getFixtures: createMockFn(),
  getSquad: createMockFn(),
  getStats: createMockFn(),
}

// Mock league data fetcher
export const mockLeagueDataFetcher = {
  getOverview: createMockFn(),
  getStandings: createMockFn(),
  getTeams: createMockFn(),
  getMatches: createMockFn(),
  getStats: createMockFn(),
  getSeasons: createMockFn(),
}

// Mock league list data fetcher
export const mockLeagueListDataFetcher = {
  getLeagues: createMockFn(),
}

// Mock auth middleware
export const mockAuthMiddleware = createMockFn()

// Setup mocks before importing modules
jest.mock('payload', () => ({
  getPayload: createMockFn().mockResolvedValue(mockPayload),
}))

jest.mock('@/payload.config', () => ({}))

jest.mock('../services/teamDataFetcher', () => ({
  teamDataFetcher: mockTeamDataFetcher,
}))

jest.mock('../services/leagueDataFetcher', () => ({
  leagueDataFetcher: mockLeagueDataFetcher,
  leagueListDataFetcher: mockLeagueListDataFetcher,
}))

jest.mock('@/utilities/auth', () => ({
  createAuthMiddleware: createMockFn().mockReturnValue(mockAuthMiddleware),
}))

/**
 * Create a mock PayloadRequest for testing
 */
export function createMockRequest(options: {
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: any
} = {}): PayloadRequest {
  const { url = 'http://localhost:3000/api/v1/test', method = 'GET', headers = {}, body } = options

  return {
    url,
    method: method.toUpperCase(),
    headers: new Headers(headers),
    body,
    json: createMockFn().mockResolvedValue(body),
    text: createMockFn().mockResolvedValue(body ? JSON.stringify(body) : ''),
    payload: mockPayload,
    user: null,
    locale: 'en',
    fallbackLocale: 'en',
    t: createMockFn().mockImplementation((key: string) => key),
    i18n: {},
    context: {},
    responseType: 'json',
    payloadAPI: 'REST',
    query: {},
  } as any
}

/**
 * Test helper for API endpoint responses
 */
export class APIResponse {
  constructor(
    public status: number,
    public data: any,
    public headers: Headers = new Headers()
  ) {}

  static async fromResponse(response: Response): Promise<APIResponse> {
    const data = await response.json()
    return new APIResponse(response.status, data, response.headers)
  }

  // Helper methods for common assertions
  expectStatus(expectedStatus: number) {
    expect(this.status).toBe(expectedStatus)
    return this
  }

  expectError(message?: string) {
    expect(this.status).toBeGreaterThanOrEqual(400)
    expect(this.data).toHaveProperty('error')
    if (message) {
      expect(this.data.error).toContain(message)
    }
    return this
  }

  expectSuccess() {
    expect(this.status).toBeLessThan(400)
    return this
  }

  expectData(expectedData: any) {
    expect(this.data).toEqual(expectedData)
    return this
  }

  expectToHaveProperty(property: string) {
    expect(this.data).toHaveProperty(property)
    return this
  }

  expectArrayLength(length: number) {
    expect(Array.isArray(this.data)).toBe(true)
    expect(this.data).toHaveLength(length)
    return this
  }
}

/**
 * Execute an API endpoint handler and return formatted response
 */
export async function executeEndpoint(
  route: APIRouteV1,
  request: PayloadRequest
): Promise<APIResponse> {
  const response = await route.handler(request)
  return APIResponse.fromResponse(response)
}

/**
 * Create test request for team endpoints
 */
export function createTeamRequest(teamId: string, resource: string, options: {
  queryParams?: Record<string, string>
  method?: string
  headers?: Record<string, string>
} = {}): PayloadRequest {
  const { queryParams = {}, method = 'GET', headers = {} } = options
  
  const url = new URL(`http://localhost:3000/api/v1/team/${teamId}/${resource}`)
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return createMockRequest({
    url: url.toString(),
    method,
    headers,
  })
}

/**
 * Create test request for league endpoints
 */
export function createLeagueRequest(leagueId: string, resource?: string, options: {
  queryParams?: Record<string, string>
  method?: string
  headers?: Record<string, string>
} = {}): PayloadRequest {
  const { queryParams = {}, method = 'GET', headers = {} } = options
  
  let basePath: string
  let finalQueryParams = { ...queryParams }
  
  if (resource) {
    // For league resource endpoints: league/{id}/{resource}
    // If leagueId is empty, we'll create an invalid path to test error handling
    basePath = leagueId === '' ? `league//${resource}` : `league/${leagueId}/${resource}`
  } else {
    // For league list endpoint: league
    basePath = 'league'
    // For league list endpoint, add leagueId as query param if provided and not empty
    if (leagueId !== '') {
      finalQueryParams.id = leagueId
    }
  }
  
  const url = new URL(`http://localhost:3000/api/v1/${basePath}`)
  
  Object.entries(finalQueryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return createMockRequest({
    url: url.toString(),
    method,
    headers,
  })
}

/**
 * Setup and teardown helpers
 */
export const apiTestSetup = {
  beforeEach: () => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Suppress console.error during tests to avoid cluttering test output
    // This prevents expected error logs from endpoints during error testing scenarios
    jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Reset mock implementations to default behavior
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockTeamDataFetcher.getTable.mockResolvedValue({})
    mockTeamDataFetcher.getFixtures.mockResolvedValue({ docs: [], meta: { pagination: {} }, nextMatch: null })
    mockTeamDataFetcher.getSquad.mockResolvedValue({ players: {}, coaches: [] })
    mockTeamDataFetcher.getStats.mockResolvedValue({ player_stats: [], team_stats: {}, top_stats: [] })
    
    // Reset league data fetcher mocks
    mockLeagueDataFetcher.getOverview.mockResolvedValue({
      id: '1',
      name: 'Test League',
      season_id: 1,
      season_name: 'Test Season',
      seasons: [],
      table_summary: { top_teams: [], promotion_teams: [], relegation_teams: [] },
      upcoming_matches: [],
      recent_results: [],
      stats_summary: { top_scorers: [], top_assists: [], top_rated: [] },
      metadata: { total_teams: 0, total_matches_played: 0, total_goals: 0, average_goals_per_match: 0 }
    })
    mockLeagueDataFetcher.getStandings.mockResolvedValue({})
    mockLeagueDataFetcher.getTeams.mockResolvedValue({ id: '1', name: 'Test League', teams: [], pagination: { page: 1, limit: 50, totalItems: 0, totalPages: 0 } })
    mockLeagueDataFetcher.getMatches.mockResolvedValue({ docs: [], meta: { pagination: {} }, nextMatch: null })
    mockLeagueDataFetcher.getStats.mockResolvedValue({ id: '1', name: 'Test League', season_id: 1, season_name: 'Test Season', seasons: [], overview: {}, player_stats: {}, team_stats: {}, top_stats: [], legacy_player_stats: [] })
    mockLeagueDataFetcher.getSeasons.mockResolvedValue({ id: '1', name: 'Test League', seasons: [] })
    
    mockLeagueListDataFetcher.getLeagues.mockResolvedValue({ data: [], meta: { pagination: { page: 1, limit: 50, totalItems: 0, totalPages: 0 } } })
    
    mockAuthMiddleware.mockResolvedValue(null) // No auth error by default
  },

  afterEach: () => {
    jest.clearAllMocks()
    // Restore console.error
    ;(console.error as jest.Mock).mockRestore?.()
  },
}

/**
 * Assertion helpers for league endpoint responses
 */
export const leagueEndpointAssertions = {
  /**
   * Assert league overview response structure
   */
  assertOverviewResponse: (response: APIResponse) => {
    const expectedProperties = [
      'id', 'name', 'season_id', 'season_name', 'seasons',
      'table_summary', 'upcoming_matches', 'recent_results', 'stats_summary', 'metadata'
    ]
    
    expectedProperties.forEach(prop => {
      response.expectToHaveProperty(prop)
    })

    // Assert table_summary structure
    expect(response.data.table_summary).toHaveProperty('top_teams')
    expect(response.data.table_summary).toHaveProperty('promotion_teams')
    expect(response.data.table_summary).toHaveProperty('relegation_teams')
    
    // Assert arrays
    expect(Array.isArray(response.data.seasons)).toBe(true)
    expect(Array.isArray(response.data.upcoming_matches)).toBe(true)
    expect(Array.isArray(response.data.recent_results)).toBe(true)

    return response
  },

  /**
   * Assert league standings response structure
   */
  assertStandingsResponse: (response: APIResponse) => {
    expect(typeof response.data).toBe('object')
    
    // Should be a record of season IDs to standings data
    Object.values(response.data).forEach((seasonData: any) => {
      expect(seasonData).toHaveProperty('id')
      expect(seasonData).toHaveProperty('name')
      expect(seasonData).toHaveProperty('standings')
      expect(Array.isArray(seasonData.standings)).toBe(true)
    })

    return response
  },

  /**
   * Assert league teams response structure
   */
  assertTeamsResponse: (response: APIResponse) => {
    response.expectToHaveProperty('id')
    response.expectToHaveProperty('name')
    response.expectToHaveProperty('teams')
    response.expectToHaveProperty('pagination')
    
    expect(Array.isArray(response.data.teams)).toBe(true)
    expect(response.data.pagination).toHaveProperty('page')
    expect(response.data.pagination).toHaveProperty('limit')
    expect(response.data.pagination).toHaveProperty('totalItems')
    expect(response.data.pagination).toHaveProperty('totalPages')

    return response
  },

  /**
   * Assert league matches response structure
   */
  assertMatchesResponse: (response: APIResponse) => {
    response.expectToHaveProperty('docs')
    response.expectToHaveProperty('meta')
    
    expect(Array.isArray(response.data.docs)).toBe(true)
    expect(response.data.meta).toHaveProperty('pagination')

    return response
  },

  /**
   * Assert league stats response structure
   */
  assertStatsResponse: (response: APIResponse) => {
    const expectedProperties = ['id', 'name', 'season_id', 'season_name', 'seasons', 'overview', 'player_stats', 'team_stats']
    expectedProperties.forEach(prop => {
      response.expectToHaveProperty(prop)
    })

    expect(Array.isArray(response.data.seasons)).toBe(true)
    expect(typeof response.data.overview).toBe('object')
    expect(typeof response.data.player_stats).toBe('object')
    expect(typeof response.data.team_stats).toBe('object')

    return response
  },

  /**
   * Assert leagues list response structure
   */
  assertLeaguesListResponse: (response: APIResponse) => {
    response.expectToHaveProperty('data')
    response.expectToHaveProperty('meta')
    
    expect(Array.isArray(response.data.data)).toBe(true)
    expect(response.data.meta).toHaveProperty('pagination')
    expect(response.data.meta.pagination).toHaveProperty('page')
    expect(response.data.meta.pagination).toHaveProperty('limit')
    expect(response.data.meta.pagination).toHaveProperty('totalItems')
    expect(response.data.meta.pagination).toHaveProperty('totalPages')

    return response
  },
}

/**
 * Assertion helpers for team endpoint responses
 */
export const teamEndpointAssertions = {
  /**
   * Assert overview response structure
   */
  assertOverviewResponse: (response: APIResponse) => {
    const expectedProperties = [
      'id', 'name', 'season_id', 'season_name', 'form', 
      'next_match', 'current_position', 'stats', 'recent_fixtures'
    ]
    
    expectedProperties.forEach(prop => {
      response.expectToHaveProperty(prop)
    })

    // Assert stats structure
    expect(response.data.stats).toHaveProperty('top_rated')
    expect(response.data.stats).toHaveProperty('top_scorers')
    expect(response.data.stats).toHaveProperty('top_assists')
    
    // Assert form is an array
    expect(Array.isArray(response.data.form)).toBe(true)

    return response
  },

  /**
   * Assert table response structure
   */
  assertTableResponse: (response: APIResponse) => {
    expect(typeof response.data).toBe('object')
    
    // Should be a record of season IDs to standings data
    Object.values(response.data).forEach((seasonData: any) => {
      expect(seasonData).toHaveProperty('id')
      expect(seasonData).toHaveProperty('name')
      expect(seasonData).toHaveProperty('standings')
      expect(Array.isArray(seasonData.standings)).toBe(true)
    })

    return response
  },

  /**
   * Assert fixture response structure
   */
  assertFixturesResponse: (response: APIResponse) => {
    response.expectToHaveProperty('docs')
    response.expectToHaveProperty('meta')
    response.expectToHaveProperty('nextMatch')
    
    expect(Array.isArray(response.data.docs)).toBe(true)
    expect(response.data.meta).toHaveProperty('pagination')

    return response
  },

  /**
   * Assert squad response structure
   */
  assertSquadResponse: (response: APIResponse) => {
    response.expectToHaveProperty('players')
    response.expectToHaveProperty('coaches')
    
    const { players } = response.data
    const expectedPositions = ['goalkeepers', 'defenders', 'midfielders', 'forwards']
    expectedPositions.forEach(position => {
      expect(players).toHaveProperty(position)
      expect(Array.isArray(players[position])).toBe(true)
    })

    return response
  },

  /**
   * Assert stats response structure
   */
  assertStatsResponse: (response: APIResponse) => {
    const expectedProperties = ['player_stats', 'team_stats', 'season_id', 'seasons', 'top_stats']
    expectedProperties.forEach(prop => {
      response.expectToHaveProperty(prop)
    })

    expect(Array.isArray(response.data.player_stats)).toBe(true)
    expect(Array.isArray(response.data.seasons)).toBe(true)
    expect(Array.isArray(response.data.top_stats)).toBe(true)

    return response
  },
}

// Export commonly used league test data
export const mockLeagueData = {
  overview: {
    id: '8',
    name: 'Premier League',
    logo: 'https://example.com/premier-league-logo.png',
    country: {
      id: '1',
      name: 'England',
      flag: 'https://example.com/england-flag.png'
    },
    season_id: 20,
    season_name: '2023-24',
    seasons: [
      { id: '20', name: '2023-24' },
      { id: '19', name: '2022-23' }
    ],
    table_summary: {
      top_teams: [],
      promotion_teams: [],
      relegation_teams: []
    },
    upcoming_matches: [],
    recent_results: [],
    stats_summary: {
      top_scorers: [],
      top_assists: [],
      top_rated: []
    },
    metadata: {
      total_teams: 20,
      total_matches_played: 380,
      total_goals: 1000,
      average_goals_per_match: 2.63
    }
  },

  standings: {
    '20': {
      id: 8,
      name: 'Premier League',
      type: 'league',
      league_id: 8,
      season_id: 20,
      stage_id: null,
      stage_name: null,
      standings: []
    }
  },

  teams: {
    id: '8',
    name: 'Premier League',
    teams: [],
    pagination: {
      page: 1,
      limit: 50,
      totalItems: 20,
      totalPages: 1
    }
  },

  matches: {
    docs: [],
    meta: {
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        type: 'auto',
        hasMorePages: false,
        hasPreviousPages: false,
        nextPage: null,
        previousPage: null,
        hasNewer: false,
        hasOlder: false,
        newerUrl: null,
        olderUrl: null
      }
    },
    nextMatch: null
  },

  stats: {
    id: '8',
    name: 'Premier League',
    season_id: 20,
    season_name: '2023-24',
    seasons: [
      { id: '20', name: '2023-24' },
      { id: '19', name: '2022-23' }
    ],
    overview: {
      teams_count: 20,
      total_players: 500,
      total_goals: 1000,
      total_assists: 300,
      total_yellow_cards: 1200,
      total_red_cards: 50,
      total_appearances: 7000,
      total_minutes_played: 500000,
      average_goals_per_player: 2.0,
      average_assists_per_player: 0.6
    },
    player_stats: {
      top_scorers: { category: 'goals', label: 'Top Goal Scorers', players: [] },
      top_assists: { category: 'assists', label: 'Most Assists', players: [] },
      most_minutes: { category: 'minutes', label: 'Most Minutes Played', players: [] },
      top_goals_assists: { category: 'goals_assists', label: 'Goals + Assists', players: [] }
    },
    team_stats: {
      attack: { category: 'attack', label: 'Goals Scored', teams: [] },
      defense: { category: 'defense', label: 'Clean Sheets', teams: [] },
      discipline: { category: 'discipline', label: 'Best Disciplinary Record', teams: [] },
      performance: { category: 'performance', label: 'Most Wins', teams: [] }
    },
    top_stats: [],
    legacy_player_stats: []
  },

  leaguesList: {
    data: [
      {
        id: '8',
        name: 'Premier League',
        logo: 'https://example.com/premier-league-logo.png',
        country: {
          id: '1',
          name: 'England',
          flag: 'https://example.com/england-flag.png'
        },
        current_season: {
          id: '20',
          name: '2023-24'
        }
      }
    ],
    meta: {
      pagination: {
        page: 1,
        limit: 50,
        totalItems: 1,
        totalPages: 1
      }
    }
  }
}

// Export commonly used team test data
export const mockTeamData = {
  overview: {
    id: '123',
    name: 'Test Team',
    season_id: 20,
    season_name: '2023-24',
    form: [],
    next_match: null,
    current_position: null,
    stats: {
      top_rated: [],
      top_scorers: [],
      top_assists: []
    },
    recent_fixtures: []
  },
  
  table: {
    '20': {
      id: 1,
      name: 'Premier League',
      type: 'league',
      league_id: 8,
      season_id: 20,
      stage_id: null,
      stage_name: null,
      standings: []
    }
  },

  fixtures: {
    docs: [],
    meta: {
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        type: 'all',
        hasMorePages: false,
        hasPreviousPages: false,
        nextPage: null,
        previousPage: null,
        hasNewer: false,
        hasOlder: false,
        newerUrl: null,
        olderUrl: null
      }
    },
    nextMatch: null
  },

  squad: {
    players: {
      goalkeepers: [],
      defenders: [],
      midfielders: [],
      forwards: []
    },
    coaches: []
  },

  stats: {
    player_stats: [],
    team_stats: {
      matches_played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0
    },
    season_id: 20,
    seasons: [],
    top_stats: []
  }
}