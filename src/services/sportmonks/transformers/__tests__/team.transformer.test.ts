import { describe, expect, it } from '@jest/globals'
import { transformTeam, validateTeam } from '../team.transformer'
import type { SportmonksTeam } from '../../client/types'

describe('Team Transformer', () => {
  const mockTeam: SportmonksTeam = {
    id: 123,
    name: 'Test Team',
    image_path: 'https://example.com/logo.png',
    country_id: 456,
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
  }

  describe('transformTeam', () => {
    it('should transform a valid team correctly', () => {
      const result = transformTeam(mockTeam)

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
      })
    })

    it('should handle null optional fields', () => {
      const result = transformTeam({
        ...mockTeam,
        coaches: null,
        players: null,
      })

      expect(result.coaches).toBeNull()
      expect(result.players).toBeNull()
    })
  })

  describe('validateTeam', () => {
    it('should not throw for valid team data', () => {
      expect(() => validateTeam(mockTeam)).not.toThrow()
    })

    it('should throw when required fields are missing', () => {
      const invalidTeam = { ...mockTeam }
      delete (invalidTeam as any).name

      expect(() => validateTeam(invalidTeam as SportmonksTeam)).toThrow('Missing required fields')
    })

    it('should throw for invalid team ID', () => {
      expect(() => validateTeam({ ...mockTeam, id: -1 })).toThrow('Invalid team ID')
      expect(() => validateTeam({ ...mockTeam, id: 0 })).toThrow('Invalid team ID')
    })

    it('should throw for invalid team name', () => {
      expect(() => validateTeam({ ...mockTeam, name: '' })).toThrow('Invalid team name')
      expect(() => validateTeam({ ...mockTeam, name: '   ' })).toThrow('Invalid team name')
    })

    it('should throw for invalid logo path', () => {
      expect(() => validateTeam({ ...mockTeam, image_path: '' })).not.toThrow()
      expect(() => validateTeam({ ...mockTeam, image_path: null as any })).toThrow(
        'Invalid team logo path',
      )
    })

    it('should throw for invalid country ID', () => {
      expect(() => validateTeam({ ...mockTeam, country_id: -1 })).toThrow('Invalid country ID')
      expect(() => validateTeam({ ...mockTeam, country_id: 0 })).toThrow('Invalid country ID')
    })
  })
})
