import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { WaveScoreCalculator } from '../calculator'
import type { Match, Team, Rival } from '@/payload-types'
import type { Payload } from 'payload'

// Mock the StandingsCalculator
jest.mock('../../standings/calculator')

describe('WaveScoreCalculator', () => {
  let calculator: WaveScoreCalculator
  let mockPayload: Partial<Payload>
  let mockStandingsCalculator: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create mock standings calculator
    mockStandingsCalculator = {
      getTeamPosition: jest.fn()
    }
    
    // Mock the StandingsCalculator constructor
    const { StandingsCalculator } = require('../../standings/calculator')
    StandingsCalculator.mockImplementation(() => mockStandingsCalculator)
    
    // Create mock payload
    mockPayload = {
      find: jest.fn() as any,
      findByID: jest.fn() as any
    }

    calculator = new WaveScoreCalculator(mockPayload as Payload)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('calculatePreMatchScore', () => {
    it('should calculate complete wave score for a match', async () => {
      const match: Partial<Match> = {
        id: 1,
        starting_at: '2024-12-25T15:00:00Z',
        league_id: 100,
        season_id: 2024
      }

      const homeTeam: Partial<Team> = {
        id: 10,
        name: 'Home United'
      }

      const awayTeam: Partial<Team> = {
        id: 20,
        name: 'Away City'
      }

      // Mock standings positions
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 1, total_teams: 20, form: 'WWWWW' }) // home team
        .mockResolvedValueOnce({ position: 2, total_teams: 20, form: 'WWWWD' }) // away team
        .mockResolvedValueOnce({ position: 1, total_teams: 20, form: 'WWWWW' }) // home team (zone)
        .mockResolvedValueOnce({ position: 2, total_teams: 20, form: 'WWWWD' }) // away team (zone)
        .mockResolvedValueOnce({ position: 1, total_teams: 20, form: 'WWWWW' }) // home team (form)
        .mockResolvedValueOnce({ position: 2, total_teams: 20, form: 'WWWWD' }) // away team (form)

      // Mock no rivalry
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({ docs: [] })

      const result = await calculator.calculatePreMatchScore(
        match as Match,
        homeTeam as Team,
        awayTeam as Team
      )

      expect(result).toMatchObject({
        total: expect.any(Number),
        tier: expect.stringMatching(/^[SABC]$/),
        factors: {
          rivalry: 0,
          position: 18, // Adjacent positions
          zone: 20, // Both in title race
          form: 15, // Very similar form
          h2h: 0,
          timing: 0 // December, not late season
        },
        calculated_at: expect.any(String),
        expires_at: match.starting_at
      })

      expect(result.total).toBe(53) // Sum of factors
      expect(result.tier).toBe('B') // 40-59 range
    })

    it('should handle matches with rivalry', async () => {
      const match: Partial<Match> = {
        id: 1,
        starting_at: '2024-05-15T15:00:00Z', // Late season
        league_id: 100,
        season_id: 2024
      }

      const homeTeam: Partial<Team> = { id: 10 }
      const awayTeam: Partial<Team> = { id: 20 }

      // Mock rivalry exists with H2H drama
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({
        docs: [{
          team_id: 10,
          rival_team_id: 20,
          h2h_summary: { drama_score: 8 }
        }]
      })

      // Mock standings for other calculations
      mockStandingsCalculator.getTeamPosition.mockResolvedValue({
        position: 5,
        total_teams: 20,
        form: 'WLDWL'
      })

      const result = await calculator.calculatePreMatchScore(
        match as Match,
        homeTeam as Team,
        awayTeam as Team
      )

      expect(result.factors.rivalry).toBe(25) // Base rivalry score
      expect(result.factors.h2h).toBe(8) // Drama score from H2H
      expect(result.factors.timing).toBe(5) // Late season bonus
    })
  })

  describe('calculateRivalryScore', () => {
    it('should return 25 for rivals', async () => {
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({
        docs: [{ team_id: 10, rival_team_id: 20 }]
      })

      const score = await (calculator as any).calculateRivalryScore(10, 20)
      expect(score).toBe(25)
    })

    it('should return 0 for non-rivals', async () => {
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({ docs: [] })

      const score = await (calculator as any).calculateRivalryScore(10, 30)
      expect(score).toBe(0)
    })

    it('should check rivalry in both directions', async () => {
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({
        docs: [{ team_id: 20, rival_team_id: 10 }]
      })

      const score = await (calculator as any).calculateRivalryScore(10, 20)
      expect(score).toBe(25)

      // Verify the query checked both directions
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'rivals',
        where: {
          or: [
            { and: [{ team_id: { equals: 10 } }, { rival_team_id: { equals: 20 } }] },
            { and: [{ team_id: { equals: 20 } }, { rival_team_id: { equals: 10 } }] }
          ]
        },
        limit: 1
      })
    })
  })

  describe('calculatePositionProximity', () => {
    const match: Partial<Match> = {
      league_id: 100,
      season_id: 2024
    }

    const homeTeam: Partial<Team> = { id: 10 }
    const awayTeam: Partial<Team> = { id: 20 }

    it('should return 20 for teams in same position', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 5, total_teams: 20 })
        .mockResolvedValueOnce({ position: 5, total_teams: 20 })

      const score = await (calculator as any).calculatePositionProximity(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(20)
    })

    it('should return 18 for adjacent positions', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 5, total_teams: 20 })
        .mockResolvedValueOnce({ position: 6, total_teams: 20 })

      const score = await (calculator as any).calculatePositionProximity(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(18)
    })

    it('should return appropriate scores for different gaps', async () => {
      const testCases = [
        { gap: 3, expected: 15 },
        { gap: 5, expected: 10 },
        { gap: 8, expected: 5 },
        { gap: 12, expected: 0 }
      ]

      for (const { gap, expected } of testCases) {
        mockStandingsCalculator.getTeamPosition
          .mockResolvedValueOnce({ position: 5, total_teams: 20 })
          .mockResolvedValueOnce({ position: 5 + gap, total_teams: 20 })

        const score = await (calculator as any).calculatePositionProximity(
          match,
          homeTeam,
          awayTeam
        )
        expect(score).toBe(expected)
      }
    })

    it('should handle missing standings data', async () => {
      mockStandingsCalculator.getTeamPosition.mockResolvedValue(null)

      const score = await (calculator as any).calculatePositionProximity(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      mockStandingsCalculator.getTeamPosition.mockRejectedValue(new Error('DB Error'))

      const score = await (calculator as any).calculatePositionProximity(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(0)
    })
  })

  describe('calculateZoneImportance', () => {
    const match: Partial<Match> = {
      league_id: 100,
      season_id: 2024
    }

    const homeTeam: Partial<Team> = { id: 10 }
    const awayTeam: Partial<Team> = { id: 20 }

    it('should return 20 for both teams in title race', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 1, total_teams: 20 })
        .mockResolvedValueOnce({ position: 3, total_teams: 20 })

      const score = await (calculator as any).calculateZoneImportance(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(20)
    })

    it('should return 15 for one team in title race', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 2, total_teams: 20 })
        .mockResolvedValueOnce({ position: 10, total_teams: 20 })

      const score = await (calculator as any).calculateZoneImportance(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(15)
    })

    it('should return 20 for both teams in relegation zone', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 18, total_teams: 20 })
        .mockResolvedValueOnce({ position: 19, total_teams: 20 })

      const score = await (calculator as any).calculateZoneImportance(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(20)
    })

    it('should return 10 for European qualification zone', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 6, total_teams: 20 })
        .mockResolvedValueOnce({ position: 12, total_teams: 20 })

      const score = await (calculator as any).calculateZoneImportance(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(10)
    })

    it('should return 0 for mid-table clash', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 10, total_teams: 20 })
        .mockResolvedValueOnce({ position: 12, total_teams: 20 })

      const score = await (calculator as any).calculateZoneImportance(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(0)
    })
  })

  describe('calculateFormDifferential', () => {
    const match: Partial<Match> = {
      league_id: 100,
      season_id: 2024
    }

    const homeTeam: Partial<Team> = { id: 10 }
    const awayTeam: Partial<Team> = { id: 20 }

    it('should return 15 for teams with very similar form', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 5, form: 'WWWDL' }) // 10 points
        .mockResolvedValueOnce({ position: 6, form: 'WWDWL' }) // 10 points

      const score = await (calculator as any).calculateFormDifferential(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(15)
    })

    it('should return 10 for similar form', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 5, form: 'WWWWW' }) // 15 points
        .mockResolvedValueOnce({ position: 6, form: 'WWWDL' }) // 10 points

      const score = await (calculator as any).calculateFormDifferential(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(10)
    })

    it('should return 0 for large form difference', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 5, form: 'WWWWW' }) // 15 points
        .mockResolvedValueOnce({ position: 6, form: 'LLLLL' }) // 0 points

      const score = await (calculator as any).calculateFormDifferential(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(0)
    })

    it('should handle missing form data', async () => {
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 5, form: '' })
        .mockResolvedValueOnce({ position: 6, form: '' })

      const score = await (calculator as any).calculateFormDifferential(
        match,
        homeTeam,
        awayTeam
      )
      expect(score).toBe(15) // Both have 0 points, very similar
    })
  })

  describe('calculateH2HDrama', () => {
    it('should return drama score from rival H2H data', async () => {
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({
        docs: [{
          team_id: 10,
          rival_team_id: 20,
          h2h_summary: { drama_score: 7 }
        }]
      })

      const score = await (calculator as any).calculateH2HDrama(10, 20)
      expect(score).toBe(7)
    })

    it('should return 0 for non-rivals', async () => {
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({ docs: [] })

      const score = await (calculator as any).calculateH2HDrama(10, 30)
      expect(score).toBe(0)
    })

    it('should handle missing H2H summary', async () => {
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({
        docs: [{
          team_id: 10,
          rival_team_id: 20,
          h2h_summary: null
        }]
      })

      const score = await (calculator as any).calculateH2HDrama(10, 20)
      expect(score).toBe(0)
    })
  })

  describe('calculateTimingBonus', () => {
    it('should return 5 for final weeks (May)', async () => {
      const match: Partial<Match> = {
        starting_at: '2024-05-15T15:00:00Z'
      }

      const score = (calculator as any).calculateTimingBonus(match)
      expect(score).toBe(5)
    })

    it('should return 3 for late season (April)', async () => {
      const match: Partial<Match> = {
        starting_at: '2024-04-15T15:00:00Z'
      }

      const score = (calculator as any).calculateTimingBonus(match)
      expect(score).toBe(3)
    })

    it('should return 1 for mid-late season (March)', async () => {
      const match: Partial<Match> = {
        starting_at: '2024-03-15T15:00:00Z'
      }

      const score = (calculator as any).calculateTimingBonus(match)
      expect(score).toBe(1)
    })

    it('should return 1 for weekend matches in regular season', async () => {
      const saturdayMatch: Partial<Match> = {
        starting_at: '2024-11-16T15:00:00Z' // Saturday
      }
      
      const sundayMatch: Partial<Match> = {
        starting_at: '2024-11-17T15:00:00Z' // Sunday
      }

      expect((calculator as any).calculateTimingBonus(saturdayMatch)).toBe(1)
      expect((calculator as any).calculateTimingBonus(sundayMatch)).toBe(1)
    })

    it('should return 0 for midweek matches in regular season', async () => {
      const match: Partial<Match> = {
        starting_at: '2024-11-13T20:00:00Z' // Wednesday
      }

      const score = (calculator as any).calculateTimingBonus(match)
      expect(score).toBe(0)
    })
  })

  describe('determineTier', () => {
    it('should correctly classify tiers based on total score', () => {
      expect(calculator.determineTier(85)).toBe('S') // >= 80
      expect(calculator.determineTier(80)).toBe('S') // = 80
      expect(calculator.determineTier(70)).toBe('A') // >= 60
      expect(calculator.determineTier(60)).toBe('A') // = 60
      expect(calculator.determineTier(50)).toBe('B') // >= 40
      expect(calculator.determineTier(40)).toBe('B') // = 40
      expect(calculator.determineTier(30)).toBe('C') // < 40
      expect(calculator.determineTier(0)).toBe('C')  // minimum
    })
  })

  describe('Edge Cases and Integration', () => {
    it('should handle league ID as object', async () => {
      const match: Partial<Match> = {
        league_id: { id: 100 } as any,
        season_id: 2024
      }

      const homeTeam: Partial<Team> = { id: 10 }
      const awayTeam: Partial<Team> = { id: 20 }

      mockStandingsCalculator.getTeamPosition.mockResolvedValue({
        position: 5,
        total_teams: 20,
        form: 'WWDLL'
      })

      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({ docs: [] })

      const result = await calculator.calculatePreMatchScore(
        match as Match,
        homeTeam as Team,
        awayTeam as Team
      )

      expect(result).toBeDefined()
      expect(result.total).toBeGreaterThanOrEqual(0)
    })

    it('should handle all factors returning 0', async () => {
      const match: Partial<Match> = {
        id: 1,
        starting_at: '2024-11-13T20:00:00Z', // Midweek
        league_id: 100,
        season_id: 2024
      }

      const homeTeam: Partial<Team> = { id: 10 }
      const awayTeam: Partial<Team> = { id: 20 }

      // Mock no rivalry
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({ docs: [] })

      // Mock for all factors to return 0:
      // Position: large gap (position 2 vs 19) = gap of 17 = 0 points
      // Zone: avoid all special zones = 0 points  
      // Form: very different form (15 vs 0 points) = 0 points
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 2, total_teams: 20, form: 'WWWWW' })  // home position
        .mockResolvedValueOnce({ position: 19, total_teams: 20, form: 'LLLLL' }) // away position - gap of 17
        .mockResolvedValueOnce({ position: 2, total_teams: 20, form: 'WWWWW' })  // home zone
        .mockResolvedValueOnce({ position: 19, total_teams: 20, form: 'LLLLL' }) // away zone
        .mockResolvedValueOnce({ position: 2, total_teams: 20, form: 'WWWWW' })  // home form
        .mockResolvedValueOnce({ position: 19, total_teams: 20, form: 'LLLLL' }) // away form

      const result = await calculator.calculatePreMatchScore(
        match as Match,
        homeTeam as Team,
        awayTeam as Team
      )

      // With position 2 in title race and position 19 in relegation zone,
      // we get zone score of 15 (only counts the max, not both)
      expect(result.total).toBe(15)
      expect(result.tier).toBe('C') // Still C tier (< 40)
    })

    it('should handle maximum possible score', async () => {
      const match: Partial<Match> = {
        id: 1,
        starting_at: '2024-05-18T15:00:00Z', // Late season Saturday
        league_id: 100,
        season_id: 2024
      }

      const homeTeam: Partial<Team> = { id: 10 }
      const awayTeam: Partial<Team> = { id: 20 }

      // Mock rivalry with high H2H drama
      ;(mockPayload.find as jest.MockedFunction<any>).mockResolvedValue({
        docs: [{
          team_id: 10,
          rival_team_id: 20,
          h2h_summary: { drama_score: 10 }
        }]
      })

      // Mock perfect conditions
      mockStandingsCalculator.getTeamPosition
        .mockResolvedValueOnce({ position: 1, total_teams: 20, form: 'WWWWW' })
        .mockResolvedValueOnce({ position: 1, total_teams: 20, form: 'WWWWW' })
        .mockResolvedValueOnce({ position: 1, total_teams: 20, form: 'WWWWW' })
        .mockResolvedValueOnce({ position: 1, total_teams: 20, form: 'WWWWW' })
        .mockResolvedValueOnce({ position: 1, total_teams: 20, form: 'WWWWW' })
        .mockResolvedValueOnce({ position: 1, total_teams: 20, form: 'WWWWW' })

      const result = await calculator.calculatePreMatchScore(
        match as Match,
        homeTeam as Team,
        awayTeam as Team
      )

      // Maximum: rivalry(25) + position(20) + zone(20) + form(15) + h2h(10) + timing(5) = 95
      expect(result.total).toBe(95)
      expect(result.tier).toBe('S')
    })
  })
})