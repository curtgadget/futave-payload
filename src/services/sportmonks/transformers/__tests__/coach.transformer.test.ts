import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { transformCoach } from '../coach.transformer'
import { createMockCoach } from '../test-helpers'
import type { SportmonksCoach } from '../../client/types'

describe('Coach Transformer', () => {
  beforeEach(() => {
    // Mock Date.now() to have predictable timestamps in tests
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T10:30:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('transformCoach', () => {
    it('should transform a complete coach correctly', () => {
      const mockCoach = createMockCoach({
        id: 123,
        name: 'Pep Guardiola',
        display_name: 'P. Guardiola',
        firstname: 'Pep',
        lastname: 'Guardiola',
        date_of_birth: '1971-01-18',
        gender: 'male',
        image_path: 'https://example.com/pep.jpg',
        country_id: 1,
        nationality_id: 2,
      })

      const result = transformCoach(mockCoach)

      expect(result).toEqual({
        id: 123,
        sportmonksId: '123',
        name: 'Pep Guardiola',
        firstName: 'Pep',
        lastName: 'Guardiola',
        dateOfBirth: '1971-01-18',
        gender: 'male',
        image: 'https://example.com/pep.jpg',
        country: 1,
        nationality: 2,
        teams: [],
        lastUpdated: '2024-01-15T10:30:00.000Z',
      })
    })

    it('should handle minimal coach data with fallbacks', () => {
      const minimalCoach: SportmonksCoach = {
        id: 456,
        sport_id: 1,
        name: 'Minimal Coach',
        // All other fields omitted or undefined
      }

      const result = transformCoach(minimalCoach)

      expect(result).toEqual({
        id: 456,
        sportmonksId: '456',
        name: 'Minimal Coach',
        firstName: '',
        lastName: '',
        dateOfBirth: null,
        gender: 'male',
        image: '',
        country: null,
        nationality: null,
        teams: [],
        lastUpdated: '2024-01-15T10:30:00.000Z',
      })
    })

    describe('ID conversion', () => {
      it('should convert numeric ID to both number and string formats', () => {
        const coach = createMockCoach({ id: 789 })
        const result = transformCoach(coach)

        expect(result.id).toBe(789)
        expect(typeof result.id).toBe('number')
        expect(result.sportmonksId).toBe('789')
        expect(typeof result.sportmonksId).toBe('string')
      })

      it('should handle string ID by converting to number', () => {
        const coach = createMockCoach({ id: '999' as any })
        const result = transformCoach(coach)

        expect(result.id).toBe(999)
        expect(result.sportmonksId).toBe('999')
      })

      it('should handle large ID numbers', () => {
        const coach = createMockCoach({ id: 2147483647 })
        const result = transformCoach(coach)

        expect(result.id).toBe(2147483647)
        expect(result.sportmonksId).toBe('2147483647')
      })
    })

    describe('name fallback logic', () => {
      it('should use name when available', () => {
        const coach = createMockCoach({
          name: 'Full Name',
          display_name: 'Display Name',
        })
        const result = transformCoach(coach)

        expect(result.name).toBe('Full Name')
      })

      it('should fallback to display_name when name is empty', () => {
        const coach = createMockCoach({
          name: '',
          display_name: 'Display Name',
        })
        const result = transformCoach(coach)

        expect(result.name).toBe('Display Name')
      })

      it('should fallback to display_name when name is null', () => {
        const coach = createMockCoach({
          name: null as any,
          display_name: 'Display Name',
        })
        const result = transformCoach(coach)

        expect(result.name).toBe('Display Name')
      })

      it('should fallback to display_name when name is undefined', () => {
        const coach = createMockCoach({
          display_name: 'Display Name',
        })
        delete (coach as any).name
        const result = transformCoach(coach)

        expect(result.name).toBe('Display Name')
      })

      it('should use empty string when both name and display_name are missing', () => {
        const coach = createMockCoach()
        delete (coach as any).name
        delete (coach as any).display_name
        const result = transformCoach(coach)

        expect(result.name).toBe('')
      })

      it('should use empty string when both name and display_name are null', () => {
        const coach = createMockCoach({
          name: null as any,
          display_name: null as any,
        })
        const result = transformCoach(coach)

        expect(result.name).toBe('')
      })
    })

    describe('optional string fields', () => {
      it('should handle undefined firstname and lastname', () => {
        const coach = createMockCoach()
        delete (coach as any).firstname
        delete (coach as any).lastname
        const result = transformCoach(coach)

        expect(result.firstName).toBe('')
        expect(result.lastName).toBe('')
      })

      it('should handle null firstname and lastname', () => {
        const coach = createMockCoach({
          firstname: null as any,
          lastname: null as any,
        })
        const result = transformCoach(coach)

        expect(result.firstName).toBe('')
        expect(result.lastName).toBe('')
      })

      it('should preserve valid firstname and lastname', () => {
        const coach = createMockCoach({
          firstname: 'John',
          lastname: 'Doe',
        })
        const result = transformCoach(coach)

        expect(result.firstName).toBe('John')
        expect(result.lastName).toBe('Doe')
      })

      it('should handle undefined image_path', () => {
        const coach = createMockCoach()
        delete (coach as any).image_path
        const result = transformCoach(coach)

        expect(result.image).toBe('')
      })

      it('should handle null image_path', () => {
        const coach = createMockCoach({
          image_path: null as any,
        })
        const result = transformCoach(coach)

        expect(result.image).toBe('')
      })
    })

    describe('date of birth handling', () => {
      it('should preserve valid date of birth', () => {
        const coach = createMockCoach({
          date_of_birth: '1980-05-15',
        })
        const result = transformCoach(coach)

        expect(result.dateOfBirth).toBe('1980-05-15')
      })

      it('should convert undefined date_of_birth to null', () => {
        const coach = createMockCoach()
        delete (coach as any).date_of_birth
        const result = transformCoach(coach)

        expect(result.dateOfBirth).toBeNull()
      })

      it('should convert null date_of_birth to null', () => {
        const coach = createMockCoach({
          date_of_birth: null as any,
        })
        const result = transformCoach(coach)

        expect(result.dateOfBirth).toBeNull()
      })

      it('should convert empty string date_of_birth to null', () => {
        const coach = createMockCoach({
          date_of_birth: '',
        })
        const result = transformCoach(coach)

        expect(result.dateOfBirth).toBeNull()
      })
    })

    describe('gender handling', () => {
      it('should preserve valid gender', () => {
        const coach = createMockCoach({
          gender: 'female',
        })
        const result = transformCoach(coach)

        expect(result.gender).toBe('female')
      })

      it('should default to male when gender is undefined', () => {
        const coach = createMockCoach()
        delete (coach as any).gender
        const result = transformCoach(coach)

        expect(result.gender).toBe('male')
      })

      it('should default to male when gender is null', () => {
        const coach = createMockCoach({
          gender: null as any,
        })
        const result = transformCoach(coach)

        expect(result.gender).toBe('male')
      })

      it('should default to male when gender is empty string', () => {
        const coach = createMockCoach({
          gender: '',
        })
        const result = transformCoach(coach)

        expect(result.gender).toBe('male')
      })
    })

    describe('country and nationality ID handling', () => {
      it('should preserve valid country and nationality IDs', () => {
        const coach = createMockCoach({
          country_id: 1,
          nationality_id: 2,
        })
        const result = transformCoach(coach)

        expect(result.country).toBe(1)
        expect(result.nationality).toBe(2)
      })

      it('should convert undefined country and nationality IDs to null', () => {
        const coach = createMockCoach()
        delete (coach as any).country_id
        delete (coach as any).nationality_id
        const result = transformCoach(coach)

        expect(result.country).toBeNull()
        expect(result.nationality).toBeNull()
      })

      it('should convert null country and nationality IDs to null', () => {
        const coach = createMockCoach({
          country_id: null as any,
          nationality_id: null as any,
        })
        const result = transformCoach(coach)

        expect(result.country).toBeNull()
        expect(result.nationality).toBeNull()
      })

      it('should convert zero country and nationality IDs to null', () => {
        const coach = createMockCoach({
          country_id: 0,
          nationality_id: 0,
        })
        const result = transformCoach(coach)

        expect(result.country).toBeNull()
        expect(result.nationality).toBeNull()
      })

      it('should preserve negative IDs as valid (edge case)', () => {
        const coach = createMockCoach({
          country_id: -1,
          nationality_id: -2,
        })
        const result = transformCoach(coach)

        expect(result.country).toBe(-1)
        expect(result.nationality).toBe(-2)
      })
    })

    describe('default values', () => {
      it('should always return empty array for teams', () => {
        const coach = createMockCoach()
        const result = transformCoach(coach)

        expect(result.teams).toEqual([])
        expect(Array.isArray(result.teams)).toBe(true)
      })

      it('should generate current timestamp for lastUpdated', () => {
        const coach = createMockCoach()
        const result = transformCoach(coach)

        expect(result.lastUpdated).toBe('2024-01-15T10:30:00.000Z')
      })

      it('should generate fresh timestamp for each transformation', () => {
        const coach = createMockCoach()
        
        const result1 = transformCoach(coach)
        
        // Advance time by 1 second
        jest.advanceTimersByTime(1000)
        
        const result2 = transformCoach(coach)

        expect(result1.lastUpdated).toBe('2024-01-15T10:30:00.000Z')
        expect(result2.lastUpdated).toBe('2024-01-15T10:30:01.000Z')
      })
    })

    describe('real-world scenarios', () => {
      it('should handle a typical Sportmonks coach response', () => {
        const sportmonksCoach: SportmonksCoach = {
          id: 523898,
          sport_id: 1,
          country_id: 462,
          nationality_id: 462,
          name: 'Pep Guardiola',
          display_name: 'P. Guardiola',
          firstname: 'Josep',
          lastname: 'Guardiola Sala',
          date_of_birth: '1971-01-18',
          gender: 'male',
          image_path: 'https://cdn.sportmonks.com/images/soccer/players/18/523898.png',
          country: { id: 462, name: 'England' },
          nationality: { id: 462, name: 'Spain' },
          teams: [{
            id: 85,
            name: 'Manchester City',
            active: true,
            start_date: '2016-07-01',
            end_date: undefined,
          }],
          statistics: null,
        }

        const result = transformCoach(sportmonksCoach)

        expect(result).toEqual({
          id: 523898,
          sportmonksId: '523898',
          name: 'Pep Guardiola',
          firstName: 'Josep',
          lastName: 'Guardiola Sala',
          dateOfBirth: '1971-01-18',
          gender: 'male',
          image: 'https://cdn.sportmonks.com/images/soccer/players/18/523898.png',
          country: 462,
          nationality: 462,
          teams: [],
          lastUpdated: '2024-01-15T10:30:00.000Z',
        })
      })

      it('should handle incomplete data gracefully', () => {
        const incompleteCoach: SportmonksCoach = {
          id: 999999,
          sport_id: 1,
          name: 'Unknown Coach',
          // Most fields missing
        }

        const result = transformCoach(incompleteCoach)

        expect(result.id).toBe(999999)
        expect(result.name).toBe('Unknown Coach')
        expect(result.firstName).toBe('')
        expect(result.lastName).toBe('')
        expect(result.dateOfBirth).toBeNull()
        expect(result.gender).toBe('male')
        expect(result.image).toBe('')
        expect(result.country).toBeNull()
        expect(result.nationality).toBeNull()
        expect(result.teams).toEqual([])
        expect(result.lastUpdated).toBe('2024-01-15T10:30:00.000Z')
      })
    })
  })
})