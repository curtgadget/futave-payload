import { describe, expect, it } from '@jest/globals'
import { transformCountry } from '../country.transformer'
import { createMockCountry, createMinimalMockData } from '../test-helpers'
import type { SportmonksCountry } from '../../client/types'

describe('Country Transformer', () => {
  describe('transformCountry', () => {
    it('should transform a complete country correctly', () => {
      const mockCountry = createMockCountry({
        id: 1,
        continent_id: 1,
        name: 'United States',
        official_name: 'United States of America',
        fifa_name: 'USA',
        iso2: 'US',
        iso3: 'USA',
        latitude: '39.7837304',
        longitude: '-100.4458825',
        geonameid: 6252001,
        border: ['CAN', 'MEX'],
        image_path: 'https://example.com/flags/us.svg',
      })

      const result = transformCountry(mockCountry)

      expect(result).toEqual({
        id: 1,
        continent_id: 1,
        name: 'United States',
        official_name: 'United States of America',
        fifa_name: 'USA',
        iso2: 'US',
        iso3: 'USA',
        latitude: '39.7837304',
        longitude: '-100.4458825',
        geonameid: 6252001,
        borders: ['CAN', 'MEX'],
        image_path: 'https://example.com/flags/us.svg',
      })
    })

    it('should transform minimal country data correctly', () => {
      const minimalCountry = createMinimalMockData.country()

      const result = transformCountry(minimalCountry)

      expect(result).toEqual({
        id: 1,
        continent_id: 1,
        name: 'Minimal Country',
        official_name: undefined,
        fifa_name: undefined,
        iso2: undefined,
        iso3: undefined,
        latitude: undefined,
        longitude: undefined,
        geonameid: undefined,
        borders: undefined,
        image_path: 'minimal.png',
      })
    })

    it('should handle undefined optional fields gracefully', () => {
      const countryWithUndefinedFields: SportmonksCountry = {
        id: 123,
        continent_id: 2,
        name: 'Test Country',
        // All optional fields omitted
      }

      const result = transformCountry(countryWithUndefinedFields)

      expect(result.id).toBe(123)
      expect(result.continent_id).toBe(2)
      expect(result.name).toBe('Test Country')
      expect(result.official_name).toBeUndefined()
      expect(result.fifa_name).toBeUndefined()
      expect(result.iso2).toBeUndefined()
      expect(result.iso3).toBeUndefined()
      expect(result.latitude).toBeUndefined()
      expect(result.longitude).toBeUndefined()
      expect(result.geonameid).toBeUndefined()
      expect(result.borders).toBeUndefined()
      expect(result.image_path).toBeUndefined()
    })

    it('should correctly map border field to borders field', () => {
      const countryWithBorders = createMockCountry({
        border: ['FRA', 'DEU', 'AUT'],
      })

      const result = transformCountry(countryWithBorders)

      expect(result.borders).toEqual(['FRA', 'DEU', 'AUT'])
      expect(result).not.toHaveProperty('border') // original field should not exist
    })

    it('should handle empty borders array', () => {
      const countryWithEmptyBorders = createMockCountry({
        border: [],
      })

      const result = transformCountry(countryWithEmptyBorders)

      expect(result.borders).toEqual([])
    })

    it('should preserve numeric string coordinates as strings', () => {
      const countryWithCoordinates = createMockCountry({
        latitude: '-34.6037232',
        longitude: '-58.3815931',
      })

      const result = transformCountry(countryWithCoordinates)

      expect(result.latitude).toBe('-34.6037232')
      expect(result.longitude).toBe('-58.3815931')
      expect(typeof result.latitude).toBe('string')
      expect(typeof result.longitude).toBe('string')
    })

    it('should handle all fields being present', () => {
      const fullCountry = createMockCountry({
        id: 999,
        continent_id: 3,
        name: 'Full Test Country',
        official_name: 'Official Full Test Country',
        fifa_name: 'FTC',
        iso2: 'FT',
        iso3: 'FTC',
        latitude: '0.0000000',
        longitude: '0.0000000',
        geonameid: 999999,
        border: ['TST1', 'TST2', 'TST3'],
        image_path: 'https://test.com/flag.png',
      })

      const result = transformCountry(fullCountry)

      // Verify all fields are correctly transformed
      expect(Object.keys(result)).toHaveLength(12)
      expect(result.id).toBe(999)
      expect(result.continent_id).toBe(3)
      expect(result.name).toBe('Full Test Country')
      expect(result.official_name).toBe('Official Full Test Country')
      expect(result.fifa_name).toBe('FTC')
      expect(result.iso2).toBe('FT')
      expect(result.iso3).toBe('FTC')
      expect(result.latitude).toBe('0.0000000')
      expect(result.longitude).toBe('0.0000000')
      expect(result.geonameid).toBe(999999)
      expect(result.borders).toEqual(['TST1', 'TST2', 'TST3'])
      expect(result.image_path).toBe('https://test.com/flag.png')
    })
  })
})
