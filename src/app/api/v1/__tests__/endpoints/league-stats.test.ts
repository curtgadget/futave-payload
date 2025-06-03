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
import leagueStatsEndpoint from '../../leagueStats'

describe('League Stats API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/league/:id/stats', () => {
    it('should have correct endpoint configuration', () => {
      expect(leagueStatsEndpoint.path).toBe('/v1/league/:id/stats')
      expect(leagueStatsEndpoint.method).toBe('get')
      expect(typeof leagueStatsEndpoint.handler).toBe('function')
    })

    it('should return league stats data successfully with default parameters', async () => {
      const leagueId = '8'
      const mockStatsData = {
        ...mockLeagueData.stats,
        player_stats: {
          top_scorers: {
            category: 'goals',
            label: 'Top Goal Scorers',
            players: [
              {
                player_id: '100',
                name: 'Erling Haaland',
                team_id: '1',
                team_name: 'Manchester City',
                team_logo: 'man-city-logo.png',
                position_id: 25,
                jersey_number: 9,
                image_path: 'haaland.png',
                value: 20,
                appearances: 25,
                rank: 1
              }
            ]
          },
          top_assists: {
            category: 'assists',
            label: 'Most Assists',
            players: [
              {
                player_id: '101',
                name: 'Kevin De Bruyne',
                team_id: '1',
                team_name: 'Manchester City',
                team_logo: 'man-city-logo.png',
                position_id: 20,
                jersey_number: 17,
                image_path: 'de-bruyne.png',
                value: 15,
                appearances: 28,
                rank: 1
              }
            ]
          },
          most_minutes: {
            category: 'minutes',
            label: 'Most Minutes Played',
            players: []
          },
          top_goals_assists: {
            category: 'goals_assists',
            label: 'Goals + Assists',
            players: []
          }
        },
        team_stats: {
          attack: {
            category: 'attack',
            label: 'Goals Scored',
            teams: [
              {
                team_id: '1',
                team_name: 'Manchester City',
                team_logo: 'man-city-logo.png',
                value: 70,
                rank: 1,
                additional_stats: {
                  shots: 450,
                  shots_on_target: 200,
                  corners: 180
                }
              }
            ]
          },
          defense: {
            category: 'defense',
            label: 'Clean Sheets',
            teams: []
          },
          discipline: {
            category: 'discipline',
            label: 'Best Disciplinary Record',
            teams: []
          },
          performance: {
            category: 'performance',
            label: 'Most Wins',
            teams: []
          }
        }
      }

      mockLeagueDataFetcher.getStats.mockResolvedValue(mockStatsData)

      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertStatsResponse(response)

      // Verify specific data
      expect(response.data.id).toBe(leagueId)
      expect(response.data.name).toBe('Premier League')
      expect(response.data.season_id).toBe(20)
      expect(response.data.season_name).toBe('2023-24')
      expect(response.data.seasons).toHaveLength(2)

      // Verify overview stats
      expect(response.data.overview.teams_count).toBe(20)
      expect(response.data.overview.total_players).toBe(500)
      expect(response.data.overview.total_goals).toBe(1000)

      // Verify player stats categories
      expect(response.data.player_stats.top_scorers.players).toHaveLength(1)
      expect(response.data.player_stats.top_scorers.players[0].name).toBe('Erling Haaland')
      expect(response.data.player_stats.top_scorers.players[0].value).toBe(20)

      expect(response.data.player_stats.top_assists.players).toHaveLength(1)
      expect(response.data.player_stats.top_assists.players[0].name).toBe('Kevin De Bruyne')
      expect(response.data.player_stats.top_assists.players[0].value).toBe(15)

      // Verify team stats categories
      expect(response.data.team_stats.attack.teams).toHaveLength(1)
      expect(response.data.team_stats.attack.teams[0].team_name).toBe('Manchester City')
      expect(response.data.team_stats.attack.teams[0].value).toBe(70)

      // Verify fetcher was called with correct parameters
      expect(mockLeagueDataFetcher.getStats).toHaveBeenCalledWith(leagueId, undefined)
    })

    it('should handle season_id query parameter correctly', async () => {
      const leagueId = '8'
      const seasonId = '19'
      
      const request = createLeagueRequest(leagueId, 'stats', {
        queryParams: { season_id: seasonId }
      })

      mockLeagueDataFetcher.getStats.mockResolvedValue({
        ...mockLeagueData.stats,
        season_id: 19,
        season_name: '2022-23'
      })

      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with season ID
      expect(mockLeagueDataFetcher.getStats).toHaveBeenCalledWith(leagueId, seasonId)
      expect(response.data.season_id).toBe(19)
      expect(response.data.season_name).toBe('2022-23')
    })

    it('should handle missing league ID in URL', async () => {
      // Create a request with a malformed URL that will result in missing ID
      const request = {
        url: 'http://localhost:3000/stats', // Will result in pathParts[length-2] = undefined
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

      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(400).expectError('League ID is required')
    })

    it('should handle invalid league ID format', async () => {
      const leagueId = 'invalid'
      
      mockLeagueDataFetcher.getStats.mockRejectedValue(new Error('Invalid league ID format'))
      
      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(400).expectError('Invalid league ID format')
    })

    it('should handle no season specified and no current season available', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getStats.mockRejectedValue(
        new Error('No season specified and no current season available for this league')
      )
      
      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(400).expectError('No season specified and no current season available')
    })

    it('should handle no teams found error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getStats.mockRejectedValue(new Error('No teams found for league 8'))
      
      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(404).expectError('No teams found')
    })

    it('should handle no players found error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getStats.mockRejectedValue(new Error('No players found for teams in league 8'))
      
      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(404).expectError('No players found')
    })

    it('should handle league not found error', async () => {
      const leagueId = '999'
      
      mockLeagueDataFetcher.getStats.mockRejectedValue(new Error('No league found with ID: 999'))
      
      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(404).expectError('League not found')
    })

    it('should handle invalid league data error', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getStats.mockRejectedValue(new Error('Invalid league data structure'))
      
      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(500).expectError('Invalid league data structure')
    })

    it('should handle general data fetcher errors gracefully', async () => {
      const leagueId = '8'
      
      mockLeagueDataFetcher.getStats.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching league stats')
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

      const response = await executeEndpoint(leagueStatsEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should return comprehensive player statistics categories', async () => {
      const leagueId = '8'
      
      const mockComprehensiveStats = {
        ...mockLeagueData.stats,
        player_stats: {
          top_scorers: {
            category: 'goals',
            label: 'Top Goal Scorers',
            players: [
              {
                player_id: '100',
                name: 'Erling Haaland',
                team_id: '1',
                team_name: 'Manchester City',
                team_logo: 'man-city-logo.png',
                position_id: 25,
                jersey_number: 9,
                image_path: 'haaland.png',
                value: 20,
                appearances: 25,
                rank: 1
              },
              {
                player_id: '102',
                name: 'Harry Kane',
                team_id: '2',
                team_name: 'Tottenham',
                team_logo: 'tottenham-logo.png',
                position_id: 25,
                jersey_number: 10,
                image_path: 'kane.png',
                value: 18,
                appearances: 27,
                rank: 2
              }
            ]
          },
          top_assists: {
            category: 'assists',
            label: 'Most Assists',
            players: [
              {
                player_id: '101',
                name: 'Kevin De Bruyne',
                team_id: '1',
                team_name: 'Manchester City',
                team_logo: 'man-city-logo.png',
                position_id: 20,
                jersey_number: 17,
                image_path: 'de-bruyne.png',
                value: 15,
                appearances: 28,
                rank: 1
              }
            ]
          },
          most_minutes: {
            category: 'minutes',
            label: 'Most Minutes Played',
            players: [
              {
                player_id: '103',
                name: 'Virgil van Dijk',
                team_id: '3',
                team_name: 'Liverpool',
                team_logo: 'liverpool-logo.png',
                position_id: 27,
                jersey_number: 4,
                image_path: 'van-dijk.png',
                value: 2520, // 28 full games
                appearances: 28,
                rank: 1
              }
            ]
          },
          top_goals_assists: {
            category: 'goals_assists',
            label: 'Goals + Assists',
            players: [
              {
                player_id: '100',
                name: 'Erling Haaland',
                team_id: '1',
                team_name: 'Manchester City',
                team_logo: 'man-city-logo.png',
                position_id: 25,
                jersey_number: 9,
                image_path: 'haaland.png',
                value: 25, // 20 goals + 5 assists
                appearances: 25,
                rank: 1
              }
            ]
          }
        }
      }

      mockLeagueDataFetcher.getStats.mockResolvedValue(mockComprehensiveStats)

      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertStatsResponse(response)

      // Verify all player stat categories are present
      expect(response.data.player_stats.top_scorers.players).toHaveLength(2)
      expect(response.data.player_stats.top_assists.players).toHaveLength(1)
      expect(response.data.player_stats.most_minutes.players).toHaveLength(1)
      expect(response.data.player_stats.top_goals_assists.players).toHaveLength(1)

      // Verify category labels
      expect(response.data.player_stats.top_scorers.label).toBe('Top Goal Scorers')
      expect(response.data.player_stats.top_assists.label).toBe('Most Assists')
      expect(response.data.player_stats.most_minutes.label).toBe('Most Minutes Played')
      expect(response.data.player_stats.top_goals_assists.label).toBe('Goals + Assists')

      // Verify ranking
      expect(response.data.player_stats.top_scorers.players[0].rank).toBe(1)
      expect(response.data.player_stats.top_scorers.players[1].rank).toBe(2)
    })

    it('should return comprehensive team statistics categories', async () => {
      const leagueId = '8'
      
      const mockComprehensiveTeamStats = {
        ...mockLeagueData.stats,
        team_stats: {
          attack: {
            category: 'attack',
            label: 'Goals Scored',
            teams: [
              {
                team_id: '1',
                team_name: 'Manchester City',
                team_logo: 'man-city-logo.png',
                value: 70,
                rank: 1,
                additional_stats: {
                  shots: 450,
                  shots_on_target: 200,
                  corners: 180
                }
              }
            ]
          },
          defense: {
            category: 'defense',
            label: 'Clean Sheets',
            teams: [
              {
                team_id: '2',
                team_name: 'Arsenal',
                team_logo: 'arsenal-logo.png',
                value: 15,
                rank: 1,
                additional_stats: {
                  goals_against: 20,
                  saves: 85,
                  tackles: 450
                }
              }
            ]
          },
          discipline: {
            category: 'discipline',
            label: 'Best Disciplinary Record',
            teams: [
              {
                team_id: '3',
                team_name: 'Brighton',
                team_logo: 'brighton-logo.png',
                value: 35, // fewest cards
                rank: 1,
                additional_stats: {
                  yellow_cards: 30,
                  red_cards: 2,
                  fouls: 320
                }
              }
            ]
          },
          performance: {
            category: 'performance',
            label: 'Most Wins',
            teams: [
              {
                team_id: '1',
                team_name: 'Manchester City',
                team_logo: 'man-city-logo.png',
                value: 22,
                rank: 1,
                additional_stats: {
                  matches_played: 30,
                  draws: 5,
                  losses: 3,
                  points: 71
                }
              }
            ]
          }
        }
      }

      mockLeagueDataFetcher.getStats.mockResolvedValue(mockComprehensiveTeamStats)

      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertStatsResponse(response)

      // Verify all team stat categories are present
      expect(response.data.team_stats.attack.teams).toHaveLength(1)
      expect(response.data.team_stats.defense.teams).toHaveLength(1)
      expect(response.data.team_stats.discipline.teams).toHaveLength(1)
      expect(response.data.team_stats.performance.teams).toHaveLength(1)

      // Verify category labels
      expect(response.data.team_stats.attack.label).toBe('Goals Scored')
      expect(response.data.team_stats.defense.label).toBe('Clean Sheets')
      expect(response.data.team_stats.discipline.label).toBe('Best Disciplinary Record')
      expect(response.data.team_stats.performance.label).toBe('Most Wins')

      // Verify additional stats are present
      expect(response.data.team_stats.attack.teams[0].additional_stats.shots).toBe(450)
      expect(response.data.team_stats.defense.teams[0].additional_stats.saves).toBe(85)
      expect(response.data.team_stats.discipline.teams[0].additional_stats.yellow_cards).toBe(30)
      expect(response.data.team_stats.performance.teams[0].additional_stats.points).toBe(71)
    })

    it('should handle empty stats data gracefully', async () => {
      const leagueId = '8'
      
      const mockEmptyStats = {
        id: '8',
        name: 'Premier League',
        season_id: 20,
        season_name: '2023-24',
        seasons: [],
        overview: {
          teams_count: 0,
          total_players: 0,
          total_goals: 0,
          total_assists: 0,
          total_yellow_cards: 0,
          total_red_cards: 0,
          total_appearances: 0,
          total_minutes_played: 0,
          average_goals_per_player: 0,
          average_assists_per_player: 0
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
      }

      mockLeagueDataFetcher.getStats.mockResolvedValue(mockEmptyStats)

      const request = createLeagueRequest(leagueId, 'stats')
      const response = await executeEndpoint(leagueStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertStatsResponse(response)

      // Verify empty data is handled correctly
      expect(response.data.overview.teams_count).toBe(0)
      expect(response.data.player_stats.top_scorers.players).toEqual([])
      expect(response.data.team_stats.attack.teams).toEqual([])
    })
  })
})