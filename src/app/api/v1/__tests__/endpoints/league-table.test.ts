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
import leagueTableEndpoint from '../../leagueTable'

describe('League Table API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/league/:id/table', () => {
    it('should have correct endpoint configuration', () => {
      expect(leagueTableEndpoint.path).toBe('/v1/league/:id/table')
      expect(leagueTableEndpoint.method).toBe('get')
      expect(typeof leagueTableEndpoint.handler).toBe('function')
    })

    it('should return league table data successfully with default parameters', async () => {
      const leagueId = '8'
      const mockTableData = {
        '20': {
          id: 8,
          name: 'Premier League',
          type: 'league',
          league_id: 8,
          season_id: 20,
          stage_id: null,
          stage_name: null,
          standings: [
            {
              id: 1,
              name: 'Overall',
              type: 'overall',
              standings: [
                {
                  position: 1,
                  team_id: 1,
                  team_name: 'Manchester City',
                  team_logo_path: 'man-city-logo.png',
                  played: 30,
                  won: 22,
                  drawn: 5,
                  lost: 3,
                  goals_for: 70,
                  goals_against: 25,
                  goal_difference: 45,
                  points: 71,
                  form: 'WWDWW',
                  qualification_status: {
                    type: 'champions_league',
                    description: 'UEFA Champions League'
                  }
                },
                {
                  position: 20,
                  team_id: 20,
                  team_name: 'Sheffield United',
                  team_logo_path: 'sheffield-logo.png',
                  played: 30,
                  won: 5,
                  drawn: 5,
                  lost: 20,
                  goals_for: 25,
                  goals_against: 70,
                  goal_difference: -45,
                  points: 20,
                  form: 'LLLLD',
                  qualification_status: {
                    type: 'relegation',
                    description: 'Relegation to Championship'
                  }
                }
              ]
            }
          ]
        }
      }

      mockLeagueDataFetcher.getStandings.mockResolvedValue(mockTableData)

      const request = createLeagueRequest(leagueId, 'table')
      const response = await executeEndpoint(leagueTableEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertStandingsResponse(response)

      // Verify specific data
      expect(response.data['20']).toBeDefined()
      expect(response.data['20'].id).toBe(8)
      expect(response.data['20'].name).toBe('Premier League')
      expect(response.data['20'].standings).toHaveLength(1)
      expect(response.data['20'].standings[0].standings).toHaveLength(2)

      // Verify team data
      const firstTeam = response.data['20'].standings[0].standings[0]
      expect(firstTeam.position).toBe(1)
      expect(firstTeam.team_name).toBe('Manchester City')
      expect(firstTeam.points).toBe(71)
      expect(firstTeam.qualification_status.type).toBe('champions_league')

      const lastTeam = response.data['20'].standings[0].standings[1]
      expect(lastTeam.position).toBe(20)
      expect(lastTeam.team_name).toBe('Sheffield United')
      expect(lastTeam.points).toBe(20)
      expect(lastTeam.qualification_status.type).toBe('relegation')

      // Verify fetcher was called with correct parameters
      expect(mockLeagueDataFetcher.getStandings).toHaveBeenCalledWith(leagueId, undefined)
    })

    it('should handle season_id query parameter correctly', async () => {
      const leagueId = '8'
      const seasonId = '19'
      
      const request = createLeagueRequest(leagueId, 'table', {
        queryParams: { season_id: seasonId }
      })

      const mockPreviousSeasonData = {
        '19': {
          id: 8,
          name: 'Premier League',
          type: 'league',
          league_id: 8,
          season_id: 19,
          stage_id: null,
          stage_name: null,
          standings: [
            {
              id: 1,
              name: 'Overall',
              type: 'overall',
              standings: []
            }
          ]
        }
      }

      mockLeagueDataFetcher.getStandings.mockResolvedValue(mockPreviousSeasonData)

      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with season ID
      expect(mockLeagueDataFetcher.getStandings).toHaveBeenCalledWith(leagueId, seasonId)
      expect(response.data['19']).toBeDefined()
      expect(response.data['19'].season_id).toBe(19)
    })

    it('should handle missing league ID in URL', async () => {
      // Create a request with a malformed URL that will result in missing ID
      const request = {
        url: 'http://localhost:3000/table', // Will result in pathParts[length-2] = undefined
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

      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(400).expectError('League ID is required')
    })

    it('should handle invalid league ID format', async () => {
      const leagueId = 'invalid'
      
      mockLeagueDataFetcher.getStandings.mockRejectedValue(new Error('Invalid league ID format'))
      
      const request = createLeagueRequest(leagueId, 'table')
      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(400).expectError('Invalid league ID format')
    })

    it('should handle no standings data available for season', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getStandings.mockRejectedValue(
        new Error('No standings data available for season 25. Available seasons: 20, 19')
      )
      
      const request = createLeagueRequest(leagueId, 'table', {
        queryParams: { season_id: '25' }
      })
      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(400).expectError('No standings data available for season')
    })

    it('should handle no current season available', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getStandings.mockRejectedValue(new Error('No current season available for this league and no standings data found'))
      
      const request = createLeagueRequest(leagueId, 'table')
      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(404).expectError('No current season available')
    })

    it('should handle league not found error', async () => {
      const leagueId = '999'
      
      mockLeagueDataFetcher.getStandings.mockRejectedValue(new Error('No league found with ID: 999'))
      
      const request = createLeagueRequest(leagueId, 'table')
      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(404).expectError('League not found')
    })

    it('should handle invalid league data error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getStandings.mockRejectedValue(new Error('Invalid league data structure'))
      
      const request = createLeagueRequest(leagueId, 'table')
      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(500).expectError('Invalid league data structure')
    })

    it('should handle general data fetcher errors gracefully', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getStandings.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createLeagueRequest(leagueId, 'table')
      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching league table')
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

      const response = await executeEndpoint(leagueTableEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should handle complex league structure with multiple groups', async () => {
      const leagueId = '15' // Example: Champions League
      const mockComplexTableData = {
        '20': {
          id: 15,
          name: 'UEFA Champions League',
          type: 'knockout',
          league_id: 15,
          season_id: 20,
          stage_id: 123,
          stage_name: 'Group Stage',
          standings: [
            {
              id: 1,
              name: 'Group A',
              type: 'group',
              standings: [
                {
                  position: 1,
                  team_id: 1,
                  team_name: 'Real Madrid',
                  team_logo_path: 'real-madrid-logo.png',
                  played: 6,
                  won: 4,
                  drawn: 2,
                  lost: 0,
                  goals_for: 12,
                  goals_against: 4,
                  goal_difference: 8,
                  points: 14,
                  form: 'WDWWW',
                  qualification_status: {
                    type: 'qualification',
                    description: 'Qualified for Round of 16'
                  }
                }
              ]
            },
            {
              id: 2,
              name: 'Group B',
              type: 'group',
              standings: [
                {
                  position: 1,
                  team_id: 2,
                  team_name: 'Barcelona',
                  team_logo_path: 'barcelona-logo.png',
                  played: 6,
                  won: 5,
                  drawn: 1,
                  lost: 0,
                  goals_for: 15,
                  goals_against: 3,
                  goal_difference: 12,
                  points: 16,
                  form: 'WWWDW',
                  qualification_status: {
                    type: 'qualification',
                    description: 'Qualified for Round of 16'
                  }
                }
              ]
            }
          ]
        }
      }

      mockLeagueDataFetcher.getStandings.mockResolvedValue(mockComplexTableData)

      const request = createLeagueRequest(leagueId, 'table')
      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertStandingsResponse(response)

      // Verify complex structure
      expect(response.data['20'].standings).toHaveLength(2)
      expect(response.data['20'].standings[0].name).toBe('Group A')
      expect(response.data['20'].standings[1].name).toBe('Group B')
      expect(response.data['20'].stage_name).toBe('Group Stage')
      
      // Verify team data in both groups
      expect(response.data['20'].standings[0].standings[0].team_name).toBe('Real Madrid')
      expect(response.data['20'].standings[1].standings[0].team_name).toBe('Barcelona')
    })

    it('should handle empty standings data', async () => {
      const leagueId = '8'
      
      const mockEmptyTableData = {
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
      }

      mockLeagueDataFetcher.getStandings.mockResolvedValue(mockEmptyTableData)

      const request = createLeagueRequest(leagueId, 'table')
      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertStandingsResponse(response)
      
      expect(response.data['20'].standings).toEqual([])
    })

    it('should handle multiple seasons in response', async () => {
      const leagueId = '8'
      
      const mockMultiSeasonData = {
        '20': {
          id: 8,
          name: 'Premier League',
          type: 'league',
          league_id: 8,
          season_id: 20,
          stage_id: null,
          stage_name: null,
          standings: [
            {
              id: 1,
              name: 'Overall',
              type: 'overall',
              standings: [
                {
                  position: 1,
                  team_id: 1,
                  team_name: 'Manchester City',
                  team_logo_path: 'man-city-logo.png',
                  played: 30,
                  points: 71
                }
              ]
            }
          ]
        },
        '19': {
          id: 8,
          name: 'Premier League',
          type: 'league',
          league_id: 8,
          season_id: 19,
          stage_id: null,
          stage_name: null,
          standings: [
            {
              id: 1,
              name: 'Overall',
              type: 'overall',
              standings: [
                {
                  position: 1,
                  team_id: 2,
                  team_name: 'Liverpool',
                  team_logo_path: 'liverpool-logo.png',
                  played: 38,
                  points: 99
                }
              ]
            }
          ]
        }
      }

      mockLeagueDataFetcher.getStandings.mockResolvedValue(mockMultiSeasonData)

      const request = createLeagueRequest(leagueId, 'table')
      const response = await executeEndpoint(leagueTableEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertStandingsResponse(response)

      // Verify both seasons are present
      expect(response.data['20']).toBeDefined()
      expect(response.data['19']).toBeDefined()
      expect(response.data['20'].standings[0].standings[0].team_name).toBe('Manchester City')
      expect(response.data['19'].standings[0].standings[0].team_name).toBe('Liverpool')
    })
  })
})