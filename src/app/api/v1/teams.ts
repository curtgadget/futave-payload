import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { teamDataFetcher } from './services/teamDataFetcher'
import type { TeamOverviewCompact, TeamFormMatch, TeamCurrentPosition, TeamOverviewStats, TopStatPlayer } from './types/team'

// Helper functions for compact overview
function getMatchResult(match: any, teamId: string): 'W' | 'L' | 'D' {
  if (!match.final_score) return 'D'
  
  const homeTeam = match.participants.find((p: any) => p.meta?.location === 'home')
  const isHomeTeam = homeTeam?.id.toString() === teamId
  
  const homeScore = match.final_score.home
  const awayScore = match.final_score.away
  
  if (homeScore === awayScore) return 'D'
  
  if (isHomeTeam) {
    return homeScore > awayScore ? 'W' : 'L'
  } else {
    return awayScore > homeScore ? 'W' : 'L'
  }
}

function calculateTeamForm(matches: any[], teamId: string, limit = 5): TeamFormMatch[] {
  return matches
    .slice(0, limit)
    .map(match => {
      const homeTeam = match.participants.find((p: any) => p.meta?.location === 'home')
      const awayTeam = match.participants.find((p: any) => p.meta?.location === 'away')
      const isHomeTeam = homeTeam?.id.toString() === teamId
      const opponent = isHomeTeam ? awayTeam : homeTeam
      
      return {
        id: match.id,
        result: getMatchResult(match, teamId),
        final_score: match.final_score || { home: 0, away: 0 },
        opponent: {
          id: opponent?.id || 0,
          name: opponent?.name || 'Unknown',
          image_path: opponent?.image_path
        },
        home_away: isHomeTeam ? 'home' as const : 'away' as const,
        starting_at: match.starting_at
      }
    })
}

function getCurrentPosition(tableData: any, teamId: string): TeamCurrentPosition | null {
  const seasons = Object.keys(tableData)
  if (seasons.length === 0) return null
  
  const latestSeasonKey = seasons[0]
  const latestSeason = tableData[latestSeasonKey]
  
  if (!latestSeason?.standings?.[0]?.standings) return null
  
  const teamPosition = latestSeason.standings[0].standings.find(
    (row: any) => row.team_id.toString() === teamId
  )
  
  if (!teamPosition) return null
  
  return {
    position: teamPosition.position,
    points: teamPosition.points,
    played: teamPosition.played,
    goal_difference: teamPosition.goal_difference,
    form: teamPosition.form ? teamPosition.form.split('').slice(-5) : [],
    qualification_status: teamPosition.qualification_status
  }
}

function extractTopStats(statsData: any): TeamOverviewStats {
  const topStats = statsData.top_stats || []
  
  const getTopPlayers = (category: string, limit = 3): TopStatPlayer[] => {
    const stat = topStats.find((s: any) => s.category === category)
    if (!stat) return []
    
    return stat.players.slice(0, limit).map((player: any) => ({
      player_id: player.player_id,
      name: player.name,
      image_path: player.image_path,
      value: player.value,
      position: player.position
    }))
  }
  
  return {
    top_rated: getTopPlayers('rating'),
    top_scorers: getTopPlayers('goals'),
    top_assists: getTopPlayers('assists')
  }
}

const getTeamOverviewCompactHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 2] // Get team ID from /v1/team/:id/overview

  if (!id) {
    return Response.json({ error: 'Team ID is required' }, { status: 400 })
  }

  try {
    // Fetch data from existing services
    const [fixturesData, tableData, statsData] = await Promise.all([
      teamDataFetcher.getFixtures(id, { 
        page: 1, 
        limit: 10, 
        type: 'past',
        includeNextMatch: true 
      }),
      teamDataFetcher.getTable(id),
      teamDataFetcher.getStats(id)
    ])

    // Calculate team form from recent matches
    const form = calculateTeamForm(fixturesData.docs, id, 5)
    
    // Get current league position
    const currentPosition = getCurrentPosition(tableData, id)
    
    // Extract top stats
    const topStats = extractTopStats(statsData)
    
    // Get recent fixtures (last 3 completed matches)
    const recentFixtures = fixturesData.docs.slice(0, 3)
    
    // Determine current season
    const currentSeasonId = statsData.season_id || Object.keys(tableData)[0]
    const currentSeasonName = statsData.seasons?.find(s => s.id.toString() === currentSeasonId.toString())?.name || 'Current Season'
    
    const overview: TeamOverviewCompact = {
      id: id,
      name: 'Team Name', // TODO: Get from team base data
      season_id: currentSeasonId,
      season_name: currentSeasonName,
      form,
      next_match: fixturesData.nextMatch,
      current_position: currentPosition,
      stats: topStats,
      recent_fixtures: recentFixtures
    }

    return Response.json(overview)
    
  } catch (error) {
    console.error('Error in team overview compact endpoint:', error)
    return Response.json(
      { 
        error: 'Failed to fetch team overview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}



const getTeamOverviewCompactPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getTeamOverviewCompactHandler(req)
}

const getTeamOverviewCompactPage: APIRouteV1 = {
  path: '/v1/team/:id/overview',
  method: 'get',
  handler: getTeamOverviewCompactPageHandler,
}

export default getTeamOverviewCompactPage
