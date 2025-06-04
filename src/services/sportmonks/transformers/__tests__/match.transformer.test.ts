import { describe, expect, it } from '@jest/globals'
import { transformMatch } from '../match.transformer'
import type { SportmonksMatch } from '../../client/types'

describe('Match Transformer', () => {
  const mockMatch: SportmonksMatch = {
    id: 123,
    sport_id: 1,
    league_id: 456,
    season_id: 789,
    stage_id: 101,
    group_id: 102,
    aggregate_id: 103,
    round_id: 104,
    state_id: 1,
    venue_id: 105,
    name: 'Test Match',
    starting_at: '2024-02-05T20:00:00.000000Z',
    result_info: 'Test Result',
    leg: 'Final',
    details: 'Match Details',
    length: 90,
    participants: null,
    scores: null,
    venue: null,
    state: null,
    league: null,
    season: null,
    stage: null,
    round: null,
    group: null,
    aggregate: null,
    statistics: null,
    events: null,
    periods: null,
    lineups: null,
    sidelined: null,
    coaches: null,
    metadata: null,
    weatherreport: null,
  }

  describe('transformMatch', () => {
    it('should transform a valid match correctly', () => {
      const result = transformMatch(mockMatch)

      expect(result).toEqual({
        id: mockMatch.id,
        sport_id: mockMatch.sport_id,
        league_id: mockMatch.league_id,
        season_id: mockMatch.season_id,
        stage_id: mockMatch.stage_id,
        group_id: mockMatch.group_id,
        aggregate_id: mockMatch.aggregate_id,
        round_id: mockMatch.round_id,
        state_id: mockMatch.state_id,
        venue_id: mockMatch.venue_id,
        name: mockMatch.name,
        starting_at: mockMatch.starting_at,
        result_info: mockMatch.result_info,
        leg: mockMatch.leg,
        details: mockMatch.details,
        length: mockMatch.length,
        participants: null,
        scores: null,
        venue: null,
        state: null,
        league: null,
        season: null,
        stage: null,
        round: null,
        group: null,
        aggregate: null,
        statistics: null,
        events: null,
        periods: null,
        lineups: null,
        sidelined: null,
        coaches: null,
        metadata: null,
        weatherreport: null,
      })
    })

    it('should handle null optional fields', () => {
      const matchWithNulls: SportmonksMatch = {
        ...mockMatch,
        group_id: null,
        aggregate_id: null,
        round_id: null,
        venue_id: null,
        name: null,
        starting_at: null,
        result_info: null,
        details: null,
        length: null,
      }

      const result = transformMatch(matchWithNulls)

      expect(result.group_id).toBeNull()
      expect(result.aggregate_id).toBeNull()
      expect(result.round_id).toBeNull()
      expect(result.venue_id).toBeNull()
      expect(result.name).toBeNull()
      expect(result.starting_at).toBeNull()
      expect(result.result_info).toBeNull()
      expect(result.details).toBeNull()
      expect(result.length).toBeNull()
    })

    it('should handle undefined optional fields', () => {
      const matchWithUndefined = { ...mockMatch }
      delete matchWithUndefined.participants
      delete matchWithUndefined.scores
      delete matchWithUndefined.venue
      delete matchWithUndefined.statistics

      const result = transformMatch(matchWithUndefined as SportmonksMatch)

      expect(result.participants).toBeNull()
      expect(result.scores).toBeNull()
      expect(result.venue).toBeNull()
      expect(result.statistics).toBeNull()
    })

    it('should handle ISO date string in starting_at', () => {
      const matchWithDate = {
        ...mockMatch,
        starting_at: '2024-02-05T20:00:00.000000Z',
      }

      const result = transformMatch(matchWithDate)
      expect(result.starting_at).toBe('2024-02-05T20:00:00.000000Z')
    })
  })
})
