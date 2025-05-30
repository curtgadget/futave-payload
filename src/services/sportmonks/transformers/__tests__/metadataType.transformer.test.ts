import { describe, expect, it } from '@jest/globals'
import { transformMetadataType } from '../metadataType.transformer'
import { createMockMetadataType } from '../test-helpers'
import type { SportmonksMetadataType } from '../../client/types'

describe('MetadataType Transformer', () => {
  describe('transformMetadataType', () => {
    it('should transform complete metadata type correctly', () => {
      const mockMetadataType = createMockMetadataType({
        id: 1,
        parent_id: 5,
        name: 'Player Position',
        code: 'PLAYER_POSITION',
        developer_name: 'player_position',
        group: 'player_data',
        description: 'Defines player positions on the field',
      })

      const result = transformMetadataType(mockMetadataType)

      expect(result).toEqual({
        id: 1,
        parent_id: 5,
        name: 'Player Position',
        code: 'PLAYER_POSITION',
        developer_name: 'player_position',
        group: 'player_data',
        description: 'Defines player positions on the field',
      })
    })

    it('should transform minimal metadata type with required fields only', () => {
      const minimalMetadataType: SportmonksMetadataType = {
        id: 2,
        parent_id: null,
        name: 'Match Status',
        code: 'MATCH_STATUS',
        developer_name: null,
        model_type: null,
        group: null,
        description: null,
      }

      const result = transformMetadataType(minimalMetadataType)

      expect(result).toEqual({
        id: 2,
        parent_id: null,
        name: 'Match Status',
        code: 'MATCH_STATUS',
        developer_name: null,
        group: null,
        description: null,
      })
    })

    it('should preserve null values for optional fields', () => {
      const metadataTypeWithNulls = createMockMetadataType({
        id: 3,
        parent_id: null,
        name: 'Test Type',
        code: 'TEST_TYPE',
        developer_name: null,
        group: null,
        description: null,
      })

      const result = transformMetadataType(metadataTypeWithNulls)

      expect(result.parent_id).toBeNull()
      expect(result.developer_name).toBeNull()
      expect(result.group).toBeNull()
      expect(result.description).toBeNull()
    })

    it('should handle all fields as strings or numbers correctly', () => {
      const metadataType = createMockMetadataType({
        id: 999,
        parent_id: 888,
        name: 'String Field Test',
        code: 'STRING_TEST',
        developer_name: 'string_test',
        group: 'test_group',
        description: 'This is a test description with special characters: !@#$%^&*()',
      })

      const result = transformMetadataType(metadataType)

      expect(typeof result.id).toBe('number')
      expect(typeof result.parent_id).toBe('number')
      expect(typeof result.name).toBe('string')
      expect(typeof result.code).toBe('string')
      expect(typeof result.developer_name).toBe('string')
      expect(typeof result.group).toBe('string')
      expect(typeof result.description).toBe('string')
    })

    it('should handle zero values correctly', () => {
      const metadataTypeWithZeros = createMockMetadataType({
        id: 0,
        parent_id: 0,
        name: 'Zero Test',
        code: '0',
        developer_name: '',
        group: '',
        description: '',
      })

      const result = transformMetadataType(metadataTypeWithZeros)

      expect(result.id).toBe(0)
      expect(result.parent_id).toBe(0)
      expect(result.name).toBe('Zero Test')
      expect(result.code).toBe('0')
      expect(result.developer_name).toBe('')
      expect(result.group).toBe('')
      expect(result.description).toBe('')
    })

    it('should pass through all field values without modification', () => {
      const originalMetadataType = createMockMetadataType({
        id: 12345,
        parent_id: 67890,
        name: 'Original Name',
        code: 'ORIGINAL_CODE',
        developer_name: 'original_dev_name',
        group: 'original_group',
        description: 'Original description text',
      })

      const result = transformMetadataType(originalMetadataType)

      // Verify that transformation is a pure pass-through
      expect(result.id).toBe(originalMetadataType.id)
      expect(result.parent_id).toBe(originalMetadataType.parent_id)
      expect(result.name).toBe(originalMetadataType.name)
      expect(result.code).toBe(originalMetadataType.code)
      expect(result.developer_name).toBe(originalMetadataType.developer_name)
      expect(result.group).toBe(originalMetadataType.group)
      expect(result.description).toBe(originalMetadataType.description)
    })

    it('should not add or remove any fields', () => {
      const metadataType = createMockMetadataType()
      const result = transformMetadataType(metadataType)

      // Verify exact field count matches expected output
      expect(Object.keys(result)).toHaveLength(7)
      
      // Verify all expected fields are present
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('parent_id')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('developer_name')
      expect(result).toHaveProperty('group')
      expect(result).toHaveProperty('description')

      // Verify no extra fields are added
      expect(result).not.toHaveProperty('model_type')
      expect(result).not.toHaveProperty('created_at')
      expect(result).not.toHaveProperty('updated_at')
    })

    describe('hierarchical metadata types', () => {
      it('should handle parent-child relationships', () => {
        const parentType = createMockMetadataType({
          id: 1,
          parent_id: null,
          name: 'Parent Category',
          code: 'PARENT',
          group: 'main',
        })

        const childType = createMockMetadataType({
          id: 2,
          parent_id: 1,
          name: 'Child Category',
          code: 'CHILD',
          group: 'sub',
        })

        const parentResult = transformMetadataType(parentType)
        const childResult = transformMetadataType(childType)

        expect(parentResult.parent_id).toBeNull()
        expect(childResult.parent_id).toBe(1)
        expect(parentResult.id).toBe(childResult.parent_id)
      })

      it('should handle deep hierarchy levels', () => {
        const deepChildType = createMockMetadataType({
          id: 100,
          parent_id: 99,
          name: 'Deep Child',
          code: 'DEEP_CHILD',
          description: 'A deeply nested metadata type',
        })

        const result = transformMetadataType(deepChildType)

        expect(result.id).toBe(100)
        expect(result.parent_id).toBe(99)
      })
    })

    describe('real-world scenarios', () => {
      it('should handle typical Sportmonks metadata type response', () => {
        const sportmonksMetadataType: SportmonksMetadataType = {
          id: 18,
          parent_id: null,
          name: 'Match Status',
          code: 'MATCH_STATUS',
          developer_name: 'match_status',
          model_type: 'Match',
          group: 'match_data',
          description: 'Status information for matches (scheduled, live, finished, etc.)',
        }

        const result = transformMetadataType(sportmonksMetadataType)

        expect(result).toEqual({
          id: 18,
          parent_id: null,
          name: 'Match Status',
          code: 'MATCH_STATUS',
          developer_name: 'match_status',
          group: 'match_data',
          description: 'Status information for matches (scheduled, live, finished, etc.)',
        })
      })

      it('should handle metadata type with special characters and unicode', () => {
        const unicodeMetadataType = createMockMetadataType({
          id: 999,
          parent_id: null,
          name: 'Équipe Français 🇫🇷',
          code: 'TEAM_FR',
          developer_name: 'équipe_français',
          group: 'international_teams',
          description: 'Métadonnées pour les équipes françaises avec caractères spéciaux: àáâãäåæçèéêë',
        })

        const result = transformMetadataType(unicodeMetadataType)

        expect(result.name).toBe('Équipe Français 🇫🇷')
        expect(result.developer_name).toBe('équipe_français')
        expect(result.description).toBe('Métadonnées pour les équipes françaises avec caractères spéciaux: àáâãäåæçèéêë')
      })

      it('should handle edge case with very long strings', () => {
        const longString = 'A'.repeat(1000)
        const longDescMetadataType = createMockMetadataType({
          id: 777,
          name: longString,
          code: 'LONG_TEST',
          description: longString,
        })

        const result = transformMetadataType(longDescMetadataType)

        expect(result.name).toBe(longString)
        expect(result.description).toBe(longString)
        expect(result.name.length).toBe(1000)
        expect(result.description!.length).toBe(1000)
      })

      it('should handle numeric edge cases', () => {
        const edgeCaseMetadataType = createMockMetadataType({
          id: Number.MAX_SAFE_INTEGER,
          parent_id: Number.MAX_SAFE_INTEGER - 1,
          name: 'Edge Case Numbers',
          code: 'EDGE_NUMBERS',
        })

        const result = transformMetadataType(edgeCaseMetadataType)

        expect(result.id).toBe(Number.MAX_SAFE_INTEGER)
        expect(result.parent_id).toBe(Number.MAX_SAFE_INTEGER - 1)
      })
    })

    describe('data integrity', () => {
      it('should not mutate the original input', () => {
        const originalMetadataType = createMockMetadataType({
          id: 123,
          name: 'Original',
          code: 'ORIGINAL',
        })
        
        // Create a deep copy to compare against
        const originalCopy = JSON.parse(JSON.stringify(originalMetadataType))
        
        // Transform the metadata type
        transformMetadataType(originalMetadataType)
        
        // Verify original wasn't mutated
        expect(originalMetadataType).toEqual(originalCopy)
      })

      it('should create a new object instance', () => {
        const metadataType = createMockMetadataType()
        const result = transformMetadataType(metadataType)

        expect(result).not.toBe(metadataType)
        expect(typeof result).toBe('object')
        expect(result.constructor).toBe(Object)
      })
    })
  })
})