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

describe('Player Overview API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/player/:id (overview tab)', () => {
    it('should have correct endpoint configuration', () => {
      expect(playerEndpoint.path).toBe('/v1/player/:id')
      expect(playerEndpoint.method).toBe('get')
      expect(typeof playerEndpoint.handler).toBe('function')
    })

    it('should return player overview data successfully', async () => {
      // Setup mock data
      const playerId = '999'
      mockPlayerDataFetcher.getOverview.mockResolvedValue(mockPlayerData.overview)

      const request = createPlayerRequest(playerId)
      const response = await executeEndpoint(playerEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      playerEndpointAssertions.assertOverviewResponse(response)

      // Verify specific data
      expect(response.data.id).toBe(playerId)
      expect(response.data.name).toBe('Cristiano Ronaldo')
      expect(response.data.position).toBe('Forward')
      expect(response.data.nationality).toBe('Portugal')
      
      // Verify team data
      expect(response.data.team).toEqual({
        id: '50',
        name: 'Al Nassr'
      })

      // Verify physical attributes
      expect(response.data.height).toEqual({
        metric: '187 cm',
        imperial: '6\'2"'
      })
      expect(response.data.weight).toEqual({
        metric: '83 kg',
        imperial: '183 lbs'
      })

      // Verify current team stats
      expect(response.data.current_team_stats).toBeDefined()
      expect(response.data.current_team_stats.goals).toBe(35)
      expect(response.data.current_team_stats.assists).toBe(11)
      expect(response.data.current_team_stats.rating).toBe(8.2)

      // Verify trophies
      expect(response.data.trophies).toHaveLength(1)
      expect(response.data.trophies[0].trophy.name).toBe('Winner')
      
      // Verify career items
      expect(response.data.career).toHaveLength(1)
      expect(response.data.career[0].team.name).toBe('Al Nassr')
    })

    it('should return player overview data with explicit tab parameter', async () => {
      const playerId = '999'
      mockPlayerDataFetcher.getOverview.mockResolvedValue(mockPlayerData.overview)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'overview' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      playerEndpointAssertions.assertOverviewResponse(response)
      expect(mockPlayerDataFetcher.getOverview).toHaveBeenCalledWith(playerId)
    })

    it('should handle missing player ID in URL', async () => {
      const request = createPlayerRequest('')
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(400).expectError('Player ID is required')
    })

    it('should handle invalid tab parameter', async () => {
      const playerId = '999'
      const request = createPlayerRequest(playerId, { queryParams: { tab: 'invalid' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(400).expectError('Invalid tab specified')
    })

    it('should handle data fetcher errors gracefully', async () => {
      const playerId = '999'
      
      // Setup fetcher to fail
      mockPlayerDataFetcher.getOverview.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createPlayerRequest(playerId)
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching player data')
    })

    it('should handle invalid player ID format error', async () => {
      const playerId = 'invalid-id'
      
      mockPlayerDataFetcher.getOverview.mockRejectedValue(new Error('Invalid player ID format'))
      
      const request = createPlayerRequest(playerId)
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(400).expectError('Invalid player ID format')
    })

    it('should handle player not found error', async () => {
      const playerId = '9999999'
      
      mockPlayerDataFetcher.getOverview.mockRejectedValue(new Error('No player found with ID 9999999'))
      
      const request = createPlayerRequest(playerId)
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(404).expectError('Player not found')
    })

    it('should handle invalid player data structure error', async () => {
      const playerId = '999'
      
      mockPlayerDataFetcher.getOverview.mockRejectedValue(new Error('Invalid player data structure'))
      
      const request = createPlayerRequest(playerId)
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(500).expectError('Invalid player data structure')
    })

    it('should handle partial data gracefully', async () => {
      const playerId = '456'
      
      // Setup minimal mock data
      mockPlayerDataFetcher.getOverview.mockResolvedValue({
        id: playerId,
        name: 'Test Player',
        position: undefined,
        nationality: undefined,
        team: undefined,
        photo: undefined,
        jersey_number: undefined,
        date_of_birth: undefined,
        age: undefined,
        height: undefined,
        weight: undefined,
        foot: undefined,
        trophies: [],
        current_team_stats: undefined,
        career: []
      })

      const request = createPlayerRequest(playerId)
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      playerEndpointAssertions.assertOverviewResponse(response)

      // Verify defaults for missing data
      expect(response.data.id).toBe(playerId)
      expect(response.data.name).toBe('Test Player')
      expect(response.data.position).toBeUndefined()
      expect(response.data.team).toBeUndefined()
      expect(response.data.trophies).toEqual([])
      expect(response.data.career).toEqual([])
      expect(response.data.current_team_stats).toBeUndefined()
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

      const response = await executeEndpoint(playerEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should handle players with extensive career history', async () => {
      const playerId = '999'
      
      // Create a player with multiple career entries
      const extensiveCareerData = {
        ...mockPlayerData.overview,
        career: [
          ...mockPlayerData.overview.career,
          {
            team: { id: '1', name: 'Real Madrid', logo: 'https://example.com/rm.png' },
            league: { id: '564', name: 'La Liga', logo: 'https://example.com/laliga.png', country: 'Spain' },
            season: { id: '18', name: '2017-18' },
            start_date: '2009-07-01',
            end_date: '2018-06-30',
            appearances: 438,
            starts: 415,
            goals: 450,
            assists: 131,
            minutes_played: 37000,
            rating: 8.9
          },
          {
            team: { id: '85', name: 'Juventus', logo: 'https://example.com/juve.png' },
            league: { id: '384', name: 'Serie A', logo: 'https://example.com/seriea.png', country: 'Italy' },
            season: { id: '19', name: '2018-19' },
            start_date: '2018-07-01',
            end_date: '2021-06-30',
            appearances: 134,
            starts: 130,
            goals: 101,
            assists: 22,
            minutes_played: 11500,
            rating: 8.1
          }
        ]
      }

      mockPlayerDataFetcher.getOverview.mockResolvedValue(extensiveCareerData)

      const request = createPlayerRequest(playerId)
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      expect(response.data.career).toHaveLength(3)
      
      // Verify career is ordered (most recent first based on the mock data)
      expect(response.data.career[0].team.name).toBe('Al Nassr')
      expect(response.data.career[1].team.name).toBe('Real Madrid')
      expect(response.data.career[2].team.name).toBe('Juventus')
    })

    it('should handle players with multiple trophies', async () => {
      const playerId = '999'
      
      const multiTrophyData = {
        ...mockPlayerData.overview,
        trophies: [
          ...mockPlayerData.overview.trophies,
          {
            team: { id: '1', name: 'Real Madrid', logo: 'https://example.com/rm.png', country: 'Spain' },
            league: { id: '564', name: 'La Liga', logo: 'https://example.com/laliga.png' },
            season: { id: '17', name: '2016-17' },
            trophy: { id: '2', position: 1, name: 'Champion' }
          },
          {
            team: { id: '12', name: 'Manchester United', logo: 'https://example.com/mufc.png', country: 'England' },
            league: { id: '8', name: 'Premier League', logo: 'https://example.com/pl.png' },
            season: { id: '7', name: '2007-08' },
            trophy: { id: '3', position: 1, name: 'Champion' }
          }
        ]
      }

      mockPlayerDataFetcher.getOverview.mockResolvedValue(multiTrophyData)

      const request = createPlayerRequest(playerId)
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      expect(response.data.trophies).toHaveLength(3)
      
      // Verify all trophies are present
      const trophyNames = response.data.trophies.map((t: any) => t.trophy.name)
      expect(trophyNames).toContain('Winner')
      expect(trophyNames).toContain('Champion')
    })
  })
})