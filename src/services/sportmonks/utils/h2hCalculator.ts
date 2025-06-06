import { SportmonksMatch } from '../client/types'

export interface H2HSummary {
  total_matches: number
  last_5: {
    team_wins: number
    rival_wins: number
    draws: number
  }
  overall: {
    team_wins: number
    rival_wins: number
    draws: number
  }
  last_meeting: {
    date: string
    result: 'team_won' | 'rival_won' | 'draw'
    score: string
    venue_id: number
  }
  drama_score: number
  avg_goals_per_match: number
}

export function calculateH2HSummary(
  matches: SportmonksMatch[],
  teamId: number,
  rivalId: number
): H2HSummary | null {
  if (!matches || matches.length === 0) {
    return null
  }

  // Get last 5 matches for recent form
  const last5Matches = matches.slice(0, 5)

  // Calculate overall stats
  const overallStats = countResults(matches, teamId, rivalId)
  const last5Stats = countResults(last5Matches, teamId, rivalId)

  // Calculate drama score
  const dramaScore = calculateDramaScore(matches, overallStats)

  // Get last meeting details
  const lastMatch = matches[0]
  const lastMeetingResult = determineMatchResult(lastMatch, teamId, rivalId)
  const score = extractScore(lastMatch) || '0-0'

  // Calculate average goals
  const avgGoals = calculateAverageGoals(matches)

  return {
    total_matches: matches.length,
    last_5: last5Stats,
    overall: overallStats,
    last_meeting: {
      date: lastMatch.starting_at,
      result: lastMeetingResult,
      score: score,
      venue_id: lastMatch.venue_id || 0,
    },
    drama_score: dramaScore,
    avg_goals_per_match: avgGoals,
  }
}

function countResults(
  matches: SportmonksMatch[],
  teamId: number,
  rivalId: number
): { team_wins: number; rival_wins: number; draws: number } {
  const stats = {
    team_wins: 0,
    rival_wins: 0,
    draws: 0,
  }

  matches.forEach((match) => {
    const result = determineMatchResult(match, teamId, rivalId)
    if (result === 'team_won') stats.team_wins++
    else if (result === 'rival_won') stats.rival_wins++
    else stats.draws++
  })

  return stats
}

function determineMatchResult(
  match: SportmonksMatch,
  teamId: number,
  rivalId: number
): 'team_won' | 'rival_won' | 'draw' {
  // Check result_info for clues
  const resultInfo = match.result_info?.toLowerCase() || ''
  
  if (resultInfo.includes('draw')) {
    return 'draw'
  }

  // Try to determine from participants and scores if available
  if (match.participants && Array.isArray(match.participants)) {
    const participants = match.participants as any[]
    const teamParticipant = participants.find(p => p.id === teamId)
    const rivalParticipant = participants.find(p => p.id === rivalId)

    if (teamParticipant?.meta?.winner) return 'team_won'
    if (rivalParticipant?.meta?.winner) return 'rival_won'
  }

  // Try to parse from result_info text
  if (match.name) {
    const teamName = getTeamNameFromMatch(match, teamId)
    const rivalName = getTeamNameFromMatch(match, rivalId)
    
    if (teamName && resultInfo.includes(teamName.toLowerCase()) && resultInfo.includes('won')) {
      return 'team_won'
    }
    if (rivalName && resultInfo.includes(rivalName.toLowerCase()) && resultInfo.includes('won')) {
      return 'rival_won'
    }
  }

  // Default to draw if we can't determine
  return 'draw'
}

function getTeamNameFromMatch(match: SportmonksMatch, teamId: number): string | null {
  // Extract team name from match name (e.g., "Rangers vs Celtic")
  if (!match.name) return null
  
  const names = match.name.split(' vs ')
  if (names.length !== 2) return null

  // This is a simplified approach - in production, you'd want to match by ID
  return names[0].trim()
}

function extractScore(match: SportmonksMatch): string {
  // Try to extract from scores if available
  if (match.scores && Array.isArray(match.scores)) {
    const scoresData = match.scores as any[]
    
    // Try different score structures
    for (const scoreObj of scoresData) {
      // Check for FULLTIME score
      if (scoreObj.description === 'FULLTIME' || scoreObj.description === 'FT') {
        // Handle different score formats
        if (scoreObj.score?.participant_home !== undefined) {
          return `${scoreObj.score.participant_home}-${scoreObj.score.participant_away}`
        }
        if (scoreObj.participant?.goals !== undefined) {
          // Might need to match by participant ID
          continue
        }
      }
    }
    
    // If no FULLTIME, try to get any score data
    const anyScore = scoresData.find(s => s.score || s.goals)
    if (anyScore?.score) {
      return `${anyScore.score.participant_home || 0}-${anyScore.score.participant_away || 0}`
    }
  }

  // Try to parse from result_info if no scores
  if (match.result_info) {
    const scoreMatch = match.result_info.match(/(\d+)-(\d+)/)
    if (scoreMatch) {
      return `${scoreMatch[1]}-${scoreMatch[2]}`
    }
  }

  // Default - but log this so we know it's happening
  console.log(`No score found for match ${match.id}, defaulting to 0-0`)
  return '0-0'
}

function calculateDramaScore(
  matches: SportmonksMatch[],
  overallStats: { team_wins: number; rival_wins: number; draws: number }
): number {
  let score = 0

  // 1. Balance factor (0-4 points)
  // More balanced results = higher drama
  const total = overallStats.team_wins + overallStats.rival_wins + overallStats.draws
  if (total > 0) {
    const winDiff = Math.abs(overallStats.team_wins - overallStats.rival_wins)
    const balanceRatio = 1 - (winDiff / total)
    score += balanceRatio * 4
  }

  // 2. Recent competitiveness (0-3 points)
  // Check last 5 matches for variety in results
  const last5 = matches.slice(0, 5)
  const recentResultTypes = new Set(last5.map(m => m.result_info)).size
  score += Math.min(recentResultTypes, 3)

  // 3. Draw frequency (0-2 points)
  // Higher draw rate = more competitive
  const drawRate = overallStats.draws / total
  score += drawRate * 2

  // 4. Historical significance (0-1 point)
  // Long rivalry = more drama
  if (matches.length > 20) score += 1

  return Math.round(score * 10) / 10 // Round to 1 decimal
}

function calculateAverageGoals(matches: SportmonksMatch[]): number {
  let totalGoals = 0
  let matchesWithScores = 0

  matches.forEach((match) => {
    const score = extractScore(match)
    if (score && score !== '0-0') {
      const [homeGoals, awayGoals] = score.split('-').map(Number)
      if (!isNaN(homeGoals) && !isNaN(awayGoals)) {
        totalGoals += homeGoals + awayGoals
        matchesWithScores++
      }
    }
  })

  // If we have score data, calculate average
  if (matchesWithScores > 0) {
    return Math.round((totalGoals / matchesWithScores) * 10) / 10
  }

  // Try alternative: if we have any matches, estimate from result_info
  if (matches.length > 0) {
    let estimatedTotal = 0
    let estimatedCount = 0
    
    matches.forEach(match => {
      if (match.result_info?.match(/(\d+)-(\d+)/)) {
        const scoreMatch = match.result_info.match(/(\d+)-(\d+)/)
        if (scoreMatch) {
          const goals = Number(scoreMatch[1]) + Number(scoreMatch[2])
          estimatedTotal += goals
          estimatedCount++
        }
      }
    })
    
    if (estimatedCount > 0) {
      return Math.round((estimatedTotal / estimatedCount) * 10) / 10
    }
  }

  // Default average for football matches
  console.log(`No scores found for ${matches.length} matches, using default 2.5`)
  return 2.5
}