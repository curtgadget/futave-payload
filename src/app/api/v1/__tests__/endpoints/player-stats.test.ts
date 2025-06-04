import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createPlayerRequest,
  executeEndpoint,
  apiTestSetup,
  playerEndpointAssertions,
  mockPlayerDataFetcher,
  mockPlayerData,
  APIResponse,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import playerEndpoint from '../../players'

describe('Player Stats API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/player/:id?tab=stats', () => {
    it('should return player stats data successfully', async () => {
      // Setup mock data
      const playerId = '999'
      mockPlayerDataFetcher.getStats.mockResolvedValue(mockPlayerData.stats)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'stats' } })
      const response = await executeEndpoint(playerEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      playerEndpointAssertions.assertStatsResponse(response)

      // Verify specific data
      expect(response.data.id).toBe(playerId)
      expect(response.data.name).toBe('Cristiano Ronaldo')
      expect(response.data.position).toBe('Forward')
      expect(response.data.nationality).toBe('Portugal')
      
      // Verify stats array
      expect(response.data.stats).toHaveLength(1)
      const seasonStats = response.data.stats[0]
      expect(seasonStats.season.name).toBe('2023-24')
      expect(seasonStats.team.name).toBe('Al Nassr')
      expect(seasonStats.goals).toBe(35)
      expect(seasonStats.assists).toBe(11)
      expect(seasonStats.rating).toBe(8.2)
      
      // Verify detailed stats
      expect(seasonStats.shots).toEqual({
        total: 150,
        on_target: 75,
        accuracy: 50
      })
      expect(seasonStats.passes).toEqual({
        total: 800,
        key: 45,
        accuracy: 85
      })
      expect(seasonStats.dribbles).toEqual({
        attempts: 80,
        success: 48,
        success_rate: 60
      })

      // Verify seasons
      expect(response.data.seasons).toHaveLength(2)
      expect(response.data.seasons[0].name).toBe('2023-24')
      expect(response.data.seasons[1].name).toBe('2022-23')
    })

    it('should handle stats request with season_id parameter', async () => {
      const playerId = '999'
      const seasonId = '20'
      
      mockPlayerDataFetcher.getStats.mockResolvedValue(mockPlayerData.stats)

      const request = createPlayerRequest(playerId, { 
        queryParams: { tab: 'stats', season_id: seasonId } 
      })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      playerEndpointAssertions.assertStatsResponse(response)
      
      // Verify getStats was called with both parameters
      expect(mockPlayerDataFetcher.getStats).toHaveBeenCalledWith(playerId, seasonId)
    })

    it('should handle stats request without season_id parameter', async () => {
      const playerId = '999'
      
      mockPlayerDataFetcher.getStats.mockResolvedValue(mockPlayerData.stats)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'stats' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify getStats was called with undefined for seasonId
      expect(mockPlayerDataFetcher.getStats).toHaveBeenCalledWith(playerId, undefined)
    })

    it('should handle player with multiple seasons of stats', async () => {
      const playerId = '999'
      
      const multiSeasonStats = {
        ...mockPlayerData.stats,
        stats: [
          ...mockPlayerData.stats.stats,
          {
            season: { id: '19', name: '2022-23' },
            team: { id: '12', name: 'Manchester United', logo: 'https://example.com/mufc.png' },
            league: { id: '8', name: 'Premier League', logo: 'https://example.com/pl.png' },
            appearances: 16,
            starts: 12,
            minutes_played: 1200,
            goals: 3,
            assists: 2,
            yellow_cards: 1,
            red_cards: 0,
            rating: 6.8,
            shots: { total: 45, on_target: 15, accuracy: 33 },
            passes: { total: 400, key: 10, accuracy: 80 },
            dribbles: { attempts: 30, success: 15, success_rate: 50 }
          },
          {
            season: { id: '18', name: '2021-22' },
            team: { id: '12', name: 'Manchester United', logo: 'https://example.com/mufc.png' },
            league: { id: '8', name: 'Premier League', logo: 'https://example.com/pl.png' },
            appearances: 38,
            starts: 35,
            minutes_played: 3200,
            goals: 24,
            assists: 3,
            yellow_cards: 4,
            red_cards: 0,
            rating: 7.6,
            shots: { total: 120, on_target: 50, accuracy: 42 },
            passes: { total: 900, key: 30, accuracy: 82 },
            dribbles: { attempts: 70, success: 40, success_rate: 57 }
          }
        ],
        seasons: [
          { id: '20', name: '2023-24' },
          { id: '19', name: '2022-23' },
          { id: '18', name: '2021-22' }
        ]
      }

      mockPlayerDataFetcher.getStats.mockResolvedValue(multiSeasonStats)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'stats' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      expect(response.data.stats).toHaveLength(3)
      expect(response.data.seasons).toHaveLength(3)
      
      // Verify stats are ordered by season (most recent first based on mock data)
      expect(response.data.stats[0].season.name).toBe('2023-24')
      expect(response.data.stats[1].season.name).toBe('2022-23')
      expect(response.data.stats[2].season.name).toBe('2021-22')
    })

    it('should handle player with no stats', async () => {
      const playerId = '456'
      
      mockPlayerDataFetcher.getStats.mockResolvedValue({
        id: playerId,
        name: 'Young Player',
        position: 'Midfielder',
        nationality: 'Test Country',
        stats: [],
        seasons: []
      })

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'stats' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      playerEndpointAssertions.assertStatsResponse(response)
      
      expect(response.data.stats).toEqual([])
      expect(response.data.seasons).toEqual([])
    })

    it('should handle players with partial stats data', async () => {
      const playerId = '999'
      
      const partialStatsData = {
        id: playerId,
        name: 'Test Player',
        position: 'Defender',
        nationality: 'Test Country',
        stats: [{
          season: { id: '20', name: '2023-24' },
          team: { id: '50', name: 'Test Team', logo: undefined },
          league: { id: '955', name: 'Test League', logo: undefined },
          appearances: 10,
          starts: 8,
          minutes_played: 720,
          goals: undefined,
          assists: undefined,
          yellow_cards: 2,
          red_cards: 0,
          rating: undefined,
          shots: undefined,
          passes: undefined,
          dribbles: undefined
        }],
        seasons: [{ id: '20', name: '2023-24' }]
      }

      mockPlayerDataFetcher.getStats.mockResolvedValue(partialStatsData)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'stats' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      const seasonStats = response.data.stats[0]
      
      // Verify required fields are present
      expect(seasonStats.appearances).toBe(10)
      expect(seasonStats.starts).toBe(8)
      expect(seasonStats.minutes_played).toBe(720)
      
      // Verify optional fields can be undefined
      expect(seasonStats.goals).toBeUndefined()
      expect(seasonStats.assists).toBeUndefined()
      expect(seasonStats.rating).toBeUndefined()
      expect(seasonStats.shots).toBeUndefined()
      expect(seasonStats.passes).toBeUndefined()
      expect(seasonStats.dribbles).toBeUndefined()
    })

    it('should handle stats for goalkeeper with specific stats', async () => {
      const playerId = '1001'
      
      const goalkeeperStatsData = {
        id: playerId,
        name: 'Test Goalkeeper',
        position: 'Goalkeeper',
        nationality: 'Test Country',
        stats: [{
          season: { id: '20', name: '2023-24' },
          team: { id: '50', name: 'Test Team', logo: 'https://example.com/team.png' },
          league: { id: '955', name: 'Test League', logo: 'https://example.com/league.png' },
          appearances: 38,
          starts: 38,
          minutes_played: 3420,
          goals: 0,
          assists: 0,
          yellow_cards: 1,
          red_cards: 0,
          rating: 7.2,
          // Goalkeeper typically won't have shots/passes/dribbles stats
          shots: undefined,
          passes: { total: 1200, key: 5, accuracy: 75 },
          dribbles: undefined
        }],
        seasons: [{ id: '20', name: '2023-24' }]
      }

      mockPlayerDataFetcher.getStats.mockResolvedValue(goalkeeperStatsData)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'stats' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      const seasonStats = response.data.stats[0]
      expect(response.data.position).toBe('Goalkeeper')
      expect(seasonStats.goals).toBe(0)
      expect(seasonStats.assists).toBe(0)
      expect(seasonStats.shots).toBeUndefined()
      expect(seasonStats.passes).toBeDefined()
      expect(seasonStats.dribbles).toBeUndefined()
    })

    it('should handle different team stats across seasons', async () => {
      const playerId = '999'
      
      const differentTeamsData = {
        ...mockPlayerData.stats,
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
            rating: 8.2
          },
          {
            season: { id: '19', name: '2022-23' },
            team: { id: '85', name: 'Juventus', logo: 'https://example.com/juve.png' },
            league: { id: '384', name: 'Serie A', logo: 'https://example.com/seriea.png' },
            appearances: 25,
            starts: 22,
            minutes_played: 2000,
            goals: 15,
            assists: 5,
            yellow_cards: 3,
            red_cards: 0,
            rating: 7.5
          }
        ]
      }

      mockPlayerDataFetcher.getStats.mockResolvedValue(differentTeamsData)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'stats' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify different teams across seasons
      expect(response.data.stats[0].team.name).toBe('Al Nassr')
      expect(response.data.stats[0].league.name).toBe('Saudi Pro League')
      expect(response.data.stats[1].team.name).toBe('Juventus')
      expect(response.data.stats[1].league.name).toBe('Serie A')
    })
  })
})