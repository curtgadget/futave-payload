import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createTeamRequest,
  executeEndpoint,
  apiTestSetup,
  teamEndpointAssertions,
  mockTeamDataFetcher,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import teamTableEndpoint from '../../teamTable'

describe('Team Table API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/team/:id/table', () => {
    it('should have correct endpoint configuration', () => {
      expect(teamTableEndpoint.path).toBe('/v1/team/:id/table')
      expect(teamTableEndpoint.method).toBe('get')
      expect(typeof teamTableEndpoint.handler).toBe('function')
    })

    it('should return team table data successfully', async () => {
      const teamId = '123'
      const mockTableData = {
        '20': {
          id: 1,
          name: 'Premier League',
          type: 'league',
          league_id: 8,
          season_id: 20,
          stage_id: null,
          stage_name: null,
          standings: [
            {
              id: 1,
              name: 'Premier League Table',
              type: 'league',
              stage_id: null,
              stage_name: null,
              group_id: null,
              group_name: null,
              standings: [
                {
                  position: 1,
                  team_id: 85,
                  team_name: 'Manchester City',
                  team_logo_path: 'https://example.com/mancity.png',
                  points: 75,
                  played: 30,
                  won: 23,
                  draw: 6,
                  lost: 1,
                  goals_for: 78,
                  goals_against: 25,
                  goal_difference: 53,
                  form: 'WWWWW',
                  current_streak: 'W5',
                  clean_sheets: 18,
                  failed_to_score: 2,
                  qualification_status: {
                    type: 'champions_league',
                    name: 'Champions League Qualification',
                    color: '#1E3A8A'
                  }
                },
                {
                  position: 5,
                  team_id: 123,
                  team_name: 'Test Team',
                  team_logo_path: 'https://example.com/testteam.png',
                  points: 45,
                  played: 30,
                  won: 12,
                  draw: 9,
                  lost: 9,
                  goals_for: 42,
                  goals_against: 38,
                  goal_difference: 4,
                  form: 'WLDWL',
                  current_streak: 'L1',
                  clean_sheets: 8,
                  failed_to_score: 6,
                  qualification_status: null
                }
              ]
            }
          ]
        },
        '19': {
          id: 2,
          name: 'Premier League',
          type: 'league', 
          league_id: 8,
          season_id: 19,
          stage_id: null,
          stage_name: null,
          standings: [
            {
              id: 2,
              name: 'Premier League Table',
              type: 'league',
              stage_id: null,
              stage_name: null,
              group_id: null,
              group_name: null,
              standings: [
                {
                  position: 8,
                  team_id: 123,
                  team_name: 'Test Team',
                  team_logo_path: 'https://example.com/testteam.png',
                  points: 52,
                  played: 38,
                  won: 14,
                  draw: 10,
                  lost: 14,
                  goals_for: 48,
                  goals_against: 52,
                  goal_difference: -4,
                  form: 'DLWLL',
                  current_streak: 'L2',
                  clean_sheets: 12,
                  failed_to_score: 8,
                  qualification_status: null
                }
              ]
            }
          ]
        }
      }

      mockTeamDataFetcher.getTable.mockResolvedValue(mockTableData)

      const request = createTeamRequest(teamId, 'table')
      const response = await executeEndpoint(teamTableEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertTableResponse(response)

      // Verify specific data structure
      expect(response.data).toHaveProperty('20')
      expect(response.data).toHaveProperty('19')

      // Verify season 20 data
      const season20 = response.data['20']
      expect(season20.id).toBe(1)
      expect(season20.name).toBe('Premier League')
      expect(season20.league_id).toBe(8)
      expect(season20.season_id).toBe(20)
      expect(Array.isArray(season20.standings)).toBe(true)
      expect(season20.standings).toHaveLength(1)

      // Verify standings table structure
      const standingsTable = season20.standings[0]
      expect(standingsTable.id).toBe(1)
      expect(standingsTable.name).toBe('Premier League Table')
      expect(Array.isArray(standingsTable.standings)).toBe(true)
      expect(standingsTable.standings).toHaveLength(2)

      // Verify individual team standing
      const teamStanding = standingsTable.standings.find((team: any) => team.team_id === 123)
      expect(teamStanding).toBeDefined()
      expect(teamStanding.position).toBe(5)
      expect(teamStanding.team_name).toBe('Test Team')
      expect(teamStanding.points).toBe(45)
      expect(teamStanding.played).toBe(30)
      expect(teamStanding.goal_difference).toBe(4)
    })

    it('should handle missing team ID in URL', async () => {
      const request = createTeamRequest('', 'table')
      const response = await executeEndpoint(teamTableEndpoint, request)

      response.expectStatus(400).expectError('Team ID is required')
    })

    it('should handle data fetcher errors gracefully', async () => {
      const teamId = '123'
      
      mockTeamDataFetcher.getTable.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createTeamRequest(teamId, 'table')
      const response = await executeEndpoint(teamTableEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching team table')
    })

    it('should handle empty table data', async () => {
      const teamId = '456'
      
      mockTeamDataFetcher.getTable.mockResolvedValue({})

      const request = createTeamRequest(teamId, 'table')
      const response = await executeEndpoint(teamTableEndpoint, request)

      response.expectStatus(200).expectSuccess()
      expect(response.data).toEqual({})
    })

    it('should handle single season table data', async () => {
      const teamId = '789'
      const singleSeasonData = {
        '20': {
          id: 1,
          name: 'Championship',
          type: 'league',
          league_id: 9,
          season_id: 20,
          stage_id: null,
          stage_name: null,
          standings: [
            {
              id: 1,
              name: 'Championship Table',
              type: 'league',
              stage_id: null,
              stage_name: null,
              group_id: null,
              group_name: null,
              standings: [
                {
                  position: 3,
                  team_id: 789,
                  team_name: 'Championship Team',
                  team_logo_path: 'https://example.com/championship.png',
                  points: 65,
                  played: 35,
                  won: 19,
                  draw: 8,
                  lost: 8,
                  goals_for: 58,
                  goals_against: 35,
                  goal_difference: 23,
                  form: 'WWDWL',
                  current_streak: 'L1',
                  clean_sheets: 15,
                  failed_to_score: 4,
                  qualification_status: {
                    type: 'promotion_playoff',
                    name: 'Promotion Playoff',
                    color: '#059669'
                  }
                }
              ]
            }
          ]
        }
      }

      mockTeamDataFetcher.getTable.mockResolvedValue(singleSeasonData)

      const request = createTeamRequest(teamId, 'table')
      const response = await executeEndpoint(teamTableEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Should only have one season
      expect(Object.keys(response.data)).toHaveLength(1)
      expect(response.data).toHaveProperty('20')
      
      const season = response.data['20']
      expect(season.name).toBe('Championship')
      expect(season.league_id).toBe(9)
    })

    it('should handle team with multiple competition standings', async () => {
      const teamId = '999'
      const multiCompetitionData = {
        '20': {
          id: 1,
          name: 'Premier League',
          type: 'league',
          league_id: 8,
          season_id: 20,
          stage_id: null,
          stage_name: null,
          standings: [
            {
              id: 1,
              name: 'Premier League Table',
              type: 'league',
              stage_id: null,
              stage_name: null,
              group_id: null,
              group_name: null,
              standings: [
                {
                  position: 2,
                  team_id: 999,
                  team_name: 'Multi Comp Team',
                  points: 70,
                  played: 30,
                  won: 21,
                  draw: 7,
                  lost: 2,
                  goals_for: 65,
                  goals_against: 22,
                  goal_difference: 43,
                }
              ]
            },
            {
              id: 2,
              name: 'Champions League Group A',
              type: 'group',
              stage_id: 100,
              stage_name: 'Group Stage',
              group_id: 1,
              group_name: 'Group A',
              standings: [
                {
                  position: 1,
                  team_id: 999,
                  team_name: 'Multi Comp Team',
                  points: 12,
                  played: 6,
                  won: 4,
                  draw: 0,
                  lost: 2,
                  goals_for: 15,
                  goals_against: 8,
                  goal_difference: 7,
                }
              ]
            }
          ]
        }
      }

      mockTeamDataFetcher.getTable.mockResolvedValue(multiCompetitionData)

      const request = createTeamRequest(teamId, 'table')
      const response = await executeEndpoint(teamTableEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      const season = response.data['20']
      expect(season.standings).toHaveLength(2)
      
      // Verify different competition types
      const leagueTable = season.standings.find((s: any) => s.type === 'league')
      const groupTable = season.standings.find((s: any) => s.type === 'group')
      
      expect(leagueTable).toBeDefined()
      expect(groupTable).toBeDefined()
      expect(groupTable.group_id).toBe(1)
      expect(groupTable.group_name).toBe('Group A')
    })

    it('should handle various qualification statuses', async () => {
      const teamId = '555'
      const qualificationData = {
        '20': {
          id: 1,
          name: 'Premier League',
          type: 'league',
          league_id: 8,
          season_id: 20,
          stage_id: null,
          stage_name: null,
          standings: [
            {
              id: 1,
              name: 'Premier League Table',
              type: 'league',
              stage_id: null,
              stage_name: null,
              group_id: null,
              group_name: null,
              standings: [
                {
                  position: 18,
                  team_id: 555,
                  team_name: 'Relegation Team',
                  points: 25,
                  played: 30,
                  won: 6,
                  draw: 7,
                  lost: 17,
                  goals_for: 28,
                  goals_against: 55,
                  goal_difference: -27,
                  qualification_status: {
                    type: 'relegation',
                    name: 'Relegation Zone',
                    color: '#DC2626'
                  }
                }
              ]
            }
          ]
        }
      }

      mockTeamDataFetcher.getTable.mockResolvedValue(qualificationData)

      const request = createTeamRequest(teamId, 'table')
      const response = await executeEndpoint(teamTableEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      const teamStanding = response.data['20'].standings[0].standings[0]
      expect(teamStanding.qualification_status).toEqual({
        type: 'relegation',
        name: 'Relegation Zone',
        color: '#DC2626'
      })
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

      const response = await executeEndpoint(teamTableEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })
  })
})