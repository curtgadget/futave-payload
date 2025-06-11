import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import type { PayloadRequest } from 'payload'

// Mock dependencies
const mockPayload = {
  find: jest.fn() as any,
}

jest.mock('payload', () => ({
  getPayload: jest.fn(() => Promise.resolve(mockPayload))
}))

jest.mock('@payload-config', () => ({}))

// Import the handler after mocks
import matchesWavesHandler from '../../matchesWaves'

// Test data
const createMockMatch = (overrides = {}): any => ({
  id: 1,
  starting_at: '2024-12-25T15:00:00Z',
  state: { short_name: 'NS', state: 'NOT_STARTED' },
  participants: [
    {
      id: 10,
      name: 'Home United',
      short_code: 'HMU',
      image_path: 'home.png',
      meta: { location: 'home' }
    },
    {
      id: 20,
      name: 'Away City',
      short_code: 'AWC',
      image_path: 'away.png',
      meta: { location: 'away' }
    }
  ],
  scores: [],
  league: {
    id: 100,
    name: 'Premier League',
    logo_path: 'league.png',
    country_id: 1
  },
  league_id: 100,
  wave_score: {
    total: 75,
    tier: 'A',
    factors: {
      rivalry: 25,
      position: 18,
      zone: 15,
      form: 10,
      h2h: 5,
      timing: 2
    }
  },
  ...overrides
})

describe('Matches Waves API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Endpoint Configuration', () => {
    it('should have correct endpoint configuration', () => {
      expect(matchesWavesHandler.path).toBe('/v1/matches/waves')
      expect(matchesWavesHandler.method).toBe('get')
      expect(typeof matchesWavesHandler.handler).toBe('function')
    })
  })

  describe('Basic Functionality', () => {
    it('should return wave matches with default parameters', async () => {
      const mockMatches = [
        createMockMatch({ id: 1, wave_score: { total: 85, tier: 'S' } }),
        createMockMatch({ id: 2, wave_score: { total: 75, tier: 'A' } }),
        createMockMatch({ id: 3, wave_score: { total: 65, tier: 'A' } })
      ]

      mockPayload.find.mockResolvedValue({
        docs: mockMatches,
        totalDocs: 3,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.matches).toHaveLength(3)
      expect(data.matches[0].wave_score.total).toBe(85)
      expect(data.meta).toMatchObject({
        total: 3,
        page: 1,
        limit: 20,
        filters: {}
      })
    })

    it('should filter out matches without wave scores', async () => {
      const mockMatches = [
        createMockMatch({ id: 1, wave_score: { total: 85, tier: 'S' } }),
        createMockMatch({ id: 2, wave_score: null }),
        createMockMatch({ id: 3, wave_score: { total: undefined } }),
        createMockMatch({ id: 4, wave_score: { total: 65, tier: 'A' } })
      ]

      mockPayload.find.mockResolvedValue({
        docs: mockMatches,
        totalDocs: 4,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.matches).toHaveLength(2)
      expect(data.matches[0].id).toBe(1)
      expect(data.matches[1].id).toBe(4)
    })
  })

  describe('Query Parameters', () => {
    it('should handle minimum score filtering', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [createMockMatch({ wave_score: { total: 75, tier: 'A' } })],
        totalDocs: 1,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves?min_score=60'
      } as PayloadRequest

      await matchesWavesHandler.handler(mockRequest)

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'matches',
          where: expect.objectContaining({
            'wave_score.total': { greater_than_equal: 60 }
          }),
          sort: '-wave_score.total',
          limit: 20,
          page: 1
        })
      )
    })

    it('should handle date filtering', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [],
        totalDocs: 0,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves?date=2024-12-25'
      } as PayloadRequest

      await matchesWavesHandler.handler(mockRequest)

      const callArgs = mockPayload.find.mock.calls[0][0]
      expect(callArgs.where.starting_at).toBeDefined()
      // Just verify that date filtering was applied
      expect(callArgs.where.starting_at.greater_than_equal).toBeDefined()
      expect(callArgs.where.starting_at.less_than_equal).toBeDefined()
      
      // The exact time values depend on timezone, so just check it's a valid date range
      const startDate = new Date(callArgs.where.starting_at.greater_than_equal)
      const endDate = new Date(callArgs.where.starting_at.less_than_equal)
      expect(startDate).toBeInstanceOf(Date)
      expect(endDate).toBeInstanceOf(Date)
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime())
    })

    it('should use current date when date not provided', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [],
        totalDocs: 0,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      await matchesWavesHandler.handler(mockRequest)

      const callArgs = mockPayload.find.mock.calls[0][0]
      expect(callArgs.where.starting_at).toBeDefined()
    })

    it('should handle league filtering', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [],
        totalDocs: 0,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves?league_id=100'
      } as PayloadRequest

      await matchesWavesHandler.handler(mockRequest)

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            league_id: { equals: 100 }
          })
        })
      )
    })

    it('should handle pagination', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [],
        totalDocs: 100,
        page: 3,
        limit: 10
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves?page=3&limit=10'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          page: 3
        })
      )

      expect(data.meta).toMatchObject({
        total: 100,
        page: 3,
        limit: 10
      })
    })

    it('should limit max results per page to 100', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [],
        totalDocs: 0,
        page: 1,
        limit: 100
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves?limit=500'
      } as PayloadRequest

      await matchesWavesHandler.handler(mockRequest)

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100
        })
      )
    })

    it('should combine multiple filters', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [],
        totalDocs: 0,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves?date=2024-12-25&league_id=100&min_score=70'
      } as PayloadRequest

      await matchesWavesHandler.handler(mockRequest)

      const callArgs = mockPayload.find.mock.calls[0][0]
      expect(callArgs.where['wave_score.total']).toEqual({ greater_than_equal: 70 })
      expect(callArgs.where.league_id).toEqual({ equals: 100 })
      expect(callArgs.where.starting_at).toBeDefined()
    })
  })

  describe('Response Formatting', () => {
    it('should format match data correctly', async () => {
      const mockMatch = createMockMatch({
        id: 12345,
        scores: [
          {
            type: { name: 'CURRENT' },
            scores: [
              { participant_id: 10, score: { goals: 2 } },
              { participant_id: 20, score: { goals: 1 } }
            ]
          }
        ],
        state: { short_name: 'HT', state: 'HALF_TIME' }
      })

      mockPayload.find.mockResolvedValue({
        docs: [mockMatch],
        totalDocs: 1,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.matches[0]).toMatchObject({
        id: 12345,
        starting_at: '2024-12-25T15:00:00Z',
        state: {
          short_name: 'HT',
          state: 'HALF_TIME'
        },
        home_team: {
          id: 10,
          name: 'Home United',
          short_code: 'HMU',
          image_path: 'home.png'
        },
        away_team: {
          id: 20,
          name: 'Away City',
          short_code: 'AWC',
          image_path: 'away.png'
        },
        score: {
          home: 2,
          away: 1
        },
        league: {
          id: 100,
          name: 'Premier League',
          image_path: 'league.png',
          country_id: 1
        },
        wave_score: {
          total: 75,
          tier: 'A',
          factors: {
            rivalry: 25,
            position: 18,
            zone: 15,
            form: 10,
            h2h: 5,
            timing: 2
          }
        }
      })
    })

    it('should handle missing team data gracefully', async () => {
      const mockMatch = createMockMatch({
        participants: [
          { meta: { location: 'home' } }, // Missing team details
          { meta: { location: 'away' } }
        ]
      })

      mockPayload.find.mockResolvedValue({
        docs: [mockMatch],
        totalDocs: 1,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.matches[0].home_team).toMatchObject({
        id: 0,
        name: 'TBD'
      })
      expect(data.matches[0].away_team).toMatchObject({
        id: 0,
        name: 'TBD'
      })
    })

    it('should handle different score types', async () => {
      const mockMatch = createMockMatch({
        scores: [
          {
            type: { name: 'HT' },
            scores: [
              { participant_id: 10, score: { goals: 1 } },
              { participant_id: 20, score: { goals: 0 } }
            ]
          },
          {
            type: { name: 'FT' },
            scores: [
              { participant_id: 10, score: { goals: 3 } },
              { participant_id: 20, score: { goals: 2 } }
            ]
          }
        ]
      })

      mockPayload.find.mockResolvedValue({
        docs: [mockMatch],
        totalDocs: 1,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      // Should pick FT score
      expect(data.matches[0].score).toEqual({
        home: 3,
        away: 2
      })
    })

    it('should handle matches with no scores', async () => {
      const mockMatch = createMockMatch({
        scores: []
      })

      mockPayload.find.mockResolvedValue({
        docs: [mockMatch],
        totalDocs: 1,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.matches[0].score).toEqual({
        home: null,
        away: null
      })
    })

    it('should include filters in metadata', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [],
        totalDocs: 0,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves?date=2024-12-25&league_id=100&min_score=60'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.meta.filters).toEqual({
        date: '2024-12-25',
        league_id: 100,
        min_score: 60
      })
    })
  })

  describe('Sorting', () => {
    it('should sort by wave score descending', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [],
        totalDocs: 0,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      await matchesWavesHandler.handler(mockRequest)

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: '-wave_score.total'
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPayload.find.mockRejectedValue(new Error('Database connection failed'))

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch wave matches')
    })

    it('should handle invalid URL gracefully', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [],
        totalDocs: 0,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: null
      } as unknown as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.meta.page).toBe(1)
      expect(data.meta.limit).toBe(20)
    })
  })

  describe('Edge Cases', () => {
    it('should handle league as object reference', async () => {
      const mockMatch = createMockMatch({
        league: null,
        league_id: 200
      })

      mockPayload.find.mockResolvedValue({
        docs: [mockMatch],
        totalDocs: 1,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.matches[0].league).toMatchObject({
        id: 200,
        name: 'Unknown League'
      })
    })

    it('should provide default wave score structure', async () => {
      const mockMatch = createMockMatch({
        wave_score: {
          total: 50,
          tier: 'B'
          // Missing factors
        }
      })

      mockPayload.find.mockResolvedValue({
        docs: [mockMatch],
        totalDocs: 1,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.matches[0].wave_score.factors).toEqual({
        rivalry: 0,
        position: 0,
        zone: 0,
        form: 0,
        h2h: 0,
        timing: 0
      })
    })

    it('should handle malformed scores array', async () => {
      const mockMatch = createMockMatch({
        scores: 'invalid' // Not an array
      })

      mockPayload.find.mockResolvedValue({
        docs: [mockMatch],
        totalDocs: 1,
        page: 1,
        limit: 20
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches/waves'
      } as PayloadRequest

      const response = await matchesWavesHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.matches[0].score).toEqual({
        home: null,
        away: null
      })
    })
  })
})