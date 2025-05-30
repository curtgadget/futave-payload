import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createTeamRequest,
  executeEndpoint,
  apiTestSetup,
  teamEndpointAssertions,
  mockTeamDataFetcher,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import teamSquadEndpoint from '../../teamSquad'

describe('Team Squad API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/team/:id/squad', () => {
    it('should have correct endpoint configuration', () => {
      expect(teamSquadEndpoint.path).toBe('/v1/team/:id/squad')
      expect(teamSquadEndpoint.method).toBe('get')
      expect(typeof teamSquadEndpoint.handler).toBe('function')
    })

    it('should return team squad data successfully', async () => {
      const teamId = '123'
      const mockSquadData = {
        players: {
          goalkeepers: [
            {
              id: '1',
              name: 'John Keeper',
              position: 'Goalkeeper',
              jersey_number: 1,
              age: 28,
              height: '188 cm',
              weight: '82 kg',
              nationality: 'England',
              image_path: 'https://example.com/keeper.jpg',
              market_value: 5000000,
              contract_end: '2026-06-30'
            },
            {
              id: '12',
              name: 'Second Keeper',
              position: 'Goalkeeper',
              jersey_number: 12,
              age: 24,
              height: '185 cm',
              weight: '80 kg',
              nationality: 'Spain',
              image_path: 'https://example.com/keeper2.jpg',
              market_value: 2000000,
              contract_end: '2025-06-30'
            }
          ],
          defenders: [
            {
              id: '2',
              name: 'John Defender',
              position: 'Centre-Back',
              jersey_number: 4,
              age: 26,
              height: '185 cm',
              weight: '78 kg',
              nationality: 'France',
              image_path: 'https://example.com/defender.jpg',
              market_value: 15000000,
              contract_end: '2027-06-30'
            }
          ],
          midfielders: [
            {
              id: '3',
              name: 'John Midfielder',
              position: 'Central Midfielder',
              jersey_number: 8,
              age: 25,
              height: '180 cm',
              weight: '75 kg',
              nationality: 'Brazil',
              image_path: 'https://example.com/midfielder.jpg',
              market_value: 25000000,
              contract_end: '2028-06-30'
            }
          ],
          forwards: [
            {
              id: '4',
              name: 'John Forward',
              position: 'Centre-Forward',
              jersey_number: 9,
              age: 23,
              height: '182 cm',
              weight: '76 kg',
              nationality: 'Argentina',
              image_path: 'https://example.com/forward.jpg',
              market_value: 35000000,
              contract_end: '2029-06-30'
            }
          ]
        },
        coaches: [
          {
            id: '100',
            name: 'Head Coach',
            position: 'Manager',
            nationality: 'Germany',
            age: 45,
            image_path: 'https://example.com/coach.jpg',
            contract_end: '2026-06-30'
          },
          {
            id: '101',
            name: 'Assistant Coach',
            position: 'Assistant Manager',
            nationality: 'Italy',
            age: 40,
            image_path: 'https://example.com/assistant.jpg',
            contract_end: '2025-06-30'
          }
        ]
      }

      mockTeamDataFetcher.getSquad.mockResolvedValue(mockSquadData)

      const request = createTeamRequest(teamId, 'squad')
      const response = await executeEndpoint(teamSquadEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertSquadResponse(response)

      // Verify specific data structure
      expect(response.data.players.goalkeepers).toHaveLength(2)
      expect(response.data.players.defenders).toHaveLength(1)
      expect(response.data.players.midfielders).toHaveLength(1)
      expect(response.data.players.forwards).toHaveLength(1)
      expect(response.data.coaches).toHaveLength(2)

      // Verify player data structure
      const goalkeeper = response.data.players.goalkeepers[0]
      expect(goalkeeper.id).toBe('1')
      expect(goalkeeper.name).toBe('John Keeper')
      expect(goalkeeper.position).toBe('Goalkeeper')
      expect(goalkeeper.jersey_number).toBe(1)
      expect(goalkeeper.age).toBe(28)
      expect(goalkeeper.nationality).toBe('England')
      expect(goalkeeper.market_value).toBe(5000000)

      // Verify coach data structure
      const headCoach = response.data.coaches[0]
      expect(headCoach.id).toBe('100')
      expect(headCoach.name).toBe('Head Coach')
      expect(headCoach.position).toBe('Manager')
      expect(headCoach.nationality).toBe('Germany')
      expect(headCoach.age).toBe(45)

      // Verify fetcher was called with correct parameters
      expect(mockTeamDataFetcher.getSquad).toHaveBeenCalledWith(teamId, undefined)
    })

    it('should handle empty squad data', async () => {
      const teamId = '456'
      
      const emptySquadData = {
        players: {
          goalkeepers: [],
          defenders: [],
          midfielders: [],
          forwards: []
        },
        coaches: []
      }

      mockTeamDataFetcher.getSquad.mockResolvedValue(emptySquadData)

      const request = createTeamRequest(teamId, 'squad')
      const response = await executeEndpoint(teamSquadEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertSquadResponse(response)
      
      // Verify empty arrays
      expect(response.data.players.goalkeepers).toEqual([])
      expect(response.data.players.defenders).toEqual([])
      expect(response.data.players.midfielders).toEqual([])
      expect(response.data.players.forwards).toEqual([])
      expect(response.data.coaches).toEqual([])
    })

    it('should handle partial squad data (missing positions)', async () => {
      const teamId = '789'
      
      const partialSquadData = {
        players: {
          goalkeepers: [
            {
              id: '1',
              name: 'Only Keeper',
              position: 'Goalkeeper',
              jersey_number: 1,
              age: 30,
              nationality: 'England'
            }
          ],
          defenders: [],
          midfielders: [
            {
              id: '8',
              name: 'Only Midfielder',
              position: 'Central Midfielder',
              jersey_number: 8,
              age: 27,
              nationality: 'Spain'
            }
          ],
          forwards: []
        },
        coaches: [
          {
            id: '100',
            name: 'Manager Only',
            position: 'Manager',
            nationality: 'Brazil',
            age: 50
          }
        ]
      }

      mockTeamDataFetcher.getSquad.mockResolvedValue(partialSquadData)

      const request = createTeamRequest(teamId, 'squad')
      const response = await executeEndpoint(teamSquadEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertSquadResponse(response)
      
      // Verify partial data
      expect(response.data.players.goalkeepers).toHaveLength(1)
      expect(response.data.players.defenders).toHaveLength(0)
      expect(response.data.players.midfielders).toHaveLength(1)
      expect(response.data.players.forwards).toHaveLength(0)
      expect(response.data.coaches).toHaveLength(1)
    })

    it('should handle squad with large number of players', async () => {
      const teamId = '999'
      
      // Create a large squad
      const largeSquadData = {
        players: {
          goalkeepers: Array.from({ length: 3 }, (_, i) => ({
            id: `gk${i}`,
            name: `Goalkeeper ${i + 1}`,
            position: 'Goalkeeper',
            jersey_number: i + 1,
            age: 25 + i,
            nationality: 'Country'
          })),
          defenders: Array.from({ length: 8 }, (_, i) => ({
            id: `def${i}`,
            name: `Defender ${i + 1}`,
            position: 'Defender',
            jersey_number: i + 10,
            age: 24 + i,
            nationality: 'Country'
          })),
          midfielders: Array.from({ length: 6 }, (_, i) => ({
            id: `mid${i}`,
            name: `Midfielder ${i + 1}`,
            position: 'Midfielder',
            jersey_number: i + 20,
            age: 23 + i,
            nationality: 'Country'
          })),
          forwards: Array.from({ length: 4 }, (_, i) => ({
            id: `fwd${i}`,
            name: `Forward ${i + 1}`,
            position: 'Forward',
            jersey_number: i + 30,
            age: 22 + i,
            nationality: 'Country'
          }))
        },
        coaches: Array.from({ length: 5 }, (_, i) => ({
          id: `coach${i}`,
          name: `Coach ${i + 1}`,
          position: i === 0 ? 'Manager' : 'Assistant',
          nationality: 'Country',
          age: 40 + i
        }))
      }

      mockTeamDataFetcher.getSquad.mockResolvedValue(largeSquadData)

      const request = createTeamRequest(teamId, 'squad')
      const response = await executeEndpoint(teamSquadEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertSquadResponse(response)
      
      // Verify large squad counts
      expect(response.data.players.goalkeepers).toHaveLength(3)
      expect(response.data.players.defenders).toHaveLength(8)
      expect(response.data.players.midfielders).toHaveLength(6)
      expect(response.data.players.forwards).toHaveLength(4)
      expect(response.data.coaches).toHaveLength(5)
      
      // Verify total player count
      const totalPlayers = response.data.players.goalkeepers.length +
                          response.data.players.defenders.length +
                          response.data.players.midfielders.length +
                          response.data.players.forwards.length
      expect(totalPlayers).toBe(21)
    })

    it('should handle missing team ID in URL', async () => {
      const request = createTeamRequest('', 'squad')
      const response = await executeEndpoint(teamSquadEndpoint, request)

      response.expectStatus(400).expectError('Team ID is required')
    })

    it('should handle data fetcher errors gracefully', async () => {
      const teamId = '123'
      
      mockTeamDataFetcher.getSquad.mockRejectedValue(new Error('Squad data not available'))
      
      const request = createTeamRequest(teamId, 'squad')
      const response = await executeEndpoint(teamSquadEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching team squad')
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

      const response = await executeEndpoint(teamSquadEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should handle players with minimal data', async () => {
      const teamId = '555'
      
      const minimalSquadData = {
        players: {
          goalkeepers: [
            {
              id: '1',
              name: 'Minimal Keeper',
              position: 'Goalkeeper'
              // Missing optional fields like age, height, etc.
            }
          ],
          defenders: [],
          midfielders: [],
          forwards: []
        },
        coaches: [
          {
            id: '100',
            name: 'Minimal Coach',
            position: 'Manager'
            // Missing optional fields
          }
        ]
      }

      mockTeamDataFetcher.getSquad.mockResolvedValue(minimalSquadData)

      const request = createTeamRequest(teamId, 'squad')
      const response = await executeEndpoint(teamSquadEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertSquadResponse(response)
      
      // Verify minimal data is handled
      const player = response.data.players.goalkeepers[0]
      expect(player.id).toBe('1')
      expect(player.name).toBe('Minimal Keeper')
      expect(player.position).toBe('Goalkeeper')
      
      const coach = response.data.coaches[0]
      expect(coach.id).toBe('100')
      expect(coach.name).toBe('Minimal Coach')
      expect(coach.position).toBe('Manager')
    })
  })
})