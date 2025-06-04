import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createPlayersListRequest,
  executeEndpoint,
  apiTestSetup,
  playerEndpointAssertions,
  mockPlayerListDataFetcher,
  mockPlayerData,
  APIResponse,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import playersListEndpoint from '../../playersList'

describe('Players List API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/players', () => {
    it('should have correct endpoint configuration', () => {
      expect(playersListEndpoint.path).toBe('/v1/players')
      expect(playersListEndpoint.method).toBe('get')
      expect(typeof playersListEndpoint.handler).toBe('function')
    })

    it('should return players list successfully', async () => {
      // Setup mock data
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue(mockPlayerData.playersList)

      const request = createPlayersListRequest()
      const response = await executeEndpoint(playersListEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      playerEndpointAssertions.assertPlayersListResponse(response)

      // Verify specific data
      expect(response.data.data).toHaveLength(2)
      
      // Verify first player
      const ronaldo = response.data.data[0]
      expect(ronaldo.id).toBe('999')
      expect(ronaldo.name).toBe('Cristiano Ronaldo')
      expect(ronaldo.position).toBe('Forward')
      expect(ronaldo.nationality).toBe('Portugal')
      expect(ronaldo.team.name).toBe('Al Nassr')
      expect(ronaldo.jersey_number).toBe(7)
      expect(ronaldo.age).toBe(39)
      
      // Verify second player
      const messi = response.data.data[1]
      expect(messi.id).toBe('1000')
      expect(messi.name).toBe('Lionel Messi')
      expect(messi.position).toBe('Forward')
      expect(messi.team.name).toBe('Inter Miami')
      
      // Verify pagination
      expect(response.data.meta.pagination).toEqual({
        page: 1,
        limit: 50,
        totalItems: 2,
        totalPages: 1
      })
    })

    it('should handle pagination parameters', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 2,
            limit: 20,
            totalItems: 100,
            totalPages: 5
          }
        }
      })

      const request = createPlayersListRequest({ 
        queryParams: { page: '2', limit: '20' } 
      })
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify getPlayers was called with correct parameters
      expect(mockPlayerListDataFetcher.getPlayers).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        teamId: undefined,
        countryId: undefined,
        position: undefined,
        search: undefined
      })
      
      // Verify pagination in response
      expect(response.data.meta.pagination.page).toBe(2)
      expect(response.data.meta.pagination.limit).toBe(20)
    })

    it('should enforce maximum limit of 100', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 1,
            limit: 100,
            totalItems: 500,
            totalPages: 5
          }
        }
      })

      const request = createPlayersListRequest({ 
        queryParams: { limit: '200' } // Request more than max
      })
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify limit was capped at 100
      expect(mockPlayerListDataFetcher.getPlayers).toHaveBeenCalledWith({
        page: 1,
        limit: 100, // Should be capped at 100
        teamId: undefined,
        countryId: undefined,
        position: undefined,
        search: undefined
      })
    })

    it('should handle team filter', async () => {
      const teamFilteredData = {
        data: mockPlayerData.playersList.data.filter(p => p.team?.id === '50'),
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 1,
            totalPages: 1
          }
        }
      }

      mockPlayerListDataFetcher.getPlayers.mockResolvedValue(teamFilteredData)

      const request = createPlayersListRequest({ 
        queryParams: { team_id: '50' } 
      })
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify getPlayers was called with team filter
      expect(mockPlayerListDataFetcher.getPlayers).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        teamId: '50',
        countryId: undefined,
        position: undefined,
        search: undefined
      })
      
      // Verify only Al Nassr players returned
      expect(response.data.data).toHaveLength(1)
      expect(response.data.data[0].team.name).toBe('Al Nassr')
    })

    it('should handle country filter', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: [{
          id: '999',
          name: 'Cristiano Ronaldo',
          position: 'Forward',
          nationality: 'Portugal',
          team: { id: '50', name: 'Al Nassr' },
          photo: 'https://example.com/ronaldo.jpg',
          jersey_number: 7,
          date_of_birth: '1985-02-05',
          age: 39
        }],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 1,
            totalPages: 1
          }
        }
      })

      const request = createPlayersListRequest({ 
        queryParams: { country_id: '620' } // Portugal ID
      })
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify getPlayers was called with country filter
      expect(mockPlayerListDataFetcher.getPlayers).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        teamId: undefined,
        countryId: '620',
        position: undefined,
        search: undefined
      })
    })

    it('should handle position filter', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: mockPlayerData.playersList.data.filter(p => p.position === 'Forward'),
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 2,
            totalPages: 1
          }
        }
      })

      const request = createPlayersListRequest({ 
        queryParams: { position: 'Forward' } 
      })
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify getPlayers was called with position filter
      expect(mockPlayerListDataFetcher.getPlayers).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        teamId: undefined,
        countryId: undefined,
        position: 'Forward',
        search: undefined
      })
      
      // Verify all players are forwards
      response.data.data.forEach((player: any) => {
        expect(player.position).toBe('Forward')
      })
    })

    it('should handle search parameter', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: [{
          id: '999',
          name: 'Cristiano Ronaldo',
          position: 'Forward',
          nationality: 'Portugal',
          team: { id: '50', name: 'Al Nassr' },
          photo: 'https://example.com/ronaldo.jpg',
          jersey_number: 7,
          date_of_birth: '1985-02-05',
          age: 39
        }],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 1,
            totalPages: 1
          }
        }
      })

      const request = createPlayersListRequest({ 
        queryParams: { search: 'Ronaldo' } 
      })
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify getPlayers was called with search parameter
      expect(mockPlayerListDataFetcher.getPlayers).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        teamId: undefined,
        countryId: undefined,
        position: undefined,
        search: 'Ronaldo'
      })
    })

    it('should handle multiple filters combined', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 0,
            totalPages: 0
          }
        }
      })

      const request = createPlayersListRequest({ 
        queryParams: { 
          team_id: '50',
          position: 'Forward',
          search: 'Cristiano',
          page: '2',
          limit: '25'
        } 
      })
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify all filters were passed correctly
      expect(mockPlayerListDataFetcher.getPlayers).toHaveBeenCalledWith({
        page: 2,
        limit: 25,
        teamId: '50',
        countryId: undefined,
        position: 'Forward',
        search: 'Cristiano'
      })
    })

    it('should handle empty results', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 0,
            totalPages: 0
          }
        }
      })

      const request = createPlayersListRequest()
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      expect(response.data.data).toEqual([])
      expect(response.data.meta.pagination.totalItems).toBe(0)
    })

    it('should handle data fetcher errors gracefully', async () => {
      mockPlayerListDataFetcher.getPlayers.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createPlayersListRequest()
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching players data')
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

      const response = await executeEndpoint(playersListEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should handle invalid page number by passing NaN', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 0,
            totalPages: 0
          }
        }
      })

      const request = createPlayersListRequest({ 
        queryParams: { page: 'invalid' } 
      })
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // parseInt('invalid') returns NaN
      expect(mockPlayerListDataFetcher.getPlayers).toHaveBeenCalledWith({
        page: NaN,
        limit: 50,
        teamId: undefined,
        countryId: undefined,
        position: undefined,
        search: undefined
      })
    })

    it('should handle large datasets with pagination', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: Array(50).fill(null).map((_, i) => ({
          id: `${1000 + i}`,
          name: `Player ${i + 1}`,
          position: i % 4 === 0 ? 'Goalkeeper' : i % 4 === 1 ? 'Defender' : i % 4 === 2 ? 'Midfielder' : 'Forward',
          nationality: 'Test Country',
          team: { id: `${100 + (i % 10)}`, name: `Team ${(i % 10) + 1}` },
          photo: `https://example.com/player${i + 1}.jpg`,
          jersey_number: (i % 99) + 1,
          date_of_birth: '1990-01-01',
          age: 34
        })),
        meta: {
          pagination: {
            page: 3,
            limit: 50,
            totalItems: 500,
            totalPages: 10
          }
        }
      })

      const request = createPlayersListRequest({ 
        queryParams: { page: '3', limit: '50' } 
      })
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      expect(response.data.data).toHaveLength(50)
      expect(response.data.meta.pagination.page).toBe(3)
      expect(response.data.meta.pagination.totalItems).toBe(500)
      expect(response.data.meta.pagination.totalPages).toBe(10)
    })

    it('should handle players with minimal data', async () => {
      mockPlayerListDataFetcher.getPlayers.mockResolvedValue({
        data: [{
          id: '1001',
          name: 'Minimal Player',
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
          trophies: undefined
        }],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 1,
            totalPages: 1
          }
        }
      })

      const request = createPlayersListRequest()
      const response = await executeEndpoint(playersListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      const player = response.data.data[0]
      expect(player.id).toBe('1001')
      expect(player.name).toBe('Minimal Player')
      expect(player.position).toBeUndefined()
      expect(player.team).toBeUndefined()
    })
  })
})