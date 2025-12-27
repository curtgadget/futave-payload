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

// Mock player data fetcher
export const mockPlayerDataFetcher = {
  getOverview: createMockFn(),
  getStats: createMockFn(),
  getCareer: createMockFn(),
}

// Mock player list data fetcher
export const mockPlayerListDataFetcher = {
  getPlayers: createMockFn(),
}

// Mock auth middleware
export const mockAuthMiddleware = createMockFn()

// Setup mocks before importing modules
jest.mock('payload', () => ({
  getPayload: createMockFn().mockResolvedValue(mockPayload),
}))

jest.mock('@/payload.config', () => ({}))
jest.mock('@payload-config', () => ({}))

jest.mock('../services/teamDataFetcher', () => ({
  teamDataFetcher: mockTeamDataFetcher,
}))

jest.mock('../services/leagueDataFetcher', () => ({
  leagueDataFetcher: mockLeagueDataFetcher,
  leagueListDataFetcher: mockLeagueListDataFetcher,
}))

jest.mock('../services/playerDataFetcher', () => ({
  playerDataFetcher: mockPlayerDataFetcher,
  playerListDataFetcher: mockPlayerListDataFetcher,
}))

jest.mock('@/utilities/auth', () => ({
  createAuthMiddleware: createMockFn().mockReturnValue(mockAuthMiddleware),
}))

/**
 * Create a mock PayloadRequest for testing
 */
export function createMockRequest(
  options: {
    url?: string
    method?: string
    headers?: Record<string, string>
    body?: any
  } = {},
): PayloadRequest {
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
    public headers: Headers = new Headers(),
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
  request: PayloadRequest,
): Promise<APIResponse> {
  const response = await route.handler(request)
  return APIResponse.fromResponse(response)
}

/**
 * Create test request for team endpoints
 */
export function createTeamRequest(
  teamId: string,
  resource: string,
  options: {
    queryParams?: Record<string, string>
    method?: string
    headers?: Record<string, string>
  } = {},
): PayloadRequest {
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
export function createLeagueRequest(
  leagueId: string,
  resource?: string,
  options: {
    queryParams?: Record<string, string>
    method?: string
    headers?: Record<string, string>
  } = {},
): PayloadRequest {
  const { queryParams = {}, method = 'GET', headers = {} } = options

  let basePath: string
  const finalQueryParams = { ...queryParams }

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
 * Create test request for player endpoints
 */
export function createPlayerRequest(
  playerId: string,
  options: {
    queryParams?: Record<string, string>
    method?: string
    headers?: Record<string, string>
  } = {},
): PayloadRequest {
  const { queryParams = {}, method = 'GET', headers = {} } = options

  const url = new URL(`http://localhost:3000/api/v1/player/${playerId}`)
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
 * Create test request for players list endpoint
 */
export function createPlayersListRequest(
  options: {
    queryParams?: Record<string, string>
    method?: string
    headers?: Record<string, string>
  } = {},
): PayloadRequest {
  const { queryParams = {}, method = 'GET', headers = {} } = options

  const url = new URL(`http://localhost:3000/api/v1/players`)
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
 * Create test request for match endpoints
 */
export function createMatchRequest(
  matchId: string,
  tab?: string,
  options: {
    queryParams?: Record<string, string>
    method?: string
    headers?: Record<string, string>
  } = {},
): PayloadRequest {
  const { queryParams = {}, method = 'GET', headers = {} } = options

  let basePath = `match/${matchId}`
  if (tab) {
    basePath += `/${tab}`
  }

  const url = new URL(`http://localhost:3000/api/v1/${basePath}`)
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
    mockTeamDataFetcher.getFixtures.mockResolvedValue({
      docs: [],
      meta: { pagination: {} },
      nextMatch: null,
    })
    mockTeamDataFetcher.getSquad.mockResolvedValue({ players: {}, coaches: [] })
    mockTeamDataFetcher.getStats.mockResolvedValue({
      player_stats: [],
      team_stats: {},
      top_stats: [],
      current_season: {},
    })

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
      metadata: {
        total_teams: 0,
        total_matches_played: 0,
        total_goals: 0,
        average_goals_per_match: 0,
      },
    })
    mockLeagueDataFetcher.getStandings.mockResolvedValue({})
    mockLeagueDataFetcher.getTeams.mockResolvedValue({
      id: '1',
      name: 'Test League',
      teams: [],
      pagination: { page: 1, limit: 50, totalItems: 0, totalPages: 0 },
    })
    mockLeagueDataFetcher.getMatches.mockResolvedValue({
      docs: [],
      meta: { pagination: {} },
      nextMatch: null,
    })
    mockLeagueDataFetcher.getStats.mockResolvedValue({
      id: '1',
      name: 'Test League',
      season_id: 1,
      season_name: 'Test Season',
      seasons: [],
      overview: {},
      player_stats: {},
      team_stats: {},
      top_stats: [],
      legacy_player_stats: [],
    })
    mockLeagueDataFetcher.getSeasons.mockResolvedValue({
      id: '1',
      name: 'Test League',
      seasons: [],
    })

    mockLeagueListDataFetcher.getLeagues.mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 50, totalItems: 0, totalPages: 0 } },
    })

    // Reset player data fetcher mocks
    mockPlayerDataFetcher.getOverview.mockResolvedValue({
      id: '1',
      name: 'Test Player',
      position: 'Forward',
      nationality: 'Test Country',
      current_team_stats: undefined,
      career: [],
    })
    mockPlayerDataFetcher.getStats.mockResolvedValue({
      id: '1',
      name: 'Test Player',
      position: 'Forward',
      nationality: 'Test Country',
      stats: [],
      seasons: [],
    })
    mockPlayerDataFetcher.getCareer.mockResolvedValue({
      id: '1',
      name: 'Test Player',
      position: 'Forward',
      nationality: 'Test Country',
      career: [],
    })

    mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 50, totalItems: 0, totalPages: 0 } },
    })

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
      'id',
      'name',
      'season_id',
      'season_name',
      'seasons',
      'table_summary',
      'upcoming_matches',
      'recent_results',
      'stats_summary',
      'metadata',
    ]

    expectedProperties.forEach((prop) => {
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
    const expectedProperties = [
      'id',
      'name',
      'season_id',
      'season_name',
      'seasons',
      'overview',
      'player_stats',
      'team_stats',
    ]
    expectedProperties.forEach((prop) => {
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
      'id',
      'name',
      'season_id',
      'season_name',
      'form',
      'next_match',
      'current_position',
      'stats',
      'recent_fixtures',
    ]

    expectedProperties.forEach((prop) => {
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
    expectedPositions.forEach((position) => {
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
    expectedProperties.forEach((prop) => {
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
      flag: 'https://example.com/england-flag.png',
    },
    season_id: 20,
    season_name: '2023-24',
    seasons: [
      { id: '20', name: '2023-24' },
      { id: '19', name: '2022-23' },
    ],
    table_summary: {
      top_teams: [],
      promotion_teams: [],
      relegation_teams: [],
    },
    upcoming_matches: [],
    recent_results: [],
    stats_summary: {
      top_scorers: [],
      top_assists: [],
      top_rated: [],
    },
    metadata: {
      total_teams: 20,
      total_matches_played: 380,
      total_goals: 1000,
      average_goals_per_match: 2.63,
    },
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
      standings: [],
    },
  },

  teams: {
    id: '8',
    name: 'Premier League',
    teams: [],
    pagination: {
      page: 1,
      limit: 50,
      totalItems: 20,
      totalPages: 1,
    },
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
        olderUrl: null,
      },
    },
    nextMatch: null,
  },

  stats: {
    id: '8',
    name: 'Premier League',
    season_id: 20,
    season_name: '2023-24',
    seasons: [
      { id: '20', name: '2023-24' },
      { id: '19', name: '2022-23' },
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
      average_assists_per_player: 0.6,
    },
    player_stats: {
      top_scorers: { category: 'goals', label: 'Top Goal Scorers', players: [] },
      top_assists: { category: 'assists', label: 'Most Assists', players: [] },
      most_minutes: { category: 'minutes', label: 'Most Minutes Played', players: [] },
      top_goals_assists: { category: 'goals_assists', label: 'Goals + Assists', players: [] },
    },
    team_stats: {
      attack: { category: 'attack', label: 'Goals Scored', teams: [] },
      defense: { category: 'defense', label: 'Clean Sheets', teams: [] },
      discipline: { category: 'discipline', label: 'Best Disciplinary Record', teams: [] },
      performance: { category: 'performance', label: 'Most Wins', teams: [] },
    },
    top_stats: [],
    legacy_player_stats: [],
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
          flag: 'https://example.com/england-flag.png',
        },
        current_season: {
          id: '20',
          name: '2023-24',
        },
      },
    ],
    meta: {
      pagination: {
        page: 1,
        limit: 50,
        totalItems: 1,
        totalPages: 1,
      },
    },
  },
}

/**
 * Assertion helpers for player endpoint responses
 */
export const playerEndpointAssertions = {
  /**
   * Assert player overview response structure
   */
  assertOverviewResponse: (response: APIResponse) => {
    // Only check for required properties that should always be present
    const requiredProperties = ['id', 'name', 'trophies', 'career']

    requiredProperties.forEach((prop) => {
      response.expectToHaveProperty(prop)
    })

    // Assert arrays
    expect(Array.isArray(response.data.trophies)).toBe(true)
    expect(Array.isArray(response.data.career)).toBe(true)

    return response
  },

  /**
   * Assert player stats response structure
   */
  assertStatsResponse: (response: APIResponse) => {
    const requiredProperties = ['id', 'name', 'stats', 'seasons']

    requiredProperties.forEach((prop) => {
      response.expectToHaveProperty(prop)
    })

    // Assert arrays
    expect(Array.isArray(response.data.stats)).toBe(true)
    expect(Array.isArray(response.data.seasons)).toBe(true)

    return response
  },

  /**
   * Assert player career response structure
   */
  assertCareerResponse: (response: APIResponse) => {
    const requiredProperties = ['id', 'name', 'career']

    requiredProperties.forEach((prop) => {
      response.expectToHaveProperty(prop)
    })

    // Assert career is an array
    expect(Array.isArray(response.data.career)).toBe(true)

    return response
  },

  /**
   * Assert players list response structure
   */
  assertPlayersListResponse: (response: APIResponse) => {
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
 * Match endpoint assertions
 */
export const matchEndpointAssertions = {
  /**
   * Assert match overview response structure
   */
  assertOverviewResponse: (response: APIResponse) => {
    response.expectToHaveProperty('data')

    const requiredProperties = [
      'id',
      'league',
      'homeTeam',
      'awayTeam',
      'score',
      'status',
      'startingAt',
      'lineups',
    ]

    requiredProperties.forEach((prop) => {
      expect(response.data.data).toHaveProperty(prop)
    })

    // Assert team structures
    expect(response.data.data.homeTeam).toHaveProperty('id')
    expect(response.data.data.homeTeam).toHaveProperty('name')
    expect(response.data.data.awayTeam).toHaveProperty('id')
    expect(response.data.data.awayTeam).toHaveProperty('name')

    // Assert lineup structures
    expect(response.data.data.lineups).toHaveProperty('home')
    expect(response.data.data.lineups).toHaveProperty('away')

    // Check lineup components
    const homeLineup = response.data.data.lineups.home
    const awayLineup = response.data.data.lineups.away

    const lineupsProps = ['formation', 'startingXI', 'bench', 'sidelined', 'coach']
    lineupsProps.forEach((prop: string) => {
      expect(homeLineup).toHaveProperty(prop)
      expect(awayLineup).toHaveProperty(prop)
    })

    // Assert arrays
    expect(Array.isArray(homeLineup.startingXI)).toBe(true)
    expect(Array.isArray(homeLineup.bench)).toBe(true)
    expect(Array.isArray(homeLineup.sidelined)).toBe(true)
    expect(Array.isArray(awayLineup.startingXI)).toBe(true)
    expect(Array.isArray(awayLineup.bench)).toBe(true)
    expect(Array.isArray(awayLineup.sidelined)).toBe(true)

    return response
  },

  /**
   * Assert match lineups response structure
   */
  assertLineupsResponse: (response: APIResponse) => {
    response.expectToHaveProperty('lineups')

    expect(response.data.lineups).toHaveProperty('home')
    expect(response.data.lineups).toHaveProperty('away')

    const homeLineup = response.data.lineups.home
    const awayLineup = response.data.lineups.away

    const lineupsProps = ['formation', 'startingXI', 'bench', 'sidelined', 'coach']
    lineupsProps.forEach((prop: string) => {
      expect(homeLineup).toHaveProperty(prop)
      expect(awayLineup).toHaveProperty(prop)
    })

    // Assert arrays
    expect(Array.isArray(homeLineup.startingXI)).toBe(true)
    expect(Array.isArray(homeLineup.bench)).toBe(true)
    expect(Array.isArray(homeLineup.sidelined)).toBe(true)
    expect(Array.isArray(awayLineup.startingXI)).toBe(true)
    expect(Array.isArray(awayLineup.bench)).toBe(true)
    expect(Array.isArray(awayLineup.sidelined)).toBe(true)

    return response
  },

  /**
   * Assert coach information structure in lineups
   */
  assertCoachInformation: (response: APIResponse, tabName: string = 'overview') => {
    let lineups

    if (tabName === 'lineups') {
      lineups = response.data.lineups
    } else {
      lineups = response.data.data.lineups
    }

    const homeCoach = lineups.home.coach
    const awayCoach = lineups.away.coach

    if (homeCoach) {
      expect(homeCoach).toHaveProperty('coach_id')
      expect(homeCoach).toHaveProperty('coach_name')
      expect(typeof homeCoach.coach_id).toBe('number')
      expect(typeof homeCoach.coach_name).toBe('string')
    }

    if (awayCoach) {
      expect(awayCoach).toHaveProperty('coach_id')
      expect(awayCoach).toHaveProperty('coach_name')
      expect(typeof awayCoach.coach_id).toBe('number')
      expect(typeof awayCoach.coach_name).toBe('string')
    }

    return response
  },
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
      top_assists: [],
    },
    recent_fixtures: [],
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
      standings: [],
    },
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
        olderUrl: null,
      },
    },
    nextMatch: null,
  },

  squad: {
    players: {
      goalkeepers: [],
      defenders: [],
      midfielders: [],
      forwards: [],
    },
    coaches: [],
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
      goal_difference: 0,
    },
    season_id: 20,
    seasons: [],
    top_stats: [],
  },
}

// Export commonly used player test data
export const mockPlayerData = {
  overview: {
    id: '999',
    name: 'Cristiano Ronaldo',
    position: 'Forward',
    nationality: 'Portugal',
    team: {
      id: '50',
      name: 'Al Nassr',
    },
    photo: 'https://example.com/ronaldo.jpg',
    jersey_number: 7,
    date_of_birth: '1985-02-05',
    age: 39,
    height: {
      metric: '187 cm',
      imperial: '6\'2"',
    },
    weight: {
      metric: '83 kg',
      imperial: '183 lbs',
    },
    foot: 'right' as const,
    trophies: [
      {
        team: {
          id: '1',
          name: 'Real Madrid',
          logo: 'https://example.com/rm.png',
          country: 'Spain',
        },
        league: { id: '564', name: 'Champions League', logo: 'https://example.com/ucl.png' },
        season: { id: '12', name: '2017-18' },
        trophy: { id: '1', position: 1, name: 'Winner' },
      },
    ],
    current_team_stats: {
      season: { id: '20', name: '2023-24' },
      team: { id: '50', name: 'Al Nassr', logo: 'https://example.com/alnassr.png' },
      league: { id: '955', name: 'Saudi Pro League', logo: 'https://example.com/spl.png' },
      appearances: 30,
      starts: 29,
      minutes_played: 2610,
      goals: 35,
      assists: 11,
      yellow_cards: 2,
      red_cards: 0,
      rating: 8.2,
    },
    career: [
      {
        team: { id: '50', name: 'Al Nassr', logo: 'https://example.com/alnassr.png' },
        league: {
          id: '955',
          name: 'Saudi Pro League',
          logo: 'https://example.com/spl.png',
          country: 'Saudi Arabia',
        },
        season: { id: '20', name: '2023-24' },
        start_date: '2023-01-01',
        end_date: null,
        appearances: 30,
        starts: 29,
        goals: 35,
        assists: 11,
        minutes_played: 2610,
        rating: 8.2,
      },
    ],
  },

  stats: {
    id: '999',
    name: 'Cristiano Ronaldo',
    position: 'Forward',
    nationality: 'Portugal',
    stats: [
      {
        season: { id: '20', name: '2023-24' },
        team: { id: '50', name: 'Al Nassr', logo: 'https://example.com/alnassr.png' },
        league: { id: '955', name: 'Saudi Pro League', logo: 'https://example.com/spl.png' },
        appearances: 30,
        starts: 29,
        minutes_played: 2610,
        goals: 35,
        assists: 11,
        yellow_cards: 2,
        red_cards: 0,
        rating: 8.2,
        shots: { total: 150, on_target: 75, accuracy: 50 },
        passes: { total: 800, key: 45, accuracy: 85 },
        dribbles: { attempts: 80, success: 48, success_rate: 60 },
      },
    ],
    seasons: [
      { id: '20', name: '2023-24' },
      { id: '19', name: '2022-23' },
    ],
  },

  career: {
    id: '999',
    name: 'Cristiano Ronaldo',
    position: 'Forward',
    nationality: 'Portugal',
    career: [
      {
        team: { id: '50', name: 'Al Nassr', logo: 'https://example.com/alnassr.png' },
        league: {
          id: '955',
          name: 'Saudi Pro League',
          logo: 'https://example.com/spl.png',
          country: 'Saudi Arabia',
        },
        season: { id: '20', name: '2023-24' },
        start_date: '2023-01-01',
        end_date: null,
        appearances: 30,
        starts: 29,
        goals: 35,
        assists: 11,
        minutes_played: 2610,
        rating: 8.2,
      },
      {
        team: { id: '12', name: 'Manchester United', logo: 'https://example.com/mufc.png' },
        league: {
          id: '8',
          name: 'Premier League',
          logo: 'https://example.com/pl.png',
          country: 'England',
        },
        season: { id: '19', name: '2022-23' },
        start_date: '2022-07-01',
        end_date: '2022-12-31',
        appearances: 16,
        starts: 12,
        goals: 3,
        assists: 2,
        minutes_played: 1200,
        rating: 6.8,
      },
    ],
  },

  playersList: {
    data: [
      {
        id: '999',
        name: 'Cristiano Ronaldo',
        position: 'Forward',
        nationality: 'Portugal',
        team: {
          id: '50',
          name: 'Al Nassr',
        },
        photo: 'https://example.com/ronaldo.jpg',
        jersey_number: 7,
        date_of_birth: '1985-02-05',
        age: 39,
      },
      {
        id: '1000',
        name: 'Lionel Messi',
        position: 'Forward',
        nationality: 'Argentina',
        team: {
          id: '60',
          name: 'Inter Miami',
        },
        photo: 'https://example.com/messi.jpg',
        jersey_number: 10,
        date_of_birth: '1987-06-24',
        age: 37,
      },
    ],
    meta: {
      pagination: {
        page: 1,
        limit: 50,
        totalItems: 2,
        totalPages: 1,
      },
    },
  },
}
