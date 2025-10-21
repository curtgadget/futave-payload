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
  
  // Try to get the specific categories we need
  let topRated = getTopPlayers('rating')
  let topScorers = getTopPlayers('goals')
  let topAssists = getTopPlayers('assists')
  
  // If we have player_stats, we can calculate these ourselves
  if (statsData.player_stats && Array.isArray(statsData.player_stats)) {
    const playerStats = statsData.player_stats
    
    // Calculate top scorers if not already present
    if (topScorers.length === 0) {
      const playersWithGoals = playerStats
        .filter((p: any) => typeof p.goals === 'number' && p.goals > 0)
        .sort((a: any, b: any) => (b.goals || 0) - (a.goals || 0))
        .slice(0, 3)
      
      topScorers = playersWithGoals.map((p: any) => ({
        player_id: p.player_id,
        name: p.name,
        image_path: p.image_path || undefined,
        value: p.goals || 0,
        position: p.position || undefined
      }))
    }
    
    // Calculate top assists if not already present
    if (topAssists.length === 0) {
      const playersWithAssists = playerStats
        .filter((p: any) => typeof p.assists === 'number' && p.assists > 0)
        .sort((a: any, b: any) => (b.assists || 0) - (a.assists || 0))
        .slice(0, 3)
      
      topAssists = playersWithAssists.map((p: any) => ({
        player_id: p.player_id,
        name: p.name,
        image_path: p.image_path || undefined,
        value: p.assists || 0,
        position: p.position || undefined
      }))
    }
    
    // Calculate top rated if not already present
    if (topRated.length === 0) {
      const playersWithRating = playerStats
        .filter((p: any) => typeof p.rating === 'number' && p.rating > 0)
        .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3)
      
      topRated = playersWithRating.map((p: any) => ({
        player_id: p.player_id,
        name: p.name,
        image_path: p.image_path || undefined,
        value: p.rating || 0,
        position: p.position || undefined
      }))
    }
  }
  
  return {
    top_rated: topRated,
    top_scorers: topScorers,
    top_assists: topAssists
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
    // Import getPayload
    const { getPayload } = await import('payload')
    const payload = await getPayload({ config: await import('@/payload.config').then(m => m.default) })
    
    // Fetch team data to get the team name
    const team = await payload.findByID({
      collection: 'teams',
      id: parseInt(id, 10),
    })
    
    if (!team) {
      return Response.json({ error: 'Team not found' }, { status: 404 })
    }
    
    // Determine the current season ID from activeseasons
    let currentSeasonId: string | undefined
    if (team.activeseasons && Array.isArray(team.activeseasons) && team.activeseasons.length > 0) {
      // Prefer Premier League season if available
      const plSeason: any = team.activeseasons.find((s: any) => s.league_id === 8)
      currentSeasonId = plSeason ? String(plSeason.id) : String((team.activeseasons[0] as any).id)
    }
    
    // Fetch data from existing services
    const [fixturesData, tableData, statsData] = await Promise.all([
      teamDataFetcher.getFixtures(id, { 
        page: 1, 
        limit: 10, 
        type: 'past',
        includeNextMatch: true 
      }),
      teamDataFetcher.getTable(id),
      teamDataFetcher.getStats(id, currentSeasonId, true) // Pass current season and includeAllPlayers
    ])

    // Calculate team form from recent matches
    const form = calculateTeamForm(fixturesData.docs, id, 5)
    
    // Get current league position
    const currentPosition = getCurrentPosition(tableData, id)
    
    // Extract top stats
    const topStats = extractTopStats(statsData)
    
    // Get recent fixtures (last 3 completed matches)
    const recentFixtures = fixturesData.docs.slice(0, 3)
    
    // Update season info based on what was actually returned from stats
    const actualSeasonId = statsData.current_season.season_id ||
      (currentSeasonId ? parseInt(currentSeasonId) : undefined) ||
      parseInt(Object.keys(tableData)[0]) || 0
    let seasonName = 'Current Season'
    
    // Try to get season name from team's activeseasons or season_map
    if (team.activeseasons && Array.isArray(team.activeseasons)) {
      const activeSeason: any = team.activeseasons.find((s: any) => s.id === actualSeasonId)
      if (activeSeason) {
        seasonName = activeSeason.name
      }
    }
    if (seasonName === 'Current Season' && team.season_map && Array.isArray(team.season_map)) {
      const season: any = team.season_map.find((s: any) => s.id === actualSeasonId)
      if (season) {
        seasonName = season.name
      }
    }
    
    const overview: TeamOverviewCompact = {
      id: id,
      name: team.name || 'Unknown Team',
      season_id: actualSeasonId,
      season_name: seasonName,
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
