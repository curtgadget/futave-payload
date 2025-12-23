import type { Match, Team, Rival, League } from '@/payload-types'
import type { Payload } from 'payload'
import { StandingsCalculator } from '../standings/calculator'
import { getLeaguePrestige } from '@/constants/leagues'

export interface WaveScore {
  total: number
  tier: 'S' | 'A' | 'B' | 'C'
  factors: {
    rivalry: number
    position: number
    zone: number
    form: number
    h2h: number
    timing: number
    prestige: number
  }
  calculated_at: string
  expires_at: string
}

export interface WaveFactors {
  rivalry: number
  position: number
  zone: number
  form: number
  h2h: number
  timing: number
  prestige: number
}

/**
 * Wave Score Calculator
 *
 * Calculates excitement scores (0-110) for matches based on 7 factors:
 * - Rivalry: 0-30 (classic rivalries)
 * - Position: 0-20 (table proximity)
 * - Zone: 0-20 (title race, Europe, relegation battles)
 * - Form: 0-15 (recent results similarity)
 * - H2H: 0-10 (head-to-head drama)
 * - Timing: 0-5 (season stage, weekends)
 * - Prestige: 0-10 (league tier: tier1=10, tier2=7, tier3=4, tier4=0)
 *
 * Tier Classification:
 * - S-Tier: ≥80 (Must-watch matches)
 * - A-Tier: ≥60 (Highly compelling)
 * - B-Tier: ≥40 (Worth watching)
 * - C-Tier: <40 (Standard matches)
 */
export class WaveScoreCalculator {
  private standingsCalculator: StandingsCalculator

  constructor(private payload: Payload) {
    this.standingsCalculator = new StandingsCalculator(payload)
  }

  /**
   * Calculate pre-match wave score for a match
   */
  async calculatePreMatchScore(
    match: Match,
    homeTeam: Team,
    awayTeam: Team
  ): Promise<WaveScore> {
    const factors = await this.getFactorBreakdown(match, homeTeam, awayTeam)
    const total = this.sumFactors(factors)
    const tier = this.determineTier(total)

    return {
      total,
      tier,
      factors,
      calculated_at: new Date().toISOString(),
      expires_at: match.starting_at
    }
  }

  /**
   * Get individual factor scores
   */
  async getFactorBreakdown(
    match: Match,
    homeTeam: Team,
    awayTeam: Team
  ): Promise<WaveFactors> {
    const [
      rivalry,
      position,
      zone,
      form,
      h2h,
      timing,
      prestige
    ] = await Promise.all([
      this.calculateRivalryScore(homeTeam.id, awayTeam.id),
      this.calculatePositionProximity(match, homeTeam, awayTeam),
      this.calculateZoneImportance(match, homeTeam, awayTeam),
      this.calculateFormDifferential(match, homeTeam, awayTeam),
      this.calculateH2HDrama(homeTeam.id, awayTeam.id),
      this.calculateTimingBonus(match),
      this.calculateLeaguePrestige(match)
    ])

    return { rivalry, position, zone, form, h2h, timing, prestige }
  }

  /**
   * Calculate rivalry score (0-30)
   */
  private async calculateRivalryScore(homeTeamId: number, awayTeamId: number): Promise<number> {
    // Check if teams are rivals
    const rival = await this.payload.find({
      collection: 'rivals',
      where: {
        or: [
          {
            and: [
              { team_id: { equals: homeTeamId } },
              { rival_team_id: { equals: awayTeamId } }
            ]
          },
          {
            and: [
              { team_id: { equals: awayTeamId } },
              { rival_team_id: { equals: homeTeamId } }
            ]
          }
        ]
      },
      limit: 1
    })

    if (rival.docs.length === 0) {
      return 0 // Not rivals
    }

    // Base rivalry score
    return 25 // High base score for any rivalry
  }

  /**
   * Calculate position proximity score (0-20)
   */
  private async calculatePositionProximity(match: Match, homeTeam: Team, awayTeam: Team): Promise<number> {
    try {
      const leagueId = typeof match.league_id === 'object' ? match.league_id.id : match.league_id
      
      // Get positions from calculated standings
      const [homePosition, awayPosition] = await Promise.all([
        this.standingsCalculator.getTeamPosition(homeTeam.id, leagueId, match.season_id),
        this.standingsCalculator.getTeamPosition(awayTeam.id, leagueId, match.season_id)
      ])

      if (!homePosition || !awayPosition) {
        return 0
      }

      const positionGap = Math.abs(homePosition.position - awayPosition.position)

      // Closer positions = higher score
      if (positionGap === 0) return 20 // Same position
      if (positionGap === 1) return 18 // Adjacent
      if (positionGap <= 3) return 15 // Very close
      if (positionGap <= 5) return 10 // Close
      if (positionGap <= 8) return 5  // Moderate gap
      return 0 // Large gap
    } catch (error) {
      console.error('Error calculating position proximity:', error)
      return 0
    }
  }

  /**
   * Calculate zone importance score (0-20)
   */
  private async calculateZoneImportance(match: Match, homeTeam: Team, awayTeam: Team): Promise<number> {
    try {
      const leagueId = typeof match.league_id === 'object' ? match.league_id.id : match.league_id
      
      // Get positions from calculated standings
      const [homePosition, awayPosition] = await Promise.all([
        this.standingsCalculator.getTeamPosition(homeTeam.id, leagueId, match.season_id),
        this.standingsCalculator.getTeamPosition(awayTeam.id, leagueId, match.season_id)
      ])

      if (!homePosition || !awayPosition) {
        return 0
      }

      const totalTeams = homePosition.total_teams
      let score = 0

      // Check for title race (top 3-4 teams)
      const titleZone = Math.ceil(totalTeams * 0.2)
      if (homePosition.position <= titleZone || awayPosition.position <= titleZone) {
        score = Math.max(score, 15)
        
        // Both in title race
        if (homePosition.position <= titleZone && awayPosition.position <= titleZone) {
          score = 20
        }
      }

      // Check for European qualification (typically top 6-7)
      const europeZone = Math.ceil(totalTeams * 0.35)
      if (homePosition.position <= europeZone || awayPosition.position <= europeZone) {
        score = Math.max(score, 10)
      }

      // Check for relegation battle (bottom 3-4)
      const relegationZone = totalTeams - Math.ceil(totalTeams * 0.2)
      if (homePosition.position >= relegationZone || awayPosition.position >= relegationZone) {
        score = Math.max(score, 15)
        
        // Both in relegation zone
        if (homePosition.position >= relegationZone && awayPosition.position >= relegationZone) {
          score = 20
        }
      }

      return score
    } catch (error) {
      console.error('Error calculating zone importance:', error)
      return 0
    }
  }

  /**
   * Calculate form differential score (0-15)
   */
  private async calculateFormDifferential(match: Match, homeTeam: Team, awayTeam: Team): Promise<number> {
    try {
      const leagueId = typeof match.league_id === 'object' ? match.league_id.id : match.league_id
      
      // Get form from calculated standings
      const [homePosition, awayPosition] = await Promise.all([
        this.standingsCalculator.getTeamPosition(homeTeam.id, leagueId, match.season_id),
        this.standingsCalculator.getTeamPosition(awayTeam.id, leagueId, match.season_id)
      ])

      if (!homePosition || !awayPosition) {
        return 0
      }

      const homeForm = homePosition.form || ''
      const awayForm = awayPosition.form || ''

      // Calculate form points (W=3, D=1, L=0)
      const calculateFormPoints = (form: string): number => {
        return form.split('').reduce((total, result) => {
          if (result === 'W') return total + 3
          if (result === 'D') return total + 1
          return total
        }, 0)
      }

      const homeFormPoints = calculateFormPoints(homeForm) // Already last 5 games from calculator
      const awayFormPoints = calculateFormPoints(awayForm)
      const formGap = Math.abs(homeFormPoints - awayFormPoints)

      // Similar form = more unpredictable = higher score
      if (formGap <= 3) return 15  // Very similar form
      if (formGap <= 6) return 10  // Similar form
      if (formGap <= 9) return 5   // Some difference
      return 0 // Large form difference
    } catch (error) {
      console.error('Error calculating form differential:', error)
      return 0
    }
  }

  /**
   * Calculate H2H drama score (0-10)
   */
  private async calculateH2HDrama(homeTeamId: number, awayTeamId: number): Promise<number> {
    // Get rival record with H2H data
    const rival = await this.payload.find({
      collection: 'rivals',
      where: {
        or: [
          {
            and: [
              { team_id: { equals: homeTeamId } },
              { rival_team_id: { equals: awayTeamId } }
            ]
          },
          {
            and: [
              { team_id: { equals: awayTeamId } },
              { rival_team_id: { equals: homeTeamId } }
            ]
          }
        ]
      },
      limit: 1
    })

    if (rival.docs.length === 0 || !rival.docs[0].h2h_summary) {
      return 0
    }

    // Use the pre-calculated drama score
    return rival.docs[0].h2h_summary.drama_score || 0
  }

  /**
   * Calculate timing bonus (0-5)
   */
  private calculateTimingBonus(match: Match): number {
    const matchDate = new Date(match.starting_at)
    const now = new Date()
    const seasonProgress = this.estimateSeasonProgress(matchDate)

    // Late season matches are more important
    if (seasonProgress > 0.85) return 5  // Final weeks
    if (seasonProgress > 0.75) return 3  // Late season
    if (seasonProgress > 0.65) return 1  // Mid-late season

    // Derby/weekend bonus
    const dayOfWeek = matchDate.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
      return 1
    }

    return 0
  }

  /**
   * Calculate league prestige score (0-10)
   */
  private async calculateLeaguePrestige(match: Match): Promise<number> {
    try {
      // Get league data to access tier
      const leagueId = typeof match.league_id === 'object' ? match.league_id.id : match.league_id

      const leagueResult = await this.payload.find({
        collection: 'leagues',
        where: { id: { equals: leagueId } },
        limit: 1
      })

      if (leagueResult.docs.length === 0) {
        return 0
      }

      const league = leagueResult.docs[0] as League
      return getLeaguePrestige(league.tier)
    } catch (error) {
      console.error('Error calculating league prestige:', error)
      return 0
    }
  }

  /**
   * Estimate season progress (0-1)
   */
  private estimateSeasonProgress(matchDate: Date): number {
    // Rough estimate: August to May season
    const month = matchDate.getMonth()
    
    // Map months to progress (0 = August, 9 = May)
    const monthProgress: { [key: number]: number } = {
      7: 0,    // August
      8: 0.1,  // September
      9: 0.2,  // October
      10: 0.3, // November
      11: 0.4, // December
      0: 0.5,  // January
      1: 0.6,  // February
      2: 0.7,  // March
      3: 0.8,  // April
      4: 0.9,  // May
      5: 1,    // June (playoffs/finals)
      6: 1,    // July (finals)
    }

    return monthProgress[month] || 0.5
  }

  /**
   * Sum all factors to get total score
   */
  private sumFactors(factors: WaveFactors): number {
    return Object.values(factors).reduce((sum, value) => sum + value, 0)
  }

  /**
   * Determine tier based on total score
   */
  determineTier(totalScore: number): 'S' | 'A' | 'B' | 'C' {
    if (totalScore >= 80) return 'S'
    if (totalScore >= 60) return 'A'
    if (totalScore >= 40) return 'B'
    return 'C'
  }
}