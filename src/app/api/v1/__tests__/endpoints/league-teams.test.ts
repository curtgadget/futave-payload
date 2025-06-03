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
import leagueTeamsEndpoint from '../../leagueTeams'

describe('League Teams API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/league/:id/teams', () => {
    it('should have correct endpoint configuration', () => {
      expect(leagueTeamsEndpoint.path).toBe('/v1/league/:id/teams')
      expect(leagueTeamsEndpoint.method).toBe('get')
      expect(typeof leagueTeamsEndpoint.handler).toBe('function')
    })

    it('should return league teams data successfully with default parameters', async () => {
      const leagueId = '8'
      const mockTeamsData = {
        id: '8',
        name: 'Premier League',
        teams: [
          {
            id: '1',
            name: 'Manchester City',
            logo: 'https://example.com/man-city-logo.png',
            venue_name: 'Etihad Stadium',
            founded: 1880
          },
          {
            id: '2',
            name: 'Arsenal',
            logo: 'https://example.com/arsenal-logo.png',
            venue_name: 'Emirates Stadium',
            founded: 1886
          },
          {
            id: '3',
            name: 'Chelsea',
            logo: 'https://example.com/chelsea-logo.png',
            venue_name: 'Stamford Bridge',
            founded: 1905
          }
        ],
        pagination: {
          page: 1,
          limit: 50,
          totalItems: 20,
          totalPages: 1
        }
      }

      mockLeagueDataFetcher.getTeams.mockResolvedValue(mockTeamsData)

      const request = createLeagueRequest(leagueId, 'teams')
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertTeamsResponse(response)

      // Verify specific data
      expect(response.data.id).toBe(leagueId)
      expect(response.data.name).toBe('Premier League')
      expect(response.data.teams).toHaveLength(3)
      expect(response.data.pagination.page).toBe(1)
      expect(response.data.pagination.limit).toBe(50)
      expect(response.data.pagination.totalItems).toBe(20)
      expect(response.data.pagination.totalPages).toBe(1)

      // Verify team data
      const firstTeam = response.data.teams[0]
      expect(firstTeam.id).toBe('1')
      expect(firstTeam.name).toBe('Manchester City')
      expect(firstTeam.logo).toBe('https://example.com/man-city-logo.png')
      expect(firstTeam.venue_name).toBe('Etihad Stadium')
      expect(firstTeam.founded).toBe(1880)

      // Verify fetcher was called with correct parameters
      expect(mockLeagueDataFetcher.getTeams).toHaveBeenCalledWith(leagueId, 1, 50)
    })

    it('should handle pagination query parameters correctly', async () => {
      const leagueId = '8'
      
      const request = createLeagueRequest(leagueId, 'teams', {
        queryParams: {
          page: '2',
          limit: '25'
        }
      })

      mockLeagueDataFetcher.getTeams.mockResolvedValue({
        id: '8',
        name: 'Premier League',
        teams: [],
        pagination: {
          page: 2,
          limit: 25,
          totalItems: 20,
          totalPages: 1
        }
      })

      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with parsed parameters
      expect(mockLeagueDataFetcher.getTeams).toHaveBeenCalledWith(leagueId, 2, 25)
      expect(response.data.pagination.page).toBe(2)
      expect(response.data.pagination.limit).toBe(25)
    })

    it('should handle missing league ID in URL', async () => {
      // Create a request with a malformed URL that will result in missing ID
      const request = {
        url: 'http://localhost:3000/teams', // Will result in pathParts[length-2] = undefined
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

      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(400).expectError('League ID is required')
    })

    it('should handle invalid league ID format', async () => {
      const leagueId = 'invalid'
      
      mockLeagueDataFetcher.getTeams.mockRejectedValue(new Error('Invalid league ID format'))
      
      const request = createLeagueRequest(leagueId, 'teams')
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(400).expectError('Invalid league ID format')
    })

    it('should handle league not found error', async () => {
      const leagueId = '999'
      
      mockLeagueDataFetcher.getTeams.mockRejectedValue(new Error('No league found with ID: 999'))
      
      const request = createLeagueRequest(leagueId, 'teams')
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(404).expectError('League not found')
    })

    it('should handle invalid league data error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getTeams.mockRejectedValue(new Error('Invalid league data structure'))
      
      const request = createLeagueRequest(leagueId, 'teams')
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(500).expectError('Invalid league data structure')
    })

    it('should handle general data fetcher errors gracefully', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getTeams.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createLeagueRequest(leagueId, 'teams')
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching league teams')
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

      const response = await executeEndpoint(leagueTeamsEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should handle empty teams data', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getTeams.mockResolvedValue({
        id: '8',
        name: 'Premier League',
        teams: [],
        pagination: {
          page: 1,
          limit: 50,
          totalItems: 0,
          totalPages: 0
        }
      })

      const request = createLeagueRequest(leagueId, 'teams')
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertTeamsResponse(response)
      
      expect(response.data.teams).toEqual([])
      expect(response.data.pagination.totalItems).toBe(0)
      expect(response.data.pagination.totalPages).toBe(0)
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
        
        const request = createLeagueRequest(leagueId, 'teams', {
          queryParams: {
            page: testCase.page,
            limit: testCase.limit
          }
        })

        mockLeagueDataFetcher.getTeams.mockResolvedValue({
          id: '8',
          name: 'Premier League',
          teams: [],
          pagination: {
            page: testCase.expectedPage,
            limit: testCase.expectedLimit,
            totalItems: 0,
            totalPages: 0
          }
        })

        await executeEndpoint(leagueTeamsEndpoint, request)

        expect(mockLeagueDataFetcher.getTeams).toHaveBeenCalledWith(
          leagueId,
          testCase.expectedPage,
          testCase.expectedLimit
        )
      }
    })

    it('should return teams with complete team information', async () => {
      const leagueId = '8'
      
      const mockCompleteTeamsData = {
        id: '8',
        name: 'Premier League',
        teams: [
          {
            id: '1',
            name: 'Manchester City',
            logo: 'https://example.com/man-city-logo.png',
            venue_name: 'Etihad Stadium',
            founded: 1880
          },
          {
            id: '2',
            name: 'Arsenal',
            logo: 'https://example.com/arsenal-logo.png',
            venue_name: 'Emirates Stadium',
            founded: 1886
          },
          {
            id: '3',
            name: 'Chelsea',
            logo: 'https://example.com/chelsea-logo.png',
            venue_name: 'Stamford Bridge',
            founded: 1905
          },
          {
            id: '4',
            name: 'Liverpool',
            logo: 'https://example.com/liverpool-logo.png',
            venue_name: 'Anfield',
            founded: 1892
          },
          {
            id: '5',
            name: 'Manchester United',
            logo: 'https://example.com/man-utd-logo.png',
            venue_name: 'Old Trafford',
            founded: 1878
          }
        ],
        pagination: {
          page: 1,
          limit: 50,
          totalItems: 20,
          totalPages: 1
        }
      }

      mockLeagueDataFetcher.getTeams.mockResolvedValue(mockCompleteTeamsData)

      const request = createLeagueRequest(leagueId, 'teams')
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertTeamsResponse(response)

      // Verify all teams are present with complete data
      expect(response.data.teams).toHaveLength(5)
      
      // Check each team has all required fields
      response.data.teams.forEach((team: any) => {
        expect(team).toHaveProperty('id')
        expect(team).toHaveProperty('name')
        expect(team).toHaveProperty('logo')
        expect(team).toHaveProperty('venue_name')
        expect(team).toHaveProperty('founded')
        expect(typeof team.id).toBe('string')
        expect(typeof team.name).toBe('string')
        expect(typeof team.founded).toBe('number')
      })

      // Verify specific team data
      const manCity = response.data.teams.find((team: any) => team.name === 'Manchester City')
      expect(manCity.venue_name).toBe('Etihad Stadium')
      expect(manCity.founded).toBe(1880)

      const arsenal = response.data.teams.find((team: any) => team.name === 'Arsenal')
      expect(arsenal.venue_name).toBe('Emirates Stadium')
      expect(arsenal.founded).toBe(1886)
    })

    it('should handle teams with partial information', async () => {
      const leagueId = '8'
      
      const mockPartialTeamsData = {
        id: '8',
        name: 'Premier League',
        teams: [
          {
            id: '1',
            name: 'Manchester City',
            logo: 'https://example.com/man-city-logo.png',
            venue_name: 'Etihad Stadium',
            founded: 1880
          },
          {
            id: '2',
            name: 'New Team',
            logo: undefined, // Missing logo
            venue_name: undefined, // Missing venue
            founded: undefined // Missing founded year
          }
        ],
        pagination: {
          page: 1,
          limit: 50,
          totalItems: 2,
          totalPages: 1
        }
      }

      mockLeagueDataFetcher.getTeams.mockResolvedValue(mockPartialTeamsData)

      const request = createLeagueRequest(leagueId, 'teams')
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertTeamsResponse(response)

      // Verify teams with partial data are handled correctly
      expect(response.data.teams).toHaveLength(2)
      
      const completeTeam = response.data.teams[0]
      expect(completeTeam.name).toBe('Manchester City')
      expect(completeTeam.logo).toBe('https://example.com/man-city-logo.png')
      expect(completeTeam.venue_name).toBe('Etihad Stadium')
      expect(completeTeam.founded).toBe(1880)
      
      const partialTeam = response.data.teams[1]
      expect(partialTeam.name).toBe('New Team')
      expect(partialTeam.logo).toBeUndefined()
      expect(partialTeam.venue_name).toBeUndefined()
      expect(partialTeam.founded).toBeUndefined()
    })

    it('should handle large league with pagination', async () => {
      const leagueId = '15' // Champions League with many teams
      
      const mockLargeLeagueData = {
        id: '15',
        name: 'UEFA Champions League',
        teams: Array.from({ length: 32 }, (_, i) => ({
          id: String(i + 1),
          name: `Team ${i + 1}`,
          logo: `https://example.com/team-${i + 1}-logo.png`,
          venue_name: `Stadium ${i + 1}`,
          founded: 1900 + i
        })),
        pagination: {
          page: 1,
          limit: 50,
          totalItems: 32,
          totalPages: 1
        }
      }

      mockLeagueDataFetcher.getTeams.mockResolvedValue(mockLargeLeagueData)

      const request = createLeagueRequest(leagueId, 'teams')
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertTeamsResponse(response)

      // Verify large dataset is handled correctly
      expect(response.data.teams).toHaveLength(32)
      expect(response.data.pagination.totalItems).toBe(32)
      expect(response.data.pagination.totalPages).toBe(1)
      
      // Verify first and last teams
      expect(response.data.teams[0].name).toBe('Team 1')
      expect(response.data.teams[31].name).toBe('Team 32')
    })

    it('should handle pagination across multiple pages', async () => {
      const leagueId = '8'
      
      // Test first page
      const mockFirstPageData = {
        id: '8',
        name: 'Premier League',
        teams: Array.from({ length: 10 }, (_, i) => ({
          id: String(i + 1),
          name: `Team ${i + 1}`,
          logo: `https://example.com/team-${i + 1}-logo.png`,
          venue_name: `Stadium ${i + 1}`,
          founded: 1900 + i
        })),
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 20,
          totalPages: 2
        }
      }

      mockLeagueDataFetcher.getTeams.mockResolvedValue(mockFirstPageData)

      const request = createLeagueRequest(leagueId, 'teams', {
        queryParams: { page: '1', limit: '10' }
      })
      const response = await executeEndpoint(leagueTeamsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertTeamsResponse(response)

      expect(response.data.teams).toHaveLength(10)
      expect(response.data.pagination.page).toBe(1)
      expect(response.data.pagination.totalPages).toBe(2)
      expect(response.data.teams[0].name).toBe('Team 1')
      expect(response.data.teams[9].name).toBe('Team 10')
    })
  })
})