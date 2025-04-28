import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const teamId = url.searchParams.get('teamId') || '62' // Default to Rangers
    const seasonId = url.searchParams.get('seasonId') || '23690' // Default to current season
    const numericSeasonId = parseInt(seasonId, 10)

    // Get the payload instance
    const payload = await getPayload({ config })

    // Get team data
    const teamResult = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: parseInt(teamId, 10),
        },
      },
      depth: 1,
    })

    if (!teamResult.docs.length) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const team = teamResult.docs[0]

    // Get player IDs from the team
    if (!Array.isArray(team.players) || team.players.length === 0) {
      return NextResponse.json({ error: 'No players found in team' }, { status: 404 })
    }

    const playerIds = team.players
      .filter((p: any) => p && (typeof p.player_id === 'number' || typeof p.id === 'number'))
      .map((p: any) => {
        if (typeof p.player_id === 'number') return p.player_id
        if (typeof p.id === 'number') return p.id
        return null
      })
      .filter(Boolean)

    // Get top player IDs to analyze
    const topPlayerIds = playerIds.slice(0, 5)

    // Fetch those players with full details
    const playersResult = await payload.find({
      collection: 'players',
      where: {
        id: {
          in: topPlayerIds,
        },
      },
      depth: 2,
    })

    // Analyze the statistics for these players
    const playerStats = playersResult.docs.map((player: any) => {
      // Find stats for the specified season
      const seasonStats = findPlayerSeasonStats(player.statistics, numericSeasonId)

      // Return the player with raw stats
      return {
        player_id: player.id,
        name: player.name || player.display_name || 'Unknown Player',
        position: player.position || 'Unknown',
        raw_season_stats: seasonStats || 'No stats found',
        assist_details: extractAssistDetails(seasonStats),
        all_seasons: player.statistics
          ? Object.keys(player.statistics).map((key) => ({
              id: player.statistics[key].season_id,
              name: player.statistics[key].season?.name || 'Unknown Season',
            }))
          : [],
      }
    })

    // Return the analysis
    return NextResponse.json({
      team_name: team.name,
      season_id: numericSeasonId,
      players_analyzed: playerStats.length,
      player_stats: playerStats,
    })
  } catch (error) {
    console.error('Error in debug-player-stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

// Helper function to find player stats for a season
// Simplified version for this endpoint
function findPlayerSeasonStats(statistics: Record<string, any>, seasonId: number): any {
  if (!statistics || typeof statistics !== 'object') {
    return null
  }

  // Look through all statistics entries to find the matching season
  for (const key in statistics) {
    const stat = statistics[key]
    if (stat && typeof stat === 'object' && stat.season_id === seasonId) {
      return stat
    }
  }

  return null
}

// Extract assist-related details for analysis
function extractAssistDetails(seasonStats: any) {
  if (!seasonStats || !Array.isArray(seasonStats.details)) {
    return 'No assist data found'
  }

  // Find any assist-related statistics
  const assistDetails = seasonStats.details.filter((detail: any) => {
    // Look for type_id 321 (assists) or any description containing "assist"
    return (
      detail.type_id === 321 ||
      (detail.type && detail.type.name && detail.type.name.toLowerCase().includes('assist'))
    )
  })

  return assistDetails.length > 0 ? assistDetails : 'No specific assist details found'
}
