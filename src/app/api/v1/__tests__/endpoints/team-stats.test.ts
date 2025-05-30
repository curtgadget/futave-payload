import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createTeamRequest,
  executeEndpoint,
  apiTestSetup,
  teamEndpointAssertions,
  mockTeamDataFetcher,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import teamStatsEndpoint from '../../teamStats'

describe('Team Stats API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/team/:id/stats', () => {
    it('should have correct endpoint configuration', () => {
      expect(teamStatsEndpoint.path).toBe('/v1/team/:id/stats')
      expect(teamStatsEndpoint.method).toBe('get')
      expect(typeof teamStatsEndpoint.handler).toBe('function')
    })

    it('should return team stats data successfully with default parameters', async () => {
      const teamId = '123'
      const mockStatsData = {
        player_stats: [
          {
            player_id: '1',
            player_name: 'John Striker',
            position: 'Forward',
            appearances: 25,
            goals: 15,
            assists: 8,
            yellow_cards: 3,
            red_cards: 0,
            minutes_played: 2250,
            rating: 7.8,
            clean_sheets: 0
          },
          {
            player_id: '2',
            player_name: 'John Keeper',
            position: 'Goalkeeper',
            appearances: 30,
            goals: 0,
            assists: 0,
            yellow_cards: 1,
            red_cards: 0,
            minutes_played: 2700,
            rating: 7.2,
            clean_sheets: 12
          }
        ],
        team_stats: {
          matches_played: 30,
          wins: 18,
          draws: 7,
          losses: 5,
          goals_for: 65,
          goals_against: 35,
          goal_difference: 30,
          clean_sheets: 12,
          failed_to_score: 4,
          home_wins: 12,
          home_draws: 3,
          home_losses: 0,
          away_wins: 6,
          away_draws: 4,
          away_losses: 5,
          possession_percentage: 58.5,
          pass_accuracy: 85.2,
          shots_per_game: 15.8,
          shots_on_target_per_game: 6.2
        },
        season_id: 20,
        seasons: [
          { id: 20, name: '2023-24' },
          { id: 19, name: '2022-23' }
        ],
        top_stats: [
          {
            category: 'goals',
            players: [
              {
                player_id: '1',
                name: 'John Striker',
                image_path: 'https://example.com/striker.jpg',
                value: 15,
                position: 'Forward'
              },
              {
                player_id: '3',
                name: 'Jane Midfielder',
                image_path: 'https://example.com/midfielder.jpg',
                value: 8,
                position: 'Midfielder'
              }
            ]
          },
          {
            category: 'assists',
            players: [
              {
                player_id: '1',
                name: 'John Striker',
                image_path: 'https://example.com/striker.jpg',
                value: 8,
                position: 'Forward'
              }
            ]
          },
          {
            category: 'rating',
            players: [
              {
                player_id: '1',
                name: 'John Striker',
                image_path: 'https://example.com/striker.jpg',
                value: 7.8,
                position: 'Forward'
              }
            ]
          }
        ]
      }

      mockTeamDataFetcher.getStats.mockResolvedValue(mockStatsData)

      const request = createTeamRequest(teamId, 'stats')
      const response = await executeEndpoint(teamStatsEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertStatsResponse(response)

      // Verify specific data
      expect(response.data.player_stats).toHaveLength(2)
      expect(response.data.season_id).toBe(20)
      expect(response.data.seasons).toHaveLength(2)
      expect(response.data.top_stats).toHaveLength(3)

      // Verify team stats structure
      expect(response.data.team_stats.matches_played).toBe(30)
      expect(response.data.team_stats.wins).toBe(18)
      expect(response.data.team_stats.goal_difference).toBe(30)
      expect(response.data.team_stats.possession_percentage).toBe(58.5)

      // Verify player stats structure
      const striker = response.data.player_stats[0]
      expect(striker.player_id).toBe('1')
      expect(striker.player_name).toBe('John Striker')
      expect(striker.goals).toBe(15)
      expect(striker.assists).toBe(8)
      expect(striker.rating).toBe(7.8)

      // Verify top stats structure
      const topScorers = response.data.top_stats.find((stat: any) => stat.category === 'goals')
      expect(topScorers.players).toHaveLength(2)
      expect(topScorers.players[0].value).toBe(15)

      // Verify fetcher was called with correct parameters (no season specified)
      expect(mockTeamDataFetcher.getStats).toHaveBeenCalledWith(teamId, undefined)
    })

    it('should handle season query parameter', async () => {
      const teamId = '456'
      const seasonId = '19'
      
      const request = createTeamRequest(teamId, 'stats', {
        queryParams: { season: seasonId }
      })

      mockTeamDataFetcher.getStats.mockResolvedValue({
        player_stats: [],
        team_stats: {},
        season_id: 19,
        seasons: [{ id: 19, name: '2022-23' }],
        top_stats: []
      })

      const response = await executeEndpoint(teamStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with season parameter
      expect(mockTeamDataFetcher.getStats).toHaveBeenCalledWith(teamId, seasonId)
    })

    it('should handle empty stats data', async () => {
      const teamId = '789'
      
      const emptyStatsData = {
        player_stats: [],
        team_stats: {
          matches_played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          clean_sheets: 0,
          failed_to_score: 0
        },
        season_id: 20,
        seasons: [],
        top_stats: []
      }

      mockTeamDataFetcher.getStats.mockResolvedValue(emptyStatsData)

      const request = createTeamRequest(teamId, 'stats')
      const response = await executeEndpoint(teamStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertStatsResponse(response)
      
      // Verify empty data structure
      expect(response.data.player_stats).toEqual([])
      expect(response.data.seasons).toEqual([])
      expect(response.data.top_stats).toEqual([])
      expect(response.data.team_stats.matches_played).toBe(0)
    })

    it('should handle comprehensive team statistics', async () => {
      const teamId = '999'
      
      const comprehensiveStatsData = {
        player_stats: Array.from({ length: 25 }, (_, i) => ({
          player_id: `player${i}`,
          player_name: `Player ${i + 1}`,
          position: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'][i % 4],
          appearances: Math.floor(Math.random() * 30) + 1,
          goals: Math.floor(Math.random() * 20),
          assists: Math.floor(Math.random() * 15),
          yellow_cards: Math.floor(Math.random() * 8),
          red_cards: Math.floor(Math.random() * 2),
          minutes_played: Math.floor(Math.random() * 2700) + 300,
          rating: +(Math.random() * 3 + 6).toFixed(1),
          clean_sheets: i < 3 ? Math.floor(Math.random() * 15) : 0 // Only for goalkeepers/defenders
        })),
        team_stats: {
          matches_played: 38,
          wins: 25,
          draws: 8,
          losses: 5,
          goals_for: 89,
          goals_against: 32,
          goal_difference: 57,
          clean_sheets: 20,
          failed_to_score: 3,
          home_wins: 15,
          home_draws: 3,
          home_losses: 1,
          away_wins: 10,
          away_draws: 5,
          away_losses: 4,
          possession_percentage: 62.3,
          pass_accuracy: 87.8,
          shots_per_game: 18.2,
          shots_on_target_per_game: 7.4,
          corners_per_game: 6.8,
          fouls_per_game: 11.2,
          offsides_per_game: 2.1
        },
        season_id: 20,
        seasons: [
          { id: 20, name: '2023-24' },
          { id: 19, name: '2022-23' },
          { id: 18, name: '2021-22' }
        ],
        top_stats: [
          {
            category: 'goals',
            players: Array.from({ length: 5 }, (_, i) => ({
              player_id: `striker${i}`,
              name: `Top Scorer ${i + 1}`,
              value: 20 - i * 3,
              position: 'Forward'
            }))
          },
          {
            category: 'assists',
            players: Array.from({ length: 5 }, (_, i) => ({
              player_id: `creator${i}`,
              name: `Top Creator ${i + 1}`,
              value: 15 - i * 2,
              position: 'Midfielder'
            }))
          },
          {
            category: 'rating',
            players: Array.from({ length: 5 }, (_, i) => ({
              player_id: `rated${i}`,
              name: `Top Rated ${i + 1}`,
              value: +(8.5 - i * 0.2).toFixed(1),
              position: ['Forward', 'Midfielder', 'Defender'][i % 3]
            }))
          }
        ]
      }

      mockTeamDataFetcher.getStats.mockResolvedValue(comprehensiveStatsData)

      const request = createTeamRequest(teamId, 'stats')
      const response = await executeEndpoint(teamStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertStatsResponse(response)
      
      // Verify comprehensive data
      expect(response.data.player_stats).toHaveLength(25)
      expect(response.data.seasons).toHaveLength(3)
      expect(response.data.top_stats).toHaveLength(3)
      
      // Verify top stats have multiple players
      response.data.top_stats.forEach((stat: any) => {
        expect(stat.players).toHaveLength(5)
      })
      
      // Verify team stats completeness
      expect(response.data.team_stats).toHaveProperty('possession_percentage')
      expect(response.data.team_stats).toHaveProperty('pass_accuracy')
      expect(response.data.team_stats).toHaveProperty('shots_per_game')
    })

    it('should handle missing team ID in URL', async () => {
      const request = createTeamRequest('', 'stats')
      const response = await executeEndpoint(teamStatsEndpoint, request)

      response.expectStatus(400).expectError('Team ID is required')
    })

    it('should handle data fetcher errors gracefully', async () => {
      const teamId = '123'
      
      mockTeamDataFetcher.getStats.mockRejectedValue(new Error('Stats service unavailable'))
      
      const request = createTeamRequest(teamId, 'stats')
      const response = await executeEndpoint(teamStatsEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching team stats')
    })

    it('should handle invalid season parameter', async () => {
      const teamId = '555'
      
      const request = createTeamRequest(teamId, 'stats', {
        queryParams: { season: 'invalid_season' }
      })

      mockTeamDataFetcher.getStats.mockResolvedValue({
        player_stats: [],
        team_stats: {},
        season_id: null,
        seasons: [],
        top_stats: []
      })

      const response = await executeEndpoint(teamStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with the invalid season string
      expect(mockTeamDataFetcher.getStats).toHaveBeenCalledWith(teamId, 'invalid_season')
    })

    it('should handle stats with partial player data', async () => {
      const teamId = '777'
      
      const partialStatsData = {
        player_stats: [
          {
            player_id: '1',
            player_name: 'Minimal Player',
            appearances: 10
            // Missing other stats
          }
        ],
        team_stats: {
          matches_played: 10,
          wins: 5
          // Missing other team stats
        },
        season_id: 20,
        seasons: [{ id: 20, name: '2023-24' }],
        top_stats: []
      }

      mockTeamDataFetcher.getStats.mockResolvedValue(partialStatsData)

      const request = createTeamRequest(teamId, 'stats')
      const response = await executeEndpoint(teamStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertStatsResponse(response)
      
      // Verify partial data is handled
      const player = response.data.player_stats[0]
      expect(player.player_id).toBe('1')
      expect(player.player_name).toBe('Minimal Player')
      expect(player.appearances).toBe(10)
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

      const response = await executeEndpoint(teamStatsEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should handle multiple seasons data', async () => {
      const teamId = '888'
      
      const multiSeasonData = {
        player_stats: [],
        team_stats: {},
        season_id: 20,
        seasons: [
          { id: 20, name: '2023-24' },
          { id: 19, name: '2022-23' },
          { id: 18, name: '2021-22' },
          { id: 17, name: '2020-21' },
          { id: 16, name: '2019-20' }
        ],
        top_stats: []
      }

      mockTeamDataFetcher.getStats.mockResolvedValue(multiSeasonData)

      const request = createTeamRequest(teamId, 'stats')
      const response = await executeEndpoint(teamStatsEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertStatsResponse(response)
      
      // Verify multiple seasons
      expect(response.data.seasons).toHaveLength(5)
      expect(response.data.seasons[0].name).toBe('2023-24')
      expect(response.data.seasons[4].name).toBe('2019-20')
    })
  })
})