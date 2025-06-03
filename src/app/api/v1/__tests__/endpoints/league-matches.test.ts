import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createLeagueRequest,
  executeEndpoint,
  apiTestSetup,
  leagueEndpointAssertions,
  mockLeagueDataFetcher,
  mockLeagueData,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import leagueMatchesEndpoint from '../../leagueMatches'

describe('League Matches API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/league/:id/matches', () => {
    it('should have correct endpoint configuration', () => {
      expect(leagueMatchesEndpoint.path).toBe('/v1/league/:id/matches')
      expect(leagueMatchesEndpoint.method).toBe('get')
      expect(typeof leagueMatchesEndpoint.handler).toBe('function')
    })

    it('should return league matches data successfully with default parameters', async () => {
      const leagueId = '8'
      const mockMatchesData = {
        docs: [
          {
            id: '1',
            starting_at: '2024-02-01T15:00:00Z',
            starting_at_timestamp: 1706796000,
            league: { id: 8, name: 'Premier League' },
            home_team: { id: 1, name: 'Arsenal', image_path: 'arsenal.png' },
            away_team: { id: 2, name: 'Chelsea', image_path: 'chelsea.png' },
            result_info: null,
            state: 'upcoming'
          },
          {
            id: '2',
            starting_at: '2024-01-28T15:00:00Z',
            starting_at_timestamp: 1706450400,
            league: { id: 8, name: 'Premier League' },
            home_team: { id: 3, name: 'Liverpool', image_path: 'liverpool.png' },
            away_team: { id: 4, name: 'Manchester United', image_path: 'man-utd.png' },
            result_info: { home: 2, away: 1 },
            state: 'finished'
          }
        ],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            total: 2,
            totalPages: 1,
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
        nextMatch: {
          starting_at: '2024-02-01T15:00:00Z',
          league: { id: 8, name: 'Premier League' },
          home_team: { id: 1, name: 'Arsenal', image_path: 'arsenal.png' },
          away_team: { id: 2, name: 'Chelsea', image_path: 'chelsea.png' },
          home_position: null,
          away_position: null,
          home_goals_per_match: null,
          away_goals_per_match: null,
          home_goals_conceded_per_match: null,
          away_goals_conceded_per_match: null
        }
      }

      mockLeagueDataFetcher.getMatches.mockResolvedValue(mockMatchesData)

      const request = createLeagueRequest(leagueId, 'matches')
      const response = await executeEndpoint(leagueMatchesEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertMatchesResponse(response)

      // Verify specific data
      expect(response.data.docs).toHaveLength(2)
      expect(response.data.meta.pagination.page).toBe(1)
      expect(response.data.meta.pagination.limit).toBe(50)
      expect(response.data.meta.pagination.total).toBe(2)
      expect(response.data.nextMatch).toEqual(mockMatchesData.nextMatch)

      // Verify fetcher was called with correct parameters
      expect(mockLeagueDataFetcher.getMatches).toHaveBeenCalledWith(
        leagueId,
        1, // page
        50, // limit
        undefined, // seasonId
        'auto', // type
        false // includeNextMatch
      )
    })

    it('should handle query parameters correctly', async () => {
      const leagueId = '8'
      
      const request = createLeagueRequest(leagueId, 'matches', {
        queryParams: {
          page: '2',
          limit: '25',
          season_id: '20',
          type: 'upcoming',
          includeNextMatch: 'true'
        }
      })

      mockLeagueDataFetcher.getMatches.mockResolvedValue({
        docs: [],
        meta: { pagination: { page: 2, limit: 25, total: 0, totalPages: 0 } },
        nextMatch: null
      })

      const response = await executeEndpoint(leagueMatchesEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with parsed parameters
      expect(mockLeagueDataFetcher.getMatches).toHaveBeenCalledWith(
        leagueId,
        2, // page
        25, // limit
        '20', // seasonId
        'upcoming', // type
        true // includeNextMatch
      )
    })

    it('should handle invalid type parameter by defaulting to auto', async () => {
      const leagueId = '8'
      
      const request = createLeagueRequest(leagueId, 'matches', {
        queryParams: { type: 'invalid_type' }
      })

      mockLeagueDataFetcher.getMatches.mockResolvedValue({
        docs: [],
        meta: { pagination: {} },
        nextMatch: null
      })

      await executeEndpoint(leagueMatchesEndpoint, request)

      // Should default to 'auto' for invalid type
      expect(mockLeagueDataFetcher.getMatches).toHaveBeenCalledWith(
        leagueId,
        1, // page
        50, // limit
        undefined, // seasonId
        'auto', // type
        false // includeNextMatch
      )
    })

    it('should handle valid type parameters (all, past, upcoming)', async () => {
      const leagueId = '8'
      const validTypes = ['all', 'past', 'upcoming']

      for (const type of validTypes) {
        jest.clearAllMocks()
        
        const request = createLeagueRequest(leagueId, 'matches', {
          queryParams: { type }
        })

        mockLeagueDataFetcher.getMatches.mockResolvedValue({
          docs: [],
          meta: { pagination: {} },
          nextMatch: null
        })

        await executeEndpoint(leagueMatchesEndpoint, request)

        expect(mockLeagueDataFetcher.getMatches).toHaveBeenCalledWith(
          leagueId,
          1, // page
          50, // limit
          undefined, // seasonId
          type, // type
          false // includeNextMatch
        )
      }
    })

    it('should handle missing league ID in URL', async () => {
      // Create a request with a malformed URL that will result in missing ID
      const request = {
        url: 'http://localhost:3000/matches', // Will result in pathParts[length-2] = undefined
        method: 'GET',
        headers: new Headers(),
        payload: null,
        user: null,
        locale: 'en',
        fallbackLocale: 'en',
        t: jest.fn(),
        i18n: {} as any,
        context: {},
        responseType: 'json',
      } as any

      const response = await executeEndpoint(leagueMatchesEndpoint, request)

      response.expectStatus(400).expectError('League ID is required')
    })

    it('should handle invalid league ID format', async () => {
      const leagueId = 'invalid'
      
      mockLeagueDataFetcher.getMatches.mockRejectedValue(new Error('Invalid league ID format'))
      
      const request = createLeagueRequest(leagueId, 'matches')
      const response = await executeEndpoint(leagueMatchesEndpoint, request)

      response.expectStatus(400).expectError('Invalid league ID format')
    })

    it('should handle league not found error', async () => {
      const leagueId = '999'
      
      mockLeagueDataFetcher.getMatches.mockRejectedValue(new Error('No league found with ID: 999'))
      
      const request = createLeagueRequest(leagueId, 'matches')
      const response = await executeEndpoint(leagueMatchesEndpoint, request)

      response.expectStatus(404).expectError('League not found')
    })

    it('should handle invalid league data error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getMatches.mockRejectedValue(new Error('Invalid league data structure'))
      
      const request = createLeagueRequest(leagueId, 'matches')
      const response = await executeEndpoint(leagueMatchesEndpoint, request)

      response.expectStatus(500).expectError('Invalid league data structure')
    })

    it('should handle data fetcher errors gracefully', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getMatches.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createLeagueRequest(leagueId, 'matches')
      const response = await executeEndpoint(leagueMatchesEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching league matches')
    })

    it('should handle empty matches data', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getMatches.mockResolvedValue({
        docs: [],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
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
      })

      const request = createLeagueRequest(leagueId, 'matches')
      const response = await executeEndpoint(leagueMatchesEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertMatchesResponse(response)
      
      expect(response.data.docs).toEqual([])
      expect(response.data.nextMatch).toBeNull()
      expect(response.data.meta.pagination.total).toBe(0)
    })

    it('should handle pagination parameters correctly', async () => {
      const leagueId = '8'
      
      const testCases = [
        { page: '0', limit: '0', expectedPage: 0, expectedLimit: 0 },
        { page: 'invalid', limit: 'invalid', expectedPage: NaN, expectedLimit: NaN },
        { page: '5', limit: '100', expectedPage: 5, expectedLimit: 100 }
      ]

      for (const testCase of testCases) {
        jest.clearAllMocks()
        
        const request = createLeagueRequest(leagueId, 'matches', {
          queryParams: {
            page: testCase.page,
            limit: testCase.limit
          }
        })

        mockLeagueDataFetcher.getMatches.mockResolvedValue({
          docs: [],
          meta: { pagination: {} },
          nextMatch: null
        })

        await executeEndpoint(leagueMatchesEndpoint, request)

        expect(mockLeagueDataFetcher.getMatches).toHaveBeenCalledWith(
          leagueId,
          testCase.expectedPage,
          testCase.expectedLimit,
          undefined, // seasonId
          'auto', // type
          false // includeNextMatch
        )
      }
    })

    it('should handle includeNextMatch parameter variations', async () => {
      const leagueId = '8'
      
      const testCases = [
        { includeNextMatch: 'true', expected: true },
        { includeNextMatch: 'false', expected: false },
        { includeNextMatch: '1', expected: false }, // Only 'true' should be true
        { includeNextMatch: 'yes', expected: false }
      ]

      for (const testCase of testCases) {
        jest.clearAllMocks()
        
        const request = createLeagueRequest(leagueId, 'matches', {
          queryParams: { includeNextMatch: testCase.includeNextMatch }
        })

        mockLeagueDataFetcher.getMatches.mockResolvedValue({
          docs: [],
          meta: { pagination: {} },
          nextMatch: null
        })

        await executeEndpoint(leagueMatchesEndpoint, request)

        expect(mockLeagueDataFetcher.getMatches).toHaveBeenCalledWith(
          leagueId,
          1, // page
          50, // limit
          undefined, // seasonId
          'auto', // type
          testCase.expected // includeNextMatch
        )
      }
    })

    it('should handle invalid URL format', async () => {
      const request = {
        url: null,
        method: 'GET',
        headers: new Headers(),
        payload: null,
        user: null,
        locale: 'en',
        fallbackLocale: 'en',
        t: jest.fn(),
        i18n: {} as any,
        context: {},
        responseType: 'json',
      } as any

      const response = await executeEndpoint(leagueMatchesEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should handle matches with temporal navigation URLs', async () => {
      const leagueId = '8'
      
      const mockMatchesWithNavigation = {
        docs: [
          {
            id: '1',
            starting_at: '2024-02-01T15:00:00Z',
            starting_at_timestamp: 1706796000,
            league: { id: 8, name: 'Premier League' },
            home_team: { id: 1, name: 'Arsenal', image_path: 'arsenal.png' },
            away_team: { id: 2, name: 'Chelsea', image_path: 'chelsea.png' },
            result_info: null,
            state: 'upcoming'
          }
        ],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            total: 100,
            totalPages: 2,
            type: 'upcoming',
            hasMorePages: true,
            hasPreviousPages: false,
            nextPage: '/api/v1/league/8/matches?page=2&limit=50&type=upcoming',
            previousPage: null,
            hasNewer: true,
            hasOlder: true,
            newerUrl: '/api/v1/league/8/matches?page=2&limit=50&type=upcoming',
            olderUrl: '/api/v1/league/8/matches?page=1&limit=50&type=past'
          }
        },
        nextMatch: null
      }

      mockLeagueDataFetcher.getMatches.mockResolvedValue(mockMatchesWithNavigation)

      const request = createLeagueRequest(leagueId, 'matches', {
        queryParams: { type: 'upcoming' }
      })
      const response = await executeEndpoint(leagueMatchesEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertMatchesResponse(response)

      // Verify temporal navigation URLs are present
      expect(response.data.meta.pagination.hasNewer).toBe(true)
      expect(response.data.meta.pagination.hasOlder).toBe(true)
      expect(response.data.meta.pagination.newerUrl).toContain('type=upcoming')
      expect(response.data.meta.pagination.olderUrl).toContain('type=past')
    })
  })
})