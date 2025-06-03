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
import leagueOverviewEndpoint from '../../leagueOverview'

describe('League Overview API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/league/:id/overview', () => {
    it('should have correct endpoint configuration', () => {
      expect(leagueOverviewEndpoint.path).toBe('/v1/league/:id/overview')
      expect(leagueOverviewEndpoint.method).toBe('get')
      expect(typeof leagueOverviewEndpoint.handler).toBe('function')
    })

    it('should return league overview data successfully with default parameters', async () => {
      const leagueId = '8'
      const mockOverviewData = mockLeagueData.overview

      mockLeagueDataFetcher.getOverview.mockResolvedValue(mockOverviewData)

      const request = createLeagueRequest(leagueId, 'overview')
      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertOverviewResponse(response)

      // Verify specific data
      expect(response.data.id).toBe(leagueId)
      expect(response.data.name).toBe('Premier League')
      expect(response.data.season_id).toBe(20)
      expect(response.data.season_name).toBe('2023-24')
      expect(response.data.seasons).toHaveLength(2)
      expect(response.data.metadata.total_teams).toBe(20)

      // Verify fetcher was called with correct parameters
      expect(mockLeagueDataFetcher.getOverview).toHaveBeenCalledWith(leagueId, undefined)
    })

    it('should handle season_id query parameter correctly', async () => {
      const leagueId = '8'
      const seasonId = '19'
      
      const request = createLeagueRequest(leagueId, 'overview', {
        queryParams: { season_id: seasonId }
      })

      mockLeagueDataFetcher.getOverview.mockResolvedValue({
        ...mockLeagueData.overview,
        season_id: 19,
        season_name: '2022-23'
      })

      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with season ID
      expect(mockLeagueDataFetcher.getOverview).toHaveBeenCalledWith(leagueId, seasonId)
      expect(response.data.season_id).toBe(19)
      expect(response.data.season_name).toBe('2022-23')
    })

    it('should handle missing league ID in URL', async () => {
      // Create a request with a minimal URL that will result in undefined ID
      const request = {
        url: 'http://localhost:3000/overview', // Will result in pathParts[length-2] = undefined
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

      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(400).expectError('League ID is required')
    })

    it('should handle invalid league ID format', async () => {
      const leagueId = 'invalid'
      
      mockLeagueDataFetcher.getOverview.mockRejectedValue(new Error('Invalid league ID format'))
      
      const request = createLeagueRequest(leagueId, 'overview')
      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(400).expectError('Invalid league ID format')
    })

    it('should handle league not found error', async () => {
      const leagueId = '999'
      
      mockLeagueDataFetcher.getOverview.mockRejectedValue(new Error('No league found with ID: 999'))
      
      const request = createLeagueRequest(leagueId, 'overview')
      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(404).expectError('League not found')
    })

    it('should handle invalid season ID format error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getOverview.mockRejectedValue(new Error('Invalid season ID format'))
      
      const request = createLeagueRequest(leagueId, 'overview', {
        queryParams: { season_id: 'invalid' }
      })
      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(400).expectError('Invalid season ID format')
    })

    it('should handle season not found error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getOverview.mockRejectedValue(new Error('Season 999 not found. Available seasons: 20, 19'))
      
      const request = createLeagueRequest(leagueId, 'overview', {
        queryParams: { season_id: '999' }
      })
      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(400).expectError('Season 999 not found')
    })

    it('should handle no season available error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getOverview.mockRejectedValue(new Error('No season available for this league'))
      
      const request = createLeagueRequest(leagueId, 'overview')
      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(404).expectError('No season available')
    })

    it('should handle invalid league data error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getOverview.mockRejectedValue(new Error('Invalid league data structure'))
      
      const request = createLeagueRequest(leagueId, 'overview')
      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(500).expectError('Invalid league data structure')
    })

    it('should handle general data fetcher errors gracefully', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getOverview.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createLeagueRequest(leagueId, 'overview')
      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching league overview')
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

      const response = await executeEndpoint(leagueOverviewEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should return overview with complete data structure', async () => {
      const leagueId = '8'
      const mockCompleteOverviewData = {
        ...mockLeagueData.overview,
        table_summary: {
          top_teams: [
            {
              id: '1',
              name: 'Manchester City',
              logo: 'https://example.com/man-city-logo.png',
              position: 1,
              points: 80,
              played: 30,
              goal_difference: 45,
              form: ['W', 'W', 'D', 'W', 'W'],
              qualification_status: { type: 'champions_league' }
            }
          ],
          promotion_teams: [],
          relegation_teams: [
            {
              id: '20',
              name: 'Sheffield United',
              logo: 'https://example.com/sheffield-logo.png',
              position: 20,
              points: 15,
              played: 30,
              goal_difference: -45,
              form: ['L', 'L', 'L', 'D', 'L'],
              qualification_status: { type: 'relegation' }
            }
          ]
        },
        upcoming_matches: [
          {
            id: '12345',
            starting_at: '2024-02-01T15:00:00Z',
            starting_at_timestamp: 1706796000,
            home_team: { id: 1, name: 'Arsenal', image_path: 'arsenal.png' },
            away_team: { id: 2, name: 'Chelsea', image_path: 'chelsea.png' },
            state: 'upcoming'
          }
        ],
        recent_results: [
          {
            id: '12344',
            starting_at: '2024-01-28T15:00:00Z',
            starting_at_timestamp: 1706450400,
            home_team: { id: 3, name: 'Liverpool', image_path: 'liverpool.png' },
            away_team: { id: 4, name: 'Manchester United', image_path: 'man-utd.png' },
            state: 'finished',
            final_score: { home: 2, away: 1 }
          }
        ],
        stats_summary: {
          top_scorers: [
            {
              player_id: '100',
              name: 'Erling Haaland',
              team_name: 'Manchester City',
              team_logo: 'man-city-logo.png',
              image_path: 'haaland.png',
              value: 20,
              position: 'Forward'
            }
          ],
          top_assists: [
            {
              player_id: '101',
              name: 'Kevin De Bruyne',
              team_name: 'Manchester City',
              team_logo: 'man-city-logo.png',
              image_path: 'de-bruyne.png',
              value: 15,
              position: 'Midfielder'
            }
          ],
          top_rated: []
        }
      }

      mockLeagueDataFetcher.getOverview.mockResolvedValue(mockCompleteOverviewData)

      const request = createLeagueRequest(leagueId, 'overview')
      const response = await executeEndpoint(leagueOverviewEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertOverviewResponse(response)

      // Verify complete data structure
      expect(response.data.table_summary.top_teams).toHaveLength(1)
      expect(response.data.table_summary.relegation_teams).toHaveLength(1)
      expect(response.data.upcoming_matches).toHaveLength(1)
      expect(response.data.recent_results).toHaveLength(1)
      expect(response.data.stats_summary.top_scorers).toHaveLength(1)
      expect(response.data.stats_summary.top_assists).toHaveLength(1)

      // Verify specific data points
      expect(response.data.table_summary.top_teams[0].name).toBe('Manchester City')
      expect(response.data.table_summary.top_teams[0].position).toBe(1)
      expect(response.data.upcoming_matches[0].home_team.name).toBe('Arsenal')
      expect(response.data.recent_results[0].final_score).toEqual({ home: 2, away: 1 })
      expect(response.data.stats_summary.top_scorers[0].value).toBe(20)
    })
  })
})