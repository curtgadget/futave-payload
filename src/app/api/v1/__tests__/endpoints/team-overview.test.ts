import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createTeamRequest,
  executeEndpoint,
  apiTestSetup,
  teamEndpointAssertions,
  mockTeamDataFetcher,
  mockPayload,
  APIResponse,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import teamOverviewEndpoint from '../../teams'

describe('Team Overview API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()

    // Default mock for findByID to return a team
    mockPayload.findByID.mockResolvedValue({
      id: 123,
      name: 'Test Team',
      activeseasons: [{ id: 20, name: '2023-24', league_id: 8 }],
      season_map: [],
    })
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/team/:id/overview', () => {
    it('should have correct endpoint configuration', () => {
      expect(teamOverviewEndpoint.path).toBe('/v1/team/:id/overview')
      expect(teamOverviewEndpoint.method).toBe('get')
      expect(typeof teamOverviewEndpoint.handler).toBe('function')
    })

    it('should return team overview data successfully', async () => {
      // Setup mock data
      const teamId = '123'
      const mockFixturesData = {
        docs: [
          {
            id: '1',
            starting_at: '2024-01-10T15:00:00Z',
            final_score: { home: 2, away: 1 },
            participants: [
              { id: 123, name: 'Test Team', meta: { location: 'home' } },
              { id: 456, name: 'Opponent Team', meta: { location: 'away' } },
            ],
          },
          {
            id: '2',
            starting_at: '2024-01-05T20:00:00Z',
            final_score: { home: 0, away: 3 },
            participants: [
              { id: 789, name: 'Away Team', meta: { location: 'home' } },
              { id: 123, name: 'Test Team', meta: { location: 'away' } },
            ],
          },
        ],
        nextMatch: {
          starting_at: '2024-01-20T15:00:00Z',
          league: { id: 8, name: 'Premier League' },
          home_team: { id: 123, name: 'Test Team' },
          away_team: { id: 999, name: 'Next Opponent' },
        },
      }

      const mockTableData = {
        '20': {
          id: 1,
          name: 'Premier League',
          standings: [
            {
              id: 1,
              name: 'Premier League Table',
              standings: [
                {
                  team_id: 123,
                  position: 5,
                  points: 45,
                  played: 25,
                  goal_difference: 8,
                  form: 'WWLDW',
                  qualification_status: null,
                },
              ],
            },
          ],
        },
      }

      const mockStatsData = {
        current_season: {},
        season_id: 20,
        seasons: [{ id: 20, name: '2023-24' }],
        top_stats: [
          {
            category: 'goals',
            players: [{ player_id: '1', name: 'Striker One', value: 15, position: 'Forward' }],
          },
          {
            category: 'assists',
            players: [{ player_id: '2', name: 'Midfielder One', value: 8, position: 'Midfielder' }],
          },
          {
            category: 'rating',
            players: [{ player_id: '3', name: 'Defender One', value: 7.8, position: 'Defender' }],
          },
        ],
      }

      // Setup mocks
      mockTeamDataFetcher.getFixtures.mockResolvedValue(mockFixturesData)
      mockTeamDataFetcher.getTable.mockResolvedValue(mockTableData)
      mockTeamDataFetcher.getStats.mockResolvedValue(mockStatsData)

      const request = createTeamRequest(teamId, 'overview')
      const response = await executeEndpoint(teamOverviewEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertOverviewResponse(response)

      // Verify specific data
      expect(response.data.id).toBe(teamId)
      expect(response.data.season_id).toBe(20)
      expect(response.data.season_name).toBe('2023-24')
      expect(response.data.next_match).toEqual(mockFixturesData.nextMatch)

      // Verify form calculation
      expect(Array.isArray(response.data.form)).toBe(true)
      expect(response.data.form.length).toBeLessThanOrEqual(5)

      // Verify current position
      expect(response.data.current_position).toEqual({
        position: 5,
        points: 45,
        played: 25,
        goal_difference: 8,
        form: ['W', 'W', 'L', 'D', 'W'],
        qualification_status: null,
      })

      // Verify top stats structure
      expect(response.data.stats.top_scorers).toHaveLength(1)
      expect(response.data.stats.top_assists).toHaveLength(1)
      expect(response.data.stats.top_rated).toHaveLength(1)

      // Verify recent fixtures
      expect(Array.isArray(response.data.recent_fixtures)).toBe(true)
      expect(response.data.recent_fixtures.length).toBeLessThanOrEqual(3)
    })

    it('should handle missing team ID in URL', async () => {
      const request = createTeamRequest('', 'overview')
      const response = await executeEndpoint(teamOverviewEndpoint, request)

      response.expectStatus(400).expectError('Team ID is required')
    })

    it('should handle data fetcher errors gracefully', async () => {
      const teamId = '123'

      // Setup one of the fetchers to fail
      mockTeamDataFetcher.getFixtures.mockRejectedValue(new Error('Database connection failed'))

      const request = createTeamRequest(teamId, 'overview')
      const response = await executeEndpoint(teamOverviewEndpoint, request)

      response.expectStatus(500).expectError('Failed to fetch team overview')
      expect(response.data.details).toContain('Database connection failed')
    })

    it('should handle partial data gracefully', async () => {
      const teamId = '456'

      // Setup minimal mock data
      mockTeamDataFetcher.getFixtures.mockResolvedValue({
        docs: [],
        nextMatch: null,
      })
      mockTeamDataFetcher.getTable.mockResolvedValue({})
      mockTeamDataFetcher.getStats.mockResolvedValue({
        season_id: 20,
        seasons: [],
        top_stats: [],
        current_season: {},
      })

      const request = createTeamRequest(teamId, 'overview')
      const response = await executeEndpoint(teamOverviewEndpoint, request)

      response.expectStatus(200).expectSuccess()
      teamEndpointAssertions.assertOverviewResponse(response)

      // Verify defaults for missing data
      expect(response.data.form).toEqual([])
      expect(response.data.next_match).toBeNull()
      expect(response.data.current_position).toBeNull()
      expect(response.data.stats.top_scorers).toEqual([])
      expect(response.data.stats.top_assists).toEqual([])
      expect(response.data.stats.top_rated).toEqual([])
      expect(response.data.recent_fixtures).toEqual([])
    })

    it('should calculate team form correctly for different scenarios', async () => {
      const teamId = '123'

      // Test scenarios with different match results
      const testCases = [
        {
          name: 'all wins',
          matches: [
            {
              final_score: { home: 3, away: 1 },
              participants: [
                { id: 123, meta: { location: 'home' } },
                { id: 456, meta: { location: 'away' } },
              ],
            },
            {
              final_score: { home: 0, away: 2 },
              participants: [
                { id: 789, meta: { location: 'home' } },
                { id: 123, meta: { location: 'away' } },
              ],
            },
          ],
          expectedResults: ['W', 'W'],
        },
        {
          name: 'mixed results',
          matches: [
            {
              final_score: { home: 1, away: 1 },
              participants: [
                { id: 123, meta: { location: 'home' } },
                { id: 456, meta: { location: 'away' } },
              ],
            },
            {
              final_score: { home: 2, away: 0 },
              participants: [
                { id: 789, meta: { location: 'home' } },
                { id: 123, meta: { location: 'away' } },
              ],
            },
          ],
          expectedResults: ['D', 'L'],
        },
      ]

      for (const testCase of testCases) {
        mockTeamDataFetcher.getFixtures.mockResolvedValue({
          docs: testCase.matches.map((match, index) => ({
            id: index.toString(),
            starting_at: `2024-01-${10 + index}T15:00:00Z`,
            ...match,
          })),
          nextMatch: null,
        })
        mockTeamDataFetcher.getTable.mockResolvedValue({})
        mockTeamDataFetcher.getStats.mockResolvedValue({
          season_id: 20,
          seasons: [],
          top_stats: [],
          current_season: {},
        })

        const request = createTeamRequest(teamId, 'overview')
        const response = await executeEndpoint(teamOverviewEndpoint, request)

        response.expectStatus(200)

        const formResults = response.data.form.map((match: any) => match.result)
        expect(formResults).toEqual(testCase.expectedResults)
      }
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

      const response = await executeEndpoint(teamOverviewEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should limit form to maximum 5 matches', async () => {
      const teamId = '123'

      // Create 10 matches but expect only 5 in form
      const matches = Array.from({ length: 10 }, (_, i) => ({
        id: i.toString(),
        starting_at: `2024-01-${10 + i}T15:00:00Z`,
        final_score: { home: 2, away: 1 },
        participants: [
          { id: 123, meta: { location: 'home' } },
          { id: 456 + i, meta: { location: 'away' } },
        ],
      }))

      mockTeamDataFetcher.getFixtures.mockResolvedValue({
        docs: matches,
        nextMatch: null,
      })
      mockTeamDataFetcher.getTable.mockResolvedValue({})
      mockTeamDataFetcher.getStats.mockResolvedValue({
        season_id: 20,
        seasons: [],
        top_stats: [],
        current_season: {},
      })

      const request = createTeamRequest(teamId, 'overview')
      const response = await executeEndpoint(teamOverviewEndpoint, request)

      response.expectStatus(200)
      expect(response.data.form).toHaveLength(5)
    })

    it('should limit recent fixtures to maximum 3 matches', async () => {
      const teamId = '123'

      const matches = Array.from({ length: 8 }, (_, i) => ({
        id: i.toString(),
        starting_at: `2024-01-${10 + i}T15:00:00Z`,
        final_score: { home: 1, away: 0 },
        participants: [
          { id: 123, meta: { location: 'home' } },
          { id: 456 + i, meta: { location: 'away' } },
        ],
      }))

      mockTeamDataFetcher.getFixtures.mockResolvedValue({
        docs: matches,
        nextMatch: null,
      })
      mockTeamDataFetcher.getTable.mockResolvedValue({})
      mockTeamDataFetcher.getStats.mockResolvedValue({
        season_id: 20,
        seasons: [],
        top_stats: [],
        current_season: {},
      })

      const request = createTeamRequest(teamId, 'overview')
      const response = await executeEndpoint(teamOverviewEndpoint, request)

      response.expectStatus(200)
      expect(response.data.recent_fixtures).toHaveLength(3)
    })
  })
})
