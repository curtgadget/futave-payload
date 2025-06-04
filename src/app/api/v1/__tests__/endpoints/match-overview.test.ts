import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createMatchRequest,
  executeEndpoint,
  apiTestSetup,
  matchEndpointAssertions,
  mockPayload,
  APIResponse,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import matchEndpoint from '../../match'

describe('Match Overview API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/match/:id', () => {
    it('should have correct endpoint configuration', () => {
      expect(matchEndpoint.path).toBe('/v1/match/:id/:tab?')
      expect(matchEndpoint.method).toBe('get')
      expect(typeof matchEndpoint.handler).toBe('function')
    })

    it('should return match overview data successfully', async () => {
      const matchId = '19419265'
      const mockMatchData = {
        id: 19419265,
        participants: [
          {
            id: 246,
            name: 'Ross County',
            image_path: 'https://cdn.sportmonks.com/images/soccer/teams/22/246.png',
            meta: { location: 'home', winner: false, position: 2 }
          },
          {
            id: 258,
            name: 'Livingston',
            image_path: 'https://cdn.sportmonks.com/images/soccer/teams/2/258.png',
            meta: { location: 'away', winner: true, position: 1 }
          }
        ],
        scores: [
          { participant_id: 246, description: '2ND_HALF', score: { goals: 1 } },
          { participant_id: 258, description: '2ND_HALF', score: { goals: 2 } }
        ],
        league_id: 501,
        starting_at: '2025-05-26T19:00:00Z',
        state: { short_name: 'FT', state: 'finished' },
        venue: { name: 'Global Energy Stadium', city: 'Dingwall' },
        lineups: [
          {
            team_id: 246,
            player_id: 1001,
            player_name: 'Ross Laidlaw',
            jersey_number: 1,
            position_id: 24,
            type_id: 11,
            formation_field: '1',
            formation_position: '1'
          },
          {
            team_id: 258,
            player_id: 2001,
            player_name: 'Shamal George',
            jersey_number: 31,
            position_id: 24,
            type_id: 11,
            formation_field: '1',
            formation_position: '1'
          }
        ],
        coaches: [
          {
            id: 1264,
            display_name: 'Don Cowie',
            name: 'Don Cowie',
            common_name: 'D. Cowie',
            image_path: 'https://cdn.sportmonks.com/images/soccer/placeholder.png',
            nationality_id: 1161,
            date_of_birth: '1983-02-15',
            meta: { fixture_id: 19419265, coach_id: 1264, participant_id: 246 }
          },
          {
            id: 19256146,
            display_name: 'David Martindale',
            name: 'David Martindale',
            common_name: 'D. Martindale',
            image_path: 'https://cdn.sportmonks.com/images/soccer/placeholder.png',
            nationality_id: 1161,
            date_of_birth: '1974-07-13',
            meta: { fixture_id: 19419265, coach_id: 19256146, participant_id: 258 }
          }
        ],
        events: [],
        sidelined: [],
        metadata: [
          {
            type_id: 159,
            values: { home: '3-4-1-2', away: '4-3-3' }
          }
        ]
      }

      const mockLeague = {
        id: 501,
        name: 'Scottish Premiership',
        logo_path: 'https://cdn.sportmonks.com/images/soccer/leagues/5/501.png',
        country_id: 1161
      }

      const mockHomeTeam = {
        id: 246,
        name: 'Ross County',
        logo_path: 'https://cdn.sportmonks.com/images/soccer/teams/22/246.png',
        country_id: 1161
      }

      const mockAwayTeam = {
        id: 258,
        name: 'Livingston',
        logo_path: 'https://cdn.sportmonks.com/images/soccer/teams/2/258.png',
        country_id: 1161
      }

      // Setup mocks
      mockPayload.findByID
        .mockResolvedValueOnce(mockMatchData) // match
        .mockResolvedValueOnce(mockHomeTeam)   // home team
        .mockResolvedValueOnce(mockAwayTeam)   // away team
        .mockResolvedValueOnce(mockLeague)     // league

      const request = createMatchRequest(matchId)
      const response = await executeEndpoint(matchEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      matchEndpointAssertions.assertOverviewResponse(response)

      // Verify specific data
      expect(response.data.data.id).toBe(19419265)
      expect(response.data.data.homeTeam.name).toBe('Ross County')
      expect(response.data.data.awayTeam.name).toBe('Livingston')
      expect(response.data.data.score.home).toBe(1)
      expect(response.data.data.score.away).toBe(2)
      expect(response.data.data.status).toBe('FT')

      // Verify coach information
      matchEndpointAssertions.assertCoachInformation(response, 'overview')
      expect(response.data.data.lineups.home.coach.coach_name).toBe('Don Cowie')
      expect(response.data.data.lineups.away.coach.coach_name).toBe('David Martindale')
    })

    it('should handle missing match ID', async () => {
      mockPayload.findByID.mockResolvedValueOnce(null)
      
      const request = createMatchRequest('')
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(404).expectError('Match not found')
    })

    it('should handle match not found', async () => {
      const matchId = '999999'
      
      mockPayload.findByID.mockResolvedValueOnce(null)

      const request = createMatchRequest(matchId)
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(404).expectError('Match not found')
    })

    it('should handle payload initialization errors', async () => {
      const matchId = '123'
      
      mockPayload.findByID.mockRejectedValueOnce(new Error('Database connection failed'))

      const request = createMatchRequest(matchId)
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(500).expectError('Internal server error')
    })

    it('should handle match without coaches', async () => {
      const matchId = '123'
      const mockMatchData = {
        id: 123,
        participants: [
          { id: 1, name: 'Team A', meta: { location: 'home' } },
          { id: 2, name: 'Team B', meta: { location: 'away' } }
        ],
        scores: [],
        league_id: 8,
        starting_at: '2024-01-01T15:00:00Z',
        state: { short_name: 'NS', state: 'not_started' },
        lineups: [],
        coaches: [], // No coaches
        events: [],
        sidelined: [],
        metadata: []
      }

      const mockLeague = { id: 8, name: 'Premier League' }
      const mockTeamA = { id: 1, name: 'Team A' }
      const mockTeamB = { id: 2, name: 'Team B' }

      mockPayload.findByID
        .mockResolvedValueOnce(mockMatchData)
        .mockResolvedValueOnce(mockTeamA)
        .mockResolvedValueOnce(mockTeamB)
        .mockResolvedValueOnce(mockLeague)

      const request = createMatchRequest(matchId)
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(200).expectSuccess()
      matchEndpointAssertions.assertOverviewResponse(response)

      // Verify coaches are null when not present
      expect(response.data.data.lineups.home.coach).toBeNull()
      expect(response.data.data.lineups.away.coach).toBeNull()
    })

    it('should handle match with partial lineup data', async () => {
      const matchId = '456'
      const mockMatchData = {
        id: 456,
        participants: [
          { id: 10, name: 'Home Team', meta: { location: 'home' } },
          { id: 20, name: 'Away Team', meta: { location: 'away' } }
        ],
        scores: [],
        league_id: 82,
        starting_at: '2024-01-15T20:00:00Z',
        state: { short_name: 'LIVE', state: 'inplay' },
        lineups: [
          {
            team_id: 10,
            player_id: 1001,
            player_name: 'Player One',
            jersey_number: 9,
            type_id: 11
          }
        ],
        coaches: [
          {
            id: 500,
            display_name: 'Coach A',
            meta: { participant_id: 10 }
          }
        ],
        events: [],
        sidelined: [],
        metadata: []
      }

      const mockLeague = { id: 82, name: 'Bundesliga' }
      const mockHomeTeam = { id: 10, name: 'Home Team' }
      const mockAwayTeam = { id: 20, name: 'Away Team' }

      mockPayload.findByID
        .mockResolvedValueOnce(mockMatchData)
        .mockResolvedValueOnce(mockHomeTeam)
        .mockResolvedValueOnce(mockAwayTeam)
        .mockResolvedValueOnce(mockLeague)

      const request = createMatchRequest(matchId)
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(200).expectSuccess()
      matchEndpointAssertions.assertOverviewResponse(response)

      // Verify home team has coach but away team doesn't
      expect(response.data.data.lineups.home.coach.coach_name).toBe('Coach A')
      expect(response.data.data.lineups.away.coach).toBeNull()
      
      // Verify starting XI data
      expect(response.data.data.lineups.home.startingXI).toHaveLength(1)
      expect(response.data.data.lineups.away.startingXI).toHaveLength(0)
    })

    it('should handle invalid URL format', async () => {
      mockPayload.findByID.mockResolvedValueOnce(null)
      
      const request = {
        url: null,
        method: 'GET',
        headers: new Headers(),
        payload: mockPayload,
        user: null,
        locale: 'en',
        fallbackLocale: 'en',
        t: jest.fn(),
        i18n: {} as any,
        context: {},
        responseType: 'json',
      } as any

      const response = await executeEndpoint(matchEndpoint, request)
      response.expectStatus(404).expectError('Match not found')
    })

    it('should extract formation from metadata correctly', async () => {
      const matchId = '789'
      const mockMatchData = {
        id: 789,
        participants: [
          { id: 100, name: 'Team X', meta: { location: 'home' } },
          { id: 200, name: 'Team Y', meta: { location: 'away' } }
        ],
        scores: [],
        league_id: 301,
        starting_at: '2024-02-01T18:00:00Z',
        state: { short_name: 'NS' },
        lineups: [],
        coaches: [],
        events: [],
        sidelined: [],
        metadata: [
          {
            type_id: 159,
            type: { code: 'formation' },
            values: { home: '4-4-2', away: '3-5-2' }
          }
        ]
      }

      const mockLeague = { id: 301, name: 'Ligue 1' }
      const mockTeamX = { id: 100, name: 'Team X' }
      const mockTeamY = { id: 200, name: 'Team Y' }

      mockPayload.findByID
        .mockResolvedValueOnce(mockMatchData)
        .mockResolvedValueOnce(mockTeamX)
        .mockResolvedValueOnce(mockTeamY)
        .mockResolvedValueOnce(mockLeague)

      const request = createMatchRequest(matchId)
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify formations are extracted correctly
      expect(response.data.data.lineups.home.formation).toBe('4-4-2')
      expect(response.data.data.lineups.away.formation).toBe('3-5-2')
    })
  })
})