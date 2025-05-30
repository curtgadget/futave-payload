import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createTeamRequest,
  executeEndpoint,
  apiTestSetup,
  teamEndpointAssertions,
  mockTeamDataFetcher,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import teamFixturesEndpoint from '../../teamFixtures'

describe('Team Fixtures API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/team/:id/fixtures', () => {
    it('should have correct endpoint configuration', () => {
      expect(teamFixturesEndpoint.path).toBe('/v1/team/:id/fixtures')
      expect(teamFixturesEndpoint.method).toBe('get')
      expect(typeof teamFixturesEndpoint.handler).toBe('function')
    })

    it('should return team fixtures data successfully with default parameters', async () => {
      const teamId = '123'
      const mockFixturesData = {
        docs: [
          {
            id: '1',
            starting_at: '2024-01-20T15:00:00Z',
            final_score: null,
            participants: [
              { id: 123, name: 'Test Team', meta: { location: 'home' } },
              { id: 456, name: 'Opponent Team', meta: { location: 'away' } }
            ],
            league: { id: 8, name: 'Premier League' },
            round: { id: 25, name: 'Round 25' },
            venue: { id: 1, name: 'Home Stadium' }
          },
          {
            id: '2',
            starting_at: '2024-01-10T20:00:00Z',
            final_score: { home: 2, away: 1 },
            participants: [
              { id: 789, name: 'Away Team', meta: { location: 'home' } },
              { id: 123, name: 'Test Team', meta: { location: 'away' } }
            ],
            league: { id: 8, name: 'Premier League' },
            round: { id: 24, name: 'Round 24' },
            venue: { id: 2, name: 'Away Stadium' }
          }
        ],
        meta: {
          pagination: {
            page: 1,
            limit: 10,
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
          id: '1',
          starting_at: '2024-01-20T15:00:00Z',
          league: { id: 8, name: 'Premier League' },
          home_team: { id: 123, name: 'Test Team' },
          away_team: { id: 456, name: 'Opponent Team' }
        }
      }

      mockTeamDataFetcher.getFixtures.mockResolvedValue(mockFixturesData)

      const request = createTeamRequest(teamId, 'fixtures')
      const response = await executeEndpoint(teamFixturesEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertFixturesResponse(response)

      // Verify specific data
      expect(response.data.docs).toHaveLength(2)
      expect(response.data.meta.pagination.page).toBe(1)
      expect(response.data.meta.pagination.limit).toBe(10)
      expect(response.data.meta.pagination.total).toBe(2)
      expect(response.data.nextMatch).toEqual(mockFixturesData.nextMatch)

      // Verify fetcher was called with correct parameters
      expect(mockTeamDataFetcher.getFixtures).toHaveBeenCalledWith(teamId, {
        page: 1,
        limit: 10,
        type: 'auto',
        includeNextMatch: false
      })
    })

    it('should handle query parameters correctly', async () => {
      const teamId = '456'
      
      const request = createTeamRequest(teamId, 'fixtures', {
        queryParams: {
          page: '2',
          limit: '5',
          type: 'past',
          includeNextMatch: 'true'
        }
      })

      mockTeamDataFetcher.getFixtures.mockResolvedValue({
        docs: [],
        meta: { pagination: { page: 2, limit: 5, total: 0, totalPages: 0 } },
        nextMatch: null
      })

      const response = await executeEndpoint(teamFixturesEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with parsed parameters
      expect(mockTeamDataFetcher.getFixtures).toHaveBeenCalledWith(teamId, {
        page: 2,
        limit: 5,
        type: 'past',
        includeNextMatch: true
      })
    })

    it('should handle invalid type parameter by defaulting to auto', async () => {
      const teamId = '789'
      
      const request = createTeamRequest(teamId, 'fixtures', {
        queryParams: { type: 'invalid_type' }
      })

      mockTeamDataFetcher.getFixtures.mockResolvedValue({
        docs: [],
        meta: { pagination: {} },
        nextMatch: null
      })

      await executeEndpoint(teamFixturesEndpoint, request)

      // Should default to 'auto' for invalid type
      expect(mockTeamDataFetcher.getFixtures).toHaveBeenCalledWith(teamId, {
        page: 1,
        limit: 10,
        type: 'auto',
        includeNextMatch: false
      })
    })

    it('should handle valid type parameters (all, past, upcoming)', async () => {
      const teamId = '999'
      const validTypes = ['all', 'past', 'upcoming']

      for (const type of validTypes) {
        jest.clearAllMocks()
        
        const request = createTeamRequest(teamId, 'fixtures', {
          queryParams: { type }
        })

        mockTeamDataFetcher.getFixtures.mockResolvedValue({
          docs: [],
          meta: { pagination: {} },
          nextMatch: null
        })

        await executeEndpoint(teamFixturesEndpoint, request)

        expect(mockTeamDataFetcher.getFixtures).toHaveBeenCalledWith(teamId, {
          page: 1,
          limit: 10,
          type,
          includeNextMatch: false
        })
      }
    })

    it('should handle missing team ID in URL', async () => {
      const request = createTeamRequest('', 'fixtures')
      const response = await executeEndpoint(teamFixturesEndpoint, request)

      response.expectStatus(400).expectError('Team ID is required')
    })

    it('should handle data fetcher errors gracefully', async () => {
      const teamId = '123'
      
      mockTeamDataFetcher.getFixtures.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createTeamRequest(teamId, 'fixtures')
      const response = await executeEndpoint(teamFixturesEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching team fixtures')
    })

    it('should handle empty fixtures data', async () => {
      const teamId = '456'
      
      mockTeamDataFetcher.getFixtures.mockResolvedValue({
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
      })

      const request = createTeamRequest(teamId, 'fixtures')
      const response = await executeEndpoint(teamFixturesEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertFixturesResponse(response)
      
      expect(response.data.docs).toEqual([])
      expect(response.data.nextMatch).toBeNull()
      expect(response.data.meta.pagination.total).toBe(0)
    })

    it('should handle pagination parameters correctly', async () => {
      const teamId = '777'
      
      const testCases = [
        { page: '0', limit: '0', expectedPage: 0, expectedLimit: 0 },
        { page: 'invalid', limit: 'invalid', expectedPage: NaN, expectedLimit: NaN },
        { page: '5', limit: '25', expectedPage: 5, expectedLimit: 25 }
      ]

      for (const testCase of testCases) {
        jest.clearAllMocks()
        
        const request = createTeamRequest(teamId, 'fixtures', {
          queryParams: {
            page: testCase.page,
            limit: testCase.limit
          }
        })

        mockTeamDataFetcher.getFixtures.mockResolvedValue({
          docs: [],
          meta: { pagination: {} },
          nextMatch: null
        })

        await executeEndpoint(teamFixturesEndpoint, request)

        expect(mockTeamDataFetcher.getFixtures).toHaveBeenCalledWith(teamId, {
          page: testCase.expectedPage,
          limit: testCase.expectedLimit,
          type: 'auto',
          includeNextMatch: false
        })
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

      const response = await executeEndpoint(teamFixturesEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })
  })
})