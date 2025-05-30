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
    mockAuthMiddleware.mockResolvedValue(null) // No auth error by default
  },

  afterEach: () => {
    jest.clearAllMocks()
    // Restore console.error
    ;(console.error as jest.Mock).mockRestore?.()
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

// Export commonly used test data
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