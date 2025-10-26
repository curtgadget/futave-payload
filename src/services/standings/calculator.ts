import type { Payload } from 'payload'
import type { League, Match } from '@/payload-types'

export interface TeamStanding {
  team_id: number
  team_name: string
  position: number
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  form: string // Last 5 results: "WWLDL"
}

export interface LeagueTable {
  season_id: number
  league_id: number
  standings: TeamStanding[]
  total_teams: number
  last_updated: string
}

export class StandingsCalculator {
  private memoryCache = new Map<string, LeagueTable>()
  
  constructor(private payload: Payload) {}

  /**
   * Get current league table, using cache or calculating fresh
   */
  async getCurrentTable(leagueId: number, seasonId?: number): Promise<LeagueTable | null> {
    // Check memory cache first (for same request)
    const cacheKey = `${leagueId}-${seasonId || 'current'}`
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!
    }

    // Check database cache
    const league = await this.payload.findByID({
      collection: 'leagues',
      id: leagueId
    })

    if (!league) return null

    // Check if we have valid cached standings
    if (this.isCacheValid(league, seasonId)) {
      const cachedTable = {
        season_id: league.current_standings!.season_id!,
        league_id: leagueId,
        standings: league.current_standings!.table as TeamStanding[],
        total_teams: league.current_standings!.total_teams!,
        last_updated: league.current_standings!.last_calculated!
      }
      this.memoryCache.set(cacheKey, cachedTable)
      return cachedTable
    }

    // Calculate fresh standings
    if (league.current_standings?.season_id && seasonId && league.current_standings.season_id !== seasonId) {
      console.log(`Cache season mismatch for league ${leagueId}: cached=${league.current_standings.season_id}, requested=${seasonId}. Calculating fresh...`)
    }
    const freshTable = await this.calculateStandings(leagueId, seasonId)
    
    if (freshTable) {
      // Cache in memory and database
      this.memoryCache.set(cacheKey, freshTable)
      await this.cacheStandings(leagueId, freshTable)
    }

    return freshTable
  }

  /**
   * Check if cached standings are still valid
   */
  private isCacheValid(league: League, requestedSeasonId?: number): boolean {
    const cache = league.current_standings
    if (!cache || !cache.table || !cache.expires_at) {
      return false
    }

    // Check if cache has expired
    if (new Date(cache.expires_at) < new Date()) {
      return false
    }

    // Check if season matches (if specified)
    if (requestedSeasonId && cache.season_id !== requestedSeasonId) {
      return false
    }

    return true
  }

  /**
   * Calculate standings from match results
   */
  async calculateStandings(leagueId: number, seasonId?: number): Promise<LeagueTable | null> {
    try {
      // Get current season if not specified
      if (!seasonId) {
        const league = await this.payload.findByID({
          collection: 'leagues',
          id: leagueId
        })
        
        if (league?.currentseason) {
          const currentSeason = league.currentseason as any
          seasonId = currentSeason.id
        }
      }

      if (!seasonId) {
        console.warn(`No season ID found for league ${leagueId}`)
        return null
      }

      // Get all completed matches for this league/season
      const matches = await this.payload.find({
        collection: 'matches',
        where: {
          and: [
            { league_id: { equals: leagueId } }, // league_id is stored as plain number
            { season_id: { equals: seasonId } },
            { state_id: { equals: 5 } } // Full time / finished matches
          ]
        },
        limit: 1000, // High limit to get all matches
        sort: 'starting_at'
      })

      if (matches.docs.length === 0) {
        console.warn(`No completed matches found for league ${leagueId}, season ${seasonId}. Cannot calculate standings.`)
        return null
      }

      console.log(`Calculating standings for league ${leagueId}, season ${seasonId} from ${matches.docs.length} completed matches`)

      // Calculate standings
      const teamStats = new Map<number, {
        team_id: number
        team_name: string
        played: number
        wins: number
        draws: number
        losses: number
        goals_for: number
        goals_against: number
        points: number
        recent_results: string[]
      }>()

      // Process each match
      let processedMatches = 0

      for (const match of matches.docs) {
        const participants = match.participants as any[]
        const scores = match.scores as any[]

        if (!participants || participants.length !== 2) {
          continue
        }

        const homeTeam = participants.find(p => p.meta?.location === 'home')
        const awayTeam = participants.find(p => p.meta?.location === 'away')

        if (!homeTeam || !awayTeam) {
          continue
        }

        // Get final scores
        const homeScore = this.getFinalScore(scores, homeTeam.id)
        const awayScore = this.getFinalScore(scores, awayTeam.id)

        if (homeScore === null || awayScore === null) {
          continue
        }

        processedMatches++

        // Initialize team stats if not exists
        if (!teamStats.has(homeTeam.id)) {
          teamStats.set(homeTeam.id, {
            team_id: homeTeam.id,
            team_name: homeTeam.name,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
            points: 0,
            recent_results: []
          })
        }

        if (!teamStats.has(awayTeam.id)) {
          teamStats.set(awayTeam.id, {
            team_id: awayTeam.id,
            team_name: awayTeam.name,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
            points: 0,
            recent_results: []
          })
        }

        const homeStats = teamStats.get(homeTeam.id)!
        const awayStats = teamStats.get(awayTeam.id)!

        // Update stats
        homeStats.played++
        awayStats.played++
        homeStats.goals_for += homeScore
        homeStats.goals_against += awayScore
        awayStats.goals_for += awayScore
        awayStats.goals_against += homeScore

        // Determine result
        if (homeScore > awayScore) {
          homeStats.wins++
          homeStats.points += 3
          awayStats.losses++
          homeStats.recent_results.push('W')
          awayStats.recent_results.push('L')
        } else if (homeScore < awayScore) {
          awayStats.wins++
          awayStats.points += 3
          homeStats.losses++
          homeStats.recent_results.push('L')
          awayStats.recent_results.push('W')
        } else {
          homeStats.draws++
          awayStats.draws++
          homeStats.points += 1
          awayStats.points += 1
          homeStats.recent_results.push('D')
          awayStats.recent_results.push('D')
        }

        // Keep only last 5 results
        if (homeStats.recent_results.length > 5) {
          homeStats.recent_results = homeStats.recent_results.slice(-5)
        }
        if (awayStats.recent_results.length > 5) {
          awayStats.recent_results = awayStats.recent_results.slice(-5)
        }
      }

      console.log(`[Standings] Processed ${processedMatches} of ${matches.docs.length} matches for league ${leagueId}, season ${seasonId}. Teams in table: ${teamStats.size}`)

      // Convert to standings array and sort
      const standings = Array.from(teamStats.values())
        .map((team, index) => ({
          team_id: team.team_id,
          team_name: team.team_name,
          position: 0, // Will be set after sorting
          played: team.played,
          wins: team.wins,
          draws: team.draws,
          losses: team.losses,
          goals_for: team.goals_for,
          goals_against: team.goals_against,
          goal_difference: team.goals_for - team.goals_against,
          points: team.points,
          form: team.recent_results.join('')
        }))
        .sort((a, b) => {
          // Sort by points, then goal difference, then goals scored
          if (a.points !== b.points) return b.points - a.points
          if (a.goal_difference !== b.goal_difference) return b.goal_difference - a.goal_difference
          return b.goals_for - a.goals_for
        })
        .map((team, index) => ({ ...team, position: index + 1 }))

      return {
        season_id: seasonId,
        league_id: leagueId,
        standings,
        total_teams: standings.length,
        last_updated: new Date().toISOString()
      }

    } catch (error) {
      console.error(`Error calculating standings for league ${leagueId}:`, error)
      return null
    }
  }

  /**
   * Cache standings in the league document
   */
  private async cacheStandings(leagueId: number, table: LeagueTable): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours from now

      await this.payload.update({
        collection: 'leagues',
        id: leagueId,
        data: {
          current_standings: {
            table: table.standings,
            season_id: table.season_id,
            last_calculated: table.last_updated,
            expires_at: expiresAt.toISOString(),
            total_teams: table.total_teams
          }
        }
      })

      // Standings cached successfully
    } catch (error) {
      console.error(`Error caching standings for league ${leagueId}:`, error)
    }
  }

  /**
   * Get final score from match scores array
   */
  private getFinalScore(scoresArr: any[], participantId: number): number | null {
    if (!Array.isArray(scoresArr)) return null
    
    // Find the current/final score for this participant
    const participantScore = scoresArr.find((score: any) => 
      score.participant_id === participantId &&
      (score.description === 'CURRENT' || score.description === 'FT')
    )
    
    if (!participantScore) {
      // Fallback: try 2ND_HALF score (which represents full-time in this format)
      const fullTimeScore = scoresArr.find((score: any) => 
        score.participant_id === participantId &&
        score.description === '2ND_HALF'
      )
      return fullTimeScore?.score?.goals ?? null
    }
    
    return participantScore?.score?.goals ?? null
  }

  /**
   * Get team position from cached standings
   */
  async getTeamPosition(teamId: number, leagueId: number, seasonId?: number): Promise<{
    position: number
    points: number
    played: number
    goal_difference: number
    form: string
    total_teams: number
  } | null> {
    // Use cached standings with proper cache management
    const table = await this.getCurrentTable(leagueId, seasonId)
    if (!table) {
      return null
    }

    const teamStanding = table.standings.find(s => s.team_id === teamId)
    if (!teamStanding) {
      return null
    }

    return {
      position: teamStanding.position,
      points: teamStanding.points,
      played: teamStanding.played,
      goal_difference: teamStanding.goal_difference,
      form: teamStanding.form,
      total_teams: table.total_teams
    }
  }
}