import { describe, expect, it } from '@jest/globals'
import { transformLeague, validateLeague } from '../league.transformer'
import { createMockLeague, createMinimalMockData } from '../test-helpers'
import type { SportmonksLeague } from '../../client/types'

describe('League Transformer', () => {
  describe('transformLeague', () => {
    it('should transform a complete league correctly', () => {
      const mockLeague = createMockLeague({
        id: 1,
        name: 'Premier League',
        image_path: 'https://example.com/premier-league.png',
        country_id: 462,
        type: 'domestic',
        stages: [{ id: 1, name: 'Regular Season' }],
        latest: [{ id: 100, name: 'Latest Match' }],
        upcoming: [{ id: 101, name: 'Upcoming Match' }],
        inplay: [{ id: 102, name: 'Live Match' }],
        today: [{ id: 103, name: 'Today Match' }],
        currentseason: { id: 20, name: '2023-24' },
        seasons: [{ id: 19, name: '2022-23' }, { id: 20, name: '2023-24' }],
      })

      const result = transformLeague(mockLeague)

      expect(result).toEqual({
        id: 1,
        name: 'Premier League',
        logo_path: 'https://example.com/premier-league.png',
        country_id: 462,
        league_type: 'domestic',
        stages: [{ id: 1, name: 'Regular Season' }],
        latest: [{ id: 100, name: 'Latest Match' }],
        upcoming: [{ id: 101, name: 'Upcoming Match' }],
        inplay: [{ id: 102, name: 'Live Match' }],
        today: [{ id: 103, name: 'Today Match' }],
        currentseason: { id: 20, name: '2023-24' },
        seasons: [{ id: 19, name: '2022-23' }, { id: 20, name: '2023-24' }],
        standings: null,
      })
    })

    it('should transform minimal league data correctly', () => {
      const minimalLeague = createMinimalMockData.league()

      const result = transformLeague(minimalLeague)

      expect(result).toEqual({
        id: 1,
        name: 'Minimal League',
        logo_path: 'minimal.png',
        country_id: 1,
        league_type: 'league',
        stages: null,
        latest: null,
        upcoming: null,
        inplay: null,
        today: null,
        currentseason: null,
        seasons: null,
        standings: null,
      })
    })

    it('should correctly map field names', () => {
      const league = createMockLeague({
        image_path: 'https://test.com/logo.svg',
        type: 'international',
      })

      const result = transformLeague(league)

      // Verify field mapping
      expect(result.logo_path).toBe('https://test.com/logo.svg')
      expect(result.league_type).toBe('international')
      
      // Verify original field names don't exist in result
      expect(result).not.toHaveProperty('image_path')
      expect(result).not.toHaveProperty('type')
    })

    it('should handle undefined optional fields gracefully', () => {
      const leagueWithUndefinedFields: SportmonksLeague = {
        id: 123,
        name: 'Test League',
        image_path: 'test.png',
        country_id: 1,
        type: 'cup',
        // All optional fields omitted
      }

      const result = transformLeague(leagueWithUndefinedFields)

      expect(result.id).toBe(123)
      expect(result.name).toBe('Test League')
      expect(result.logo_path).toBe('test.png')
      expect(result.country_id).toBe(1)
      expect(result.league_type).toBe('cup')
      expect(result.stages).toBeNull()
      expect(result.latest).toBeNull()
      expect(result.upcoming).toBeNull()
      expect(result.inplay).toBeNull()
      expect(result.today).toBeNull()
      expect(result.currentseason).toBeNull()
      expect(result.seasons).toBeNull()
      expect(result.standings).toBeNull()
    })

    it('should handle falsy optional fields by converting to null', () => {
      const leagueWithFalsyFields = createMockLeague({
        stages: undefined,
        latest: null,
        upcoming: false as any,
        inplay: 0 as any,
        today: '' as any,
        currentseason: undefined,
        seasons: null,
      })

      const result = transformLeague(leagueWithFalsyFields)

      expect(result.stages).toBeNull()
      expect(result.latest).toBeNull()
      expect(result.upcoming).toBeNull()
      expect(result.inplay).toBeNull()
      expect(result.today).toBeNull()
      expect(result.currentseason).toBeNull()
      expect(result.seasons).toBeNull()
      expect(result.standings).toBeNull()
    })

    it('should preserve truthy optional field values', () => {
      const leagueWithTruthyFields = createMockLeague({
        stages: ['stage1'],
        latest: { id: 1 },
        upcoming: [{ id: 2 }],
        inplay: { live: true },
        today: 'today data',
        currentseason: { active: true },
        seasons: [{ id: 1 }, { id: 2 }],
      })

      const result = transformLeague(leagueWithTruthyFields)

      expect(result.stages).toEqual(['stage1'])
      expect(result.latest).toEqual({ id: 1 })
      expect(result.upcoming).toEqual([{ id: 2 }])
      expect(result.inplay).toEqual({ live: true })
      expect(result.today).toBe('today data')
      expect(result.currentseason).toEqual({ active: true })
      expect(result.seasons).toEqual([{ id: 1 }, { id: 2 }])
    })

    it('should handle standings field correctly', () => {
      // Test with no standings
      const leagueWithoutStandings = createMockLeague({
        id: 1,
        name: 'League Without Standings',
      })

      const resultWithoutStandings = transformLeague(leagueWithoutStandings)
      expect(resultWithoutStandings.standings).toBeNull()

      // Test with standings data
      const standingsData = {
        20: [{ position: 1, team: 'Team A' }],
        21: [{ position: 1, team: 'Team B' }],
      }
      const leagueWithStandings = {
        ...createMockLeague({ id: 2, name: 'League With Standings' }),
        standings: standingsData,
      }

      const resultWithStandings = transformLeague(leagueWithStandings as any)
      expect(resultWithStandings.standings).toEqual(standingsData)
    })
  })

  describe('validateLeague', () => {
    const validLeague = createMockLeague({
      id: 1,
      name: 'Valid League',
      image_path: 'valid.png',
      country_id: 1,
      type: 'domestic',
    })

    it('should not throw for valid league data', () => {
      expect(() => validateLeague(validLeague)).not.toThrow()
    })

    describe('required field validation', () => {
      it('should throw when required fields are missing', () => {
        const invalidLeague = { ...validLeague }
        delete (invalidLeague as any).name

        expect(() => validateLeague(invalidLeague as SportmonksLeague)).toThrow(
          'Missing required fields in league data: name'
        )
      })

      it('should throw when multiple required fields are missing', () => {
        const invalidLeague = { ...validLeague }
        delete (invalidLeague as any).name
        delete (invalidLeague as any).country_id

        expect(() => validateLeague(invalidLeague as SportmonksLeague)).toThrow(
          'Missing required fields in league data: name, country_id'
        )
      })
    })

    describe('ID validation', () => {
      it('should throw for invalid league ID (negative)', () => {
        expect(() => validateLeague({ ...validLeague, id: -1 })).toThrow('Invalid league ID')
      })

      it('should throw for invalid league ID (zero)', () => {
        expect(() => validateLeague({ ...validLeague, id: 0 })).toThrow('Invalid league ID')
      })

      it('should throw for invalid league ID (non-number)', () => {
        expect(() => validateLeague({ ...validLeague, id: '123' as any })).toThrow('Invalid league ID')
      })
    })

    describe('name validation', () => {
      it('should throw for empty league name', () => {
        expect(() => validateLeague({ ...validLeague, name: '' })).toThrow('Invalid league name')
      })

      it('should throw for whitespace-only league name', () => {
        expect(() => validateLeague({ ...validLeague, name: '   ' })).toThrow('Invalid league name')
      })

      it('should throw for non-string league name', () => {
        expect(() => validateLeague({ ...validLeague, name: 123 as any })).toThrow('Invalid league name')
      })
    })

    describe('logo path validation', () => {
      it('should throw for non-string logo path', () => {
        expect(() => validateLeague({ ...validLeague, image_path: null as any })).toThrow(
          'Invalid league logo path'
        )
      })

      it('should throw for undefined logo path', () => {
        expect(() => validateLeague({ ...validLeague, image_path: undefined as any })).toThrow(
          'Invalid league logo path'
        )
      })

      it('should allow empty string logo path', () => {
        expect(() => validateLeague({ ...validLeague, image_path: '' })).not.toThrow()
      })
    })

    describe('country ID validation', () => {
      it('should throw for invalid country ID (negative)', () => {
        expect(() => validateLeague({ ...validLeague, country_id: -1 })).toThrow('Invalid country ID')
      })

      it('should throw for invalid country ID (zero)', () => {
        expect(() => validateLeague({ ...validLeague, country_id: 0 })).toThrow('Invalid country ID')
      })

      it('should throw for invalid country ID (non-number)', () => {
        expect(() => validateLeague({ ...validLeague, country_id: '456' as any })).toThrow('Invalid country ID')
      })
    })

    describe('league type validation', () => {
      it('should throw for empty league type', () => {
        expect(() => validateLeague({ ...validLeague, type: '' })).toThrow('Invalid league type')
      })

      it('should throw for whitespace-only league type', () => {
        expect(() => validateLeague({ ...validLeague, type: '   ' })).toThrow('Invalid league type')
      })

      it('should throw for non-string league type', () => {
        expect(() => validateLeague({ ...validLeague, type: 123 as any })).toThrow('Invalid league type')
      })

      it('should accept various valid league types', () => {
        const validTypes = ['domestic', 'international', 'cup', 'tournament', 'playoff']
        
        validTypes.forEach(type => {
          expect(() => validateLeague({ ...validLeague, type })).not.toThrow()
        })
      })
    })

    describe('comprehensive validation scenarios', () => {
      it('should validate a real-world league example', () => {
        const realWorldLeague: SportmonksLeague = {
          id: 8,
          name: 'Premier League',
          image_path: 'https://cdn.sportmonks.com/images/soccer/leagues/8.png',
          country_id: 462,
          type: 'domestic',
          stages: null,
          latest: null,
          upcoming: null,
          inplay: null,
          today: null,
          currentseason: null,
          seasons: null,
        }

        expect(() => validateLeague(realWorldLeague)).not.toThrow()
      })

      it('should validate with all optional fields present', () => {
        const fullLeague = createMockLeague({
          id: 999,
          name: 'Full Test League',
          image_path: 'https://test.com/logo.png',
          country_id: 999,
          type: 'international',
          stages: [{ id: 1 }],
          latest: [{ id: 2 }],
          upcoming: [{ id: 3 }],
          inplay: [{ id: 4 }],
          today: [{ id: 5 }],
          currentseason: { id: 6 },
          seasons: [{ id: 7 }, { id: 8 }],
        })

        expect(() => validateLeague(fullLeague)).not.toThrow()
      })
    })
  })
})