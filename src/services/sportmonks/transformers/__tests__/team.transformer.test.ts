import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import type { SportmonksTeam } from '../../client/types'

// Create mock payload object
const mockPayload: any = {
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

// Mock the Payload imports
jest.mock('payload', () => ({
  getPayload: jest.fn(),
}))

jest.mock('@/payload.config', () => ({}))

// Import transformer after mocks are set up
import { transformTeam, validateTeam } from '../team.transformer'
import { createMockTeam, createMockTeamWithSeasons } from '../test-helpers'
import { getPayload } from 'payload'

const mockGetPayload = getPayload as jest.MockedFunction<typeof getPayload>

describe('Team Transformer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockGetPayload.mockResolvedValue(mockPayload)
  })

  const mockTeam: SportmonksTeam = createMockTeam({
    id: 123,
    name: 'Test Team',
    image_path: 'https://example.com/logo.png',
    country_id: 456,
  })

  describe('transformTeam', () => {
    it('should transform a valid team correctly', async () => {
      const result = await transformTeam(mockTeam)

      expect(result).toEqual({
        id: mockTeam.id,
        name: mockTeam.name,
        logo_path: mockTeam.image_path,
        country_id: mockTeam.country_id,
        coaches: null,
        players: null,
        latest: null,
        upcoming: null,
        seasons: null,
        activeseasons: null,
        statistics: null,
        trophies: null,
        socials: null,
        rankings: null,
        standings: null,
        season_map: null,
      })
    })

    it('should handle null optional fields', async () => {
      const result = await transformTeam({
        ...mockTeam,
        coaches: null,
        players: null,
      })

      expect(result.coaches).toBeNull()
      expect(result.players).toBeNull()
    })

    it('should generate season_map when seasons are provided', async () => {
      const teamWithSeasons = createMockTeamWithSeasons({
        id: 123,
        name: 'Test Team',
      }, 2)

      // Setup mock leagues
      mockPayload.find.mockResolvedValue({
        docs: [{ id: 1, name: 'Premier League' }]
      })

      const result = await transformTeam(teamWithSeasons)

      expect(result.season_map).toBeDefined()
      expect(result.season_map).toHaveLength(2)
      expect(result.season_map![0]).toHaveProperty('id')
      expect(result.season_map![0]).toHaveProperty('name')
    })

    it('should handle empty seasons array', async () => {
      const teamWithEmptySeasons = createMockTeam({
        seasons: [],
      })

      const result = await transformTeam(teamWithEmptySeasons)
      expect(result.season_map).toEqual([])
    })

    it('should handle payload errors gracefully', async () => {
      const teamWithSeasons = createMockTeamWithSeasons()
      
      // Mock console.error to suppress error output during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Setup mock error
      mockPayload.find.mockRejectedValue(new Error('Database connection failed'))

      const result = await transformTeam(teamWithSeasons)
      
      // Should still return a result, just without league names
      expect(result).toBeDefined()
      expect(result.season_map).toBeDefined()
      
      // Verify that error was logged (but suppress the actual output)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching league names:', expect.any(Error))
      
      // Restore console.error
      consoleErrorSpy.mockRestore()
    })
  })

  describe('validateTeam', () => {
    it('should not throw for valid team data', async () => {
      await expect(validateTeam(mockTeam)).resolves.not.toThrow()
    })

    it('should throw when required fields are missing', async () => {
      const invalidTeam = { ...mockTeam }
      delete (invalidTeam as any).name

      await expect(validateTeam(invalidTeam as SportmonksTeam)).rejects.toThrow('Missing required fields')
    })

    it('should throw for invalid team ID', async () => {
      await expect(validateTeam({ ...mockTeam, id: -1 })).rejects.toThrow('Invalid team ID')
      await expect(validateTeam({ ...mockTeam, id: 0 })).rejects.toThrow('Invalid team ID')
    })

    it('should throw for invalid team name', async () => {
      await expect(validateTeam({ ...mockTeam, name: '' })).rejects.toThrow('Invalid team name')
      await expect(validateTeam({ ...mockTeam, name: '   ' })).rejects.toThrow('Invalid team name')
    })

    it('should throw for invalid logo path', async () => {
      await expect(validateTeam({ ...mockTeam, image_path: '' })).resolves.not.toThrow()
      await expect(validateTeam({ ...mockTeam, image_path: null as any })).rejects.toThrow(
        'Invalid team logo path',
      )
    })

    it('should throw for invalid country ID', async () => {
      await expect(validateTeam({ ...mockTeam, country_id: -1 })).rejects.toThrow('Invalid country ID')
      await expect(validateTeam({ ...mockTeam, country_id: 0 })).rejects.toThrow('Invalid country ID')
    })
  })
})