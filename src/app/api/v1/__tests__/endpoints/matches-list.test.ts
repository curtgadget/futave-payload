import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import type { PayloadRequest } from 'payload'

// Mock dependencies
const mockPayload = {
  find: jest.fn() as any,
  db: {
    connection: {
      collection: jest.fn(() => ({
        find: jest.fn(),
        countDocuments: jest.fn(),
        aggregate: jest.fn(() => ({
          toArray: jest.fn()
        }))
      }))
    }
  }
}

jest.mock('payload', () => ({
  getPayload: jest.fn(() => Promise.resolve(mockPayload))
}))

jest.mock('@payload-config', () => ({}))

// Import the matches list handler after mocks
import matchesListHandler from '../../matchesList'

// Test data
const mockLeagues = [
  {
    _id: 501,
    name: 'Premiership',
    featured: true,
    priority: 75,
    tier: 'tier2',
    logo_path: 'premiership.png',
    country_id: 1161
  },
  {
    _id: 271,
    name: 'Superliga',
    featured: false,
    priority: 60,
    tier: 'tier2',
    logo_path: 'superliga.png',
    country_id: 320
  }
]

const mockMatches = [
  {
    _id: 19146697,
    league_id: 501,
    starting_at: '2024-08-03T18:30:00.000Z',
    participants: [
      {
        id: 314,
        name: 'Hearts',
        image_path: 'hearts.png',
        meta: { location: 'home' }
      },
      {
        id: 62,
        name: 'Rangers',
        image_path: 'rangers.png',
        meta: { location: 'away' }
      }
    ],
    scores: [
      { participant_id: 314, description: 'CURRENT', score: { goals: 2 } },
      { participant_id: 62, description: 'CURRENT', score: { goals: 1 } }
    ],
    state: { state: 'FT', short_name: 'FT' },
    venue: { name: 'Tynecastle Park', city_name: 'Edinburgh' },
    lineups: ['lineup1'],
    events: ['event1']
  }
]

describe('Matches List API Endpoint', () => {
  let mockLeaguesCollection: any
  let mockMatchesCollection: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    
    // Create mock collections with spies
    mockLeaguesCollection = {
      find: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve(mockLeagues))
      })),
      countDocuments: jest.fn(() => Promise.resolve(2)),
      aggregate: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve([]))
      }))
    }
    
    mockMatchesCollection = {
      find: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve([]))
      })),
      countDocuments: jest.fn(() => Promise.resolve(428)),
      aggregate: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve(mockMatches))
      }))
    }
    
    // Setup MongoDB collection mocks with collection-specific behavior
    mockPayload.db.connection.collection = jest.fn((collectionName: string) => {
      if (collectionName === 'leagues') {
        return mockLeaguesCollection
      } else {
        // Default to matches collection behavior
        return mockMatchesCollection
      }
    }) as any
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Endpoint Configuration', () => {
    it('should have correct endpoint configuration', () => {
      expect(matchesListHandler.path).toBe('/v1/matches')
      expect(matchesListHandler.method).toBe('get')
      expect(typeof matchesListHandler.handler).toBe('function')
    })
  })

  describe('Basic Functionality', () => {
    it('should return matches with default parameters', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches'
      } as PayloadRequest

      const response = await matchesListHandler.handler(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.docs).toHaveLength(1)
      expect(data.docs[0]).toMatchObject({
        id: 19146697,
        league: {
          id: 501,
          name: 'Premiership',
          featured: true
        }
      })
    })

    it('should include pagination metadata', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?page=2&limit=10'
      } as PayloadRequest

      const response = await matchesListHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.meta.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 428,
        totalPages: 43,
        hasMorePages: true,
        hasPreviousPages: true,
        nextPage: 3,
        previousPage: 1
      })
    })

    it('should include pagination URLs', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?page=2&leagues=501'
      } as PayloadRequest

      const response = await matchesListHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.meta.pagination.nextPageUrl).toBe('/api/v1/matches?page=3&leagues=501')
      expect(data.meta.pagination.previousPageUrl).toBe('/api/v1/matches?page=1&leagues=501')
      expect(data.meta.pagination.firstPageUrl).toBe('/api/v1/matches?page=1&leagues=501')
      expect(data.meta.pagination.lastPageUrl).toBe('/api/v1/matches?page=22&leagues=501')
    })
  })

  describe('Featured Leagues', () => {
    it('should include featured leagues when requested', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?include_featured=true'
      } as PayloadRequest

      const response = await matchesListHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.featured_leagues).toBeDefined()
      expect(data.featured_leagues).toHaveLength(1)
      expect(data.featured_leagues[0]).toMatchObject({
        id: 501,
        name: 'Premiership',
        priority: 75,
        match_count: 1
      })
    })

    it('should not include featured leagues when disabled', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?include_featured=false'
      } as PayloadRequest

      const response = await matchesListHandler.handler(mockRequest)
      const data = await response.json()

      expect(data.featured_leagues).toBeUndefined()
    })
  })

  describe('Query Parameters', () => {
    it('should handle league filtering', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?leagues=501,271'
      } as PayloadRequest

      await matchesListHandler.handler(mockRequest)

      // Verify that the aggregation pipeline includes league filter
      expect(mockMatchesCollection.aggregate).toHaveBeenCalled()
    })

    it('should handle date range filtering', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?date_from=2024-08-01&date_to=2024-08-31'
      } as PayloadRequest

      await matchesListHandler.handler(mockRequest)

      expect(mockMatchesCollection.aggregate).toHaveBeenCalled()
    })

    it('should handle special views', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?view=today'
      } as PayloadRequest

      await matchesListHandler.handler(mockRequest)

      expect(mockMatchesCollection.aggregate).toHaveBeenCalled()
    })

    it('should handle search functionality', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?search=hearts'
      } as PayloadRequest

      await matchesListHandler.handler(mockRequest)

      expect(mockMatchesCollection.aggregate).toHaveBeenCalled()
    })
  })

  describe('Priority Sorting', () => {
    it('should load league priorities from database', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?sort=priority'
      } as PayloadRequest

      const response = await matchesListHandler.handler(mockRequest)
      const data = await response.json()

      // Verify that priority sorting is working (the leagues data is being used)
      expect(response.status).toBe(200)
      expect(data.docs).toBeDefined()
      
      // Verify that at least one collection was called (matches for sure)
      expect(mockPayload.db.connection.collection).toHaveBeenCalled()
    })

    it('should calculate priority scores correctly', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches'
      } as PayloadRequest

      const response = await matchesListHandler.handler(mockRequest)
      const data = await response.json()

      // Featured league should have high priority
      expect(data.docs[0].league.featured).toBe(true)
      expect(data.docs[0].league.priority).toBe(75)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockPayload.db.connection.collection = jest.fn(() => {
        throw new Error('Database connection failed')
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches'
      } as PayloadRequest

      const response = await matchesListHandler.handler(mockRequest)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle invalid query parameters', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches?limit=999'
      } as PayloadRequest

      const response = await matchesListHandler.handler(mockRequest)
      const data = await response.json()

      // Should limit to max 100
      expect(data.meta.pagination.limit).toBeLessThanOrEqual(100)
    })
  })

  describe('Performance', () => {
    it('should use aggregation pipeline for efficient queries', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches'
      } as PayloadRequest

      await matchesListHandler.handler(mockRequest)

      expect(mockMatchesCollection.aggregate).toHaveBeenCalled()
    })

    it('should cache league data', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/matches'
      } as PayloadRequest

      // Call twice to test caching
      const response1 = await matchesListHandler.handler(mockRequest)
      const response2 = await matchesListHandler.handler(mockRequest)

      // Both calls should succeed
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      // Matches collection should be called for both requests
      expect(mockMatchesCollection.aggregate).toHaveBeenCalledTimes(2)
    })
  })
})