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

describe('Match Lineups API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/match/:id/lineups', () => {
    it('should return match lineups data successfully', async () => {
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
        lineups: [
          // Starting XI
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
            team_id: 246,
            player_id: 1002,
            player_name: 'Connor Randall',
            jersey_number: 2,
            position_id: 25,
            type_id: 11,
            formation_field: '2',
            formation_position: '2'
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
          },
          {
            team_id: 258,
            player_id: 2002,
            player_name: 'Joel Nouble',
            jersey_number: 19,
            position_id: 27,
            type_id: 11,
            formation_field: '3',
            formation_position: '9'
          },
          // Bench players
          {
            team_id: 246,
            player_id: 1003,
            player_name: 'Jack Baldwin',
            jersey_number: 5,
            position_id: 25,
            type_id: 12,
            formation_field: null,
            formation_position: null
          },
          {
            team_id: 258,
            player_id: 2003,
            player_name: 'Michael Nottingham',
            jersey_number: 6,
            position_id: 25,
            type_id: 12,
            formation_field: null,
            formation_position: null
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
        events: [
          {
            id: 1,
            player_id: 2002,
            type: 'goal',
            minute: 45
          }
        ],
        sidelined: [
          {
            participant_id: 246,
            sideline: {
              player_id: 1004,
              type_id: 1,
              category: 'injury',
              start_date: '2024-01-01',
              end_date: '2024-02-01',
              games_missed: 5,
              completed: false
            }
          }
        ],
        metadata: [
          {
            type_id: 159,
            values: { home: '3-4-1-2', away: '4-3-3' }
          }
        ]
      }

      const mockHomeTeam = {
        id: 246,
        name: 'Ross County'
      }

      const mockAwayTeam = {
        id: 258,
        name: 'Livingston'
      }

      // Setup mocks
      mockPayload.findByID
        .mockResolvedValueOnce(mockMatchData) // match
        .mockResolvedValueOnce(mockHomeTeam)   // home team
        .mockResolvedValueOnce(mockAwayTeam)   // away team

      const request = createMatchRequest(matchId, 'lineups')
      const response = await executeEndpoint(matchEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      matchEndpointAssertions.assertLineupsResponse(response)

      // Verify lineup data
      const homeLineup = response.data.lineups.home
      const awayLineup = response.data.lineups.away

      // Check formations
      expect(homeLineup.formation).toBe('3-4-1-2')
      expect(awayLineup.formation).toBe('4-3-3')

      // Check starting XI
      expect(homeLineup.startingXI).toHaveLength(2)
      expect(awayLineup.startingXI).toHaveLength(2)

      // Check bench
      expect(homeLineup.bench).toHaveLength(1)
      expect(awayLineup.bench).toHaveLength(1)

      // Check sidelined players
      expect(homeLineup.sidelined).toHaveLength(1)
      expect(awayLineup.sidelined).toHaveLength(0)

      // Verify coach information
      matchEndpointAssertions.assertCoachInformation(response, 'lineups')
      expect(homeLineup.coach.coach_name).toBe('Don Cowie')
      expect(homeLineup.coach.coach_id).toBe(1264)
      expect(awayLineup.coach.coach_name).toBe('David Martindale')
      expect(awayLineup.coach.coach_id).toBe(19256146)

      // Verify player events are attached
      const awayStriker = awayLineup.startingXI.find((p: any) => p.player_id === 2002)
      expect(awayStriker.events).toHaveLength(1)
      expect(awayStriker.events[0].type).toBe('goal')

      // Verify sidelined player structure
      const sidelinedPlayer = homeLineup.sidelined[0]
      expect(sidelinedPlayer).toHaveProperty('player_id')
      expect(sidelinedPlayer).toHaveProperty('category')
      expect(sidelinedPlayer).toHaveProperty('start_date')
      expect(sidelinedPlayer).toHaveProperty('end_date')
      expect(sidelinedPlayer).toHaveProperty('games_missed')
      expect(sidelinedPlayer).toHaveProperty('completed')
    })

    it('should handle lineups tab with missing formation metadata', async () => {
      const matchId = '123'
      const mockMatchData = {
        id: 123,
        participants: [
          { id: 1, name: 'Team A', meta: { location: 'home' } },
          { id: 2, name: 'Team B', meta: { location: 'away' } }
        ],
        lineups: [
          {
            team_id: 1,
            player_id: 101,
            player_name: 'Player A',
            jersey_number: 10,
            type_id: 11
          }
        ],
        coaches: [],
        events: [],
        sidelined: [],
        metadata: [] // No formation metadata
      }

      const mockTeamA = { id: 1, name: 'Team A' }
      const mockTeamB = { id: 2, name: 'Team B' }

      mockPayload.findByID
        .mockResolvedValueOnce(mockMatchData)
        .mockResolvedValueOnce(mockTeamA)
        .mockResolvedValueOnce(mockTeamB)

      const request = createMatchRequest(matchId, 'lineups')
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(200).expectSuccess()
      matchEndpointAssertions.assertLineupsResponse(response)

      // Verify formations are null when metadata is missing
      expect(response.data.lineups.home.formation).toBeNull()
      expect(response.data.lineups.away.formation).toBeNull()
    })

    it('should handle lineups tab with no lineup data', async () => {
      const matchId = '456'
      const mockMatchData = {
        id: 456,
        participants: [
          { id: 10, name: 'Home Team', meta: { location: 'home' } },
          { id: 20, name: 'Away Team', meta: { location: 'away' } }
        ],
        lineups: [], // No lineup data
        coaches: [],
        events: [],
        sidelined: [],
        metadata: []
      }

      const mockHomeTeam = { id: 10, name: 'Home Team' }
      const mockAwayTeam = { id: 20, name: 'Away Team' }

      mockPayload.findByID
        .mockResolvedValueOnce(mockMatchData)
        .mockResolvedValueOnce(mockHomeTeam)
        .mockResolvedValueOnce(mockAwayTeam)

      const request = createMatchRequest(matchId, 'lineups')
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(200).expectSuccess()
      matchEndpointAssertions.assertLineupsResponse(response)

      // Verify empty lineup arrays
      expect(response.data.lineups.home.startingXI).toHaveLength(0)
      expect(response.data.lineups.away.startingXI).toHaveLength(0)
      expect(response.data.lineups.home.bench).toHaveLength(0)
      expect(response.data.lineups.away.bench).toHaveLength(0)
      expect(response.data.lineups.home.sidelined).toHaveLength(0)
      expect(response.data.lineups.away.sidelined).toHaveLength(0)
      expect(response.data.lineups.home.coach).toBeNull()
      expect(response.data.lineups.away.coach).toBeNull()
    })

    it('should filter lineups correctly by type_id', async () => {
      const matchId = '789'
      const mockMatchData = {
        id: 789,
        participants: [
          { id: 100, name: 'Team X', meta: { location: 'home' } },
          { id: 200, name: 'Team Y', meta: { location: 'away' } }
        ],
        lineups: [
          // Starting XI (type_id: 11)
          { team_id: 100, player_id: 1001, player_name: 'Starter 1', type_id: 11 },
          { team_id: 100, player_id: 1002, player_name: 'Starter 2', type_id: 11 },
          { team_id: 200, player_id: 2001, player_name: 'Starter 3', type_id: 11 },
          
          // Bench (type_id: 12)
          { team_id: 100, player_id: 1003, player_name: 'Sub 1', type_id: 12 },
          { team_id: 200, player_id: 2002, player_name: 'Sub 2', type_id: 12 },
          { team_id: 200, player_id: 2003, player_name: 'Sub 3', type_id: 12 },
          
          // Other type (should be ignored)
          { team_id: 100, player_id: 1004, player_name: 'Other', type_id: 99 }
        ],
        coaches: [],
        events: [],
        sidelined: [],
        metadata: []
      }

      const mockTeamX = { id: 100, name: 'Team X' }
      const mockTeamY = { id: 200, name: 'Team Y' }

      mockPayload.findByID
        .mockResolvedValueOnce(mockMatchData)
        .mockResolvedValueOnce(mockTeamX)
        .mockResolvedValueOnce(mockTeamY)

      const request = createMatchRequest(matchId, 'lineups')
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify correct filtering by type_id
      expect(response.data.lineups.home.startingXI).toHaveLength(2) // Team 100 has 2 starters
      expect(response.data.lineups.home.bench).toHaveLength(1)      // Team 100 has 1 sub
      expect(response.data.lineups.away.startingXI).toHaveLength(1) // Team 200 has 1 starter
      expect(response.data.lineups.away.bench).toHaveLength(2)      // Team 200 has 2 subs

      // Verify type_id 99 is ignored
      const allPlayers = [
        ...response.data.lineups.home.startingXI,
        ...response.data.lineups.home.bench,
        ...response.data.lineups.away.startingXI,
        ...response.data.lineups.away.bench
      ]
      expect(allPlayers.find((p: any) => p.player_name === 'Other')).toBeUndefined()
    })

    it('should handle coach fallback from different name fields', async () => {
      const matchId = '321'
      const mockMatchData = {
        id: 321,
        participants: [
          { id: 50, name: 'Team Alpha', meta: { location: 'home' } },
          { id: 60, name: 'Team Beta', meta: { location: 'away' } }
        ],
        lineups: [],
        coaches: [
          {
            id: 501,
            display_name: null,
            name: 'Full Coach Name',
            common_name: 'F. Coach',
            meta: { participant_id: 50 }
          },
          {
            id: 502,
            display_name: null,
            name: null,
            common_name: 'Common Coach',
            meta: { participant_id: 60 }
          }
        ],
        events: [],
        sidelined: [],
        metadata: []
      }

      const mockTeamAlpha = { id: 50, name: 'Team Alpha' }
      const mockTeamBeta = { id: 60, name: 'Team Beta' }

      mockPayload.findByID
        .mockResolvedValueOnce(mockMatchData)
        .mockResolvedValueOnce(mockTeamAlpha)
        .mockResolvedValueOnce(mockTeamBeta)

      const request = createMatchRequest(matchId, 'lineups')
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify coach name fallback logic
      expect(response.data.lineups.home.coach.coach_name).toBe('Full Coach Name') // falls back to 'name'
      expect(response.data.lineups.away.coach.coach_name).toBe('Common Coach')    // falls back to 'common_name'
    })

    it('should handle unrecognized tab names', async () => {
      const matchId = '123'
      const mockMatchData = {
        id: 123,
        participants: [
          { id: 1, name: 'Team A', meta: { location: 'home' } },
          { id: 2, name: 'Team B', meta: { location: 'away' } }
        ],
        lineups: [],
        coaches: [],
        events: [],
        sidelined: [],
        metadata: []
      }

      mockPayload.findByID.mockResolvedValueOnce(mockMatchData)

      const request = createMatchRequest(matchId, 'invalidtab')
      const response = await executeEndpoint(matchEndpoint, request)

      response.expectStatus(400).expectError('Tab not implemented yet')
    })
  })
})