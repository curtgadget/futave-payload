import { describe, expect, it, beforeEach } from '@jest/globals'
import type { SportmonksRival } from '../../client/types'
import { transformRival, validateRival } from '../rival.transformer'
import { createMockTeam } from '../test-helpers'

describe('Rival Transformer', () => {
  const mockTeam1 = createMockTeam({
    id: 62,
    name: 'Rangers',
    image_path: 'https://cdn.sportmonks.com/images/soccer/teams/30/62.png',
  })

  const mockTeam2 = createMockTeam({
    id: 273,
    name: 'Aberdeen',
    image_path: 'https://cdn.sportmonks.com/images/soccer/teams/17/273.png',
  })

  describe('transformRival', () => {
    it('should transform a rival with rival_id field correctly', async () => {
      const mockRival: SportmonksRival = {
        id: 1407,
        team_id: 62,
        rival_id: 273,
        team: mockTeam1,
        rival: mockTeam2,
      }

      const result = await transformRival(mockRival)

      expect(result).toEqual({
        id: 1407,
        team_id: 62,
        rival_team_id: 273,
        team: mockTeam1,
        rival: mockTeam2,
      })
    })

    it('should transform a rival with rival_team_id field correctly (backwards compatibility)', async () => {
      const mockRival: SportmonksRival = {
        id: 1407,
        team_id: 62,
        rival_id: 273,
        rival_team_id: 273,
        team: mockTeam1,
        rival: mockTeam2,
      }

      const result = await transformRival(mockRival)

      expect(result).toEqual({
        id: 1407,
        team_id: 62,
        rival_team_id: 273,
        team: mockTeam1,
        rival: mockTeam2,
      })
    })

    it('should handle missing team and rival objects', async () => {
      const mockRival: SportmonksRival = {
        id: 1407,
        team_id: 62,
        rival_id: 273,
      }

      const result = await transformRival(mockRival)

      expect(result).toEqual({
        id: 1407,
        team_id: 62,
        rival_team_id: 273,
        team: null,
        rival: null,
      })
    })

    it('should prioritize rival_id over rival_team_id when both are present', async () => {
      const mockRival: SportmonksRival = {
        id: 1407,
        team_id: 62,
        rival_id: 273,
        rival_team_id: 999, // Different value to test precedence
        team: mockTeam1,
        rival: mockTeam2,
      }

      const result = await transformRival(mockRival)

      expect(result).toEqual({
        id: 1407,
        team_id: 62,
        rival_team_id: 273, // Should use rival_id value
        team: mockTeam1,
        rival: mockTeam2,
      })
    })
  })

  describe('validateRival', () => {
    it('should not throw for valid rival data with rival_id', async () => {
      const validRival: SportmonksRival = {
        id: 1407,
        team_id: 62,
        rival_id: 273,
      }

      await expect(validateRival(validRival)).resolves.not.toThrow()
    })

    it('should not throw for valid rival data with rival_team_id', async () => {
      const validRival: SportmonksRival = {
        id: 1407,
        team_id: 62,
        rival_id: 0, // Invalid, but rival_team_id is valid
        rival_team_id: 273,
      } as SportmonksRival

      await expect(validateRival(validRival)).resolves.not.toThrow()
    })

    it('should throw when id is missing', async () => {
      const invalidRival = {
        team_id: 62,
        rival_id: 273,
      } as SportmonksRival

      await expect(validateRival(invalidRival)).rejects.toThrow('Missing required fields in rival data: id')
    })

    it('should throw when team_id is missing', async () => {
      const invalidRival = {
        id: 1407,
        rival_id: 273,
      } as SportmonksRival

      await expect(validateRival(invalidRival)).rejects.toThrow('Missing required fields in rival data: team_id')
    })

    it('should throw when both rival_id and rival_team_id are missing', async () => {
      const invalidRival = {
        id: 1407,
        team_id: 62,
      } as SportmonksRival

      await expect(validateRival(invalidRival)).rejects.toThrow('Missing rival_id or rival_team_id in rival data')
    })

    it('should throw for invalid rival ID (negative)', async () => {
      const invalidRival: SportmonksRival = {
        id: -1,
        team_id: 62,
        rival_id: 273,
      }

      await expect(validateRival(invalidRival)).rejects.toThrow('Invalid rival ID')
    })

    it('should throw for invalid rival ID (zero)', async () => {
      const invalidRival: SportmonksRival = {
        id: 0,
        team_id: 62,
        rival_id: 273,
      }

      await expect(validateRival(invalidRival)).rejects.toThrow('Invalid rival ID')
    })

    it('should throw for invalid team ID', async () => {
      const invalidRival: SportmonksRival = {
        id: 1407,
        team_id: -1,
        rival_id: 273,
      }

      await expect(validateRival(invalidRival)).rejects.toThrow('Invalid team ID')
    })

    it('should throw for invalid rival team ID', async () => {
      const invalidRival: SportmonksRival = {
        id: 1407,
        team_id: 62,
        rival_id: -1,
      }

      await expect(validateRival(invalidRival)).rejects.toThrow('Invalid rival team ID')
    })

    it('should throw when team is rival to itself', async () => {
      const invalidRival: SportmonksRival = {
        id: 1407,
        team_id: 62,
        rival_id: 62,
      }

      await expect(validateRival(invalidRival)).rejects.toThrow('Team cannot be rival to itself')
    })

    it('should handle multiple missing fields', async () => {
      const invalidRival = {} as SportmonksRival

      await expect(validateRival(invalidRival)).rejects.toThrow('Missing required fields in rival data: id, team_id')
    })
  })
})