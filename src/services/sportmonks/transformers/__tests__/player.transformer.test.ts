import { describe, expect, it } from '@jest/globals'
import { transformPlayer } from '../player.transformer'
import type { SportmonksPlayer, SportmonksCountry } from '../../client/types/football'

describe('Player Transformer', () => {
  // Base fields that must be present in every test case
  const baseFields = {
    id: 123,
    sport_id: 1,
    detailed_position_id: 101,
    name: 'Test Player',
    // Required nullable fields must be explicitly set
    common_name: null,
    firstname: null,
    lastname: null,
    display_name: null,
    image_path: null,
    height: null,
    weight: null,
    date_of_birth: null,
    gender: null,
  }

  const mockNationality: SportmonksCountry = {
    id: 456,
    continent_id: 1,
    name: 'Test Country',
    image_path: 'https://example.com/flag.png',
  }

  const mockPlayer: SportmonksPlayer = {
    ...baseFields,
    country_id: 456,
    nationality_id: 456,
    position_id: 789,
    common_name: 'Test',
    firstname: 'Test',
    lastname: 'Player',
    display_name: 'T. Player',
    image_path: 'https://example.com/player.png',
    height: 180,
    weight: 75,
    date_of_birth: '1990-01-01',
    gender: 'male',
    teams: null,
    statistics: null,
    lineups: null,
    transfers: null,
    pendingtransfers: null,
    trophies: null,
    latest: null,
    metadata: null,
    nationality: mockNationality,
  }

  describe('transformPlayer', () => {
    it('should transform a valid player correctly', () => {
      const result = transformPlayer(mockPlayer)

      expect(result).toEqual({
        id: mockPlayer.id,
        sport_id: mockPlayer.sport_id,
        country_id: mockPlayer.country_id,
        nationality_id: mockPlayer.nationality_id,
        position_id: mockPlayer.position_id,
        detailed_position_id: mockPlayer.detailed_position_id,
        name: mockPlayer.name,
        common_name: mockPlayer.common_name,
        firstname: mockPlayer.firstname,
        lastname: mockPlayer.lastname,
        display_name: mockPlayer.display_name,
        image_path: mockPlayer.image_path,
        height: mockPlayer.height,
        weight: mockPlayer.weight,
        date_of_birth: mockPlayer.date_of_birth,
        gender: mockPlayer.gender,
        teams: mockPlayer.teams,
        statistics: mockPlayer.statistics,
        lineups: mockPlayer.lineups,
        transfers: mockPlayer.transfers,
        pendingtransfers: mockPlayer.pendingtransfers,
        trophies: mockPlayer.trophies,
        latest: mockPlayer.latest,
        metadata: mockPlayer.metadata,
        nationality: mockPlayer.nationality,
      })
    })

    it('should handle omitted optional fields', () => {
      // Create a player with only required fields
      const playerWithOptionals: SportmonksPlayer = {
        ...baseFields,
      }

      const result = transformPlayer(playerWithOptionals)

      // Optional number fields should be null when omitted
      expect(result.country_id).toBeNull()
      expect(result.nationality_id).toBeNull()
      expect(result.position_id).toBeNull()

      // Fields that explicitly accept null
      expect(result.common_name).toBeNull()
      expect(result.firstname).toBeNull()
      expect(result.lastname).toBeNull()
      expect(result.display_name).toBeNull()
      expect(result.image_path).toBeNull()
      expect(result.height).toBeNull()
      expect(result.weight).toBeNull()
      expect(result.date_of_birth).toBeNull()
      expect(result.gender).toBeNull()
    })

    it('should handle omitted object fields', () => {
      // Create a player with only required fields
      const playerWithOmitted: SportmonksPlayer = {
        ...baseFields,
      }

      const result = transformPlayer(playerWithOmitted)

      // Optional object fields should be null when omitted
      expect(result.teams).toBeNull()
      expect(result.statistics).toBeNull()
      expect(result.lineups).toBeNull()
      expect(result.transfers).toBeNull()
      expect(result.pendingtransfers).toBeNull()
      expect(result.trophies).toBeNull()
      expect(result.latest).toBeNull()
      expect(result.metadata).toBeNull()
    })
  })
})
