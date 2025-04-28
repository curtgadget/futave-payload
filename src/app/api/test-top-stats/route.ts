import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type {
  PlayerSeasonStats,
  TopPlayersStat,
  TopStatCategory,
  TopPlayerStatItem,
} from '../v1/types/team'

export async function GET() {
  // Get real player data from the database
  try {
    console.log('Test endpoint - Fetching real player data')
    const payload = await getPayload({ config })

    // Fetch player data from the Rangers team (ID 62)
    const teamResult = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: 62,
        },
      },
      depth: 1,
    })

    if (!teamResult.docs.length) {
      return NextResponse.json({
        success: false,
        error: 'Team not found',
      })
    }

    const team = teamResult.docs[0]
    console.log(`Found team: ${team.name}`)

    // Get player IDs from the team
    if (!Array.isArray(team.players) || team.players.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No players found in team',
      })
    }

    const playerIds = team.players
      .filter((p: any) => p && (typeof p.player_id === 'number' || typeof p.id === 'number'))
      .map((p: any) => {
        if (typeof p.player_id === 'number') return p.player_id
        if (typeof p.id === 'number') return p.id
        return null
      })
      .filter(Boolean)

    console.log(`Found ${playerIds.length} player IDs`)

    // Fetch player data
    if (playerIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid player IDs found',
      })
    }

    const playersResult = await payload.find({
      collection: 'players',
      where: {
        id: {
          in: playerIds,
        },
      },
      depth: 1,
      pagination: false,
      limit: 100,
    })

    console.log(`Retrieved ${playersResult.docs.length} players from database`)

    // Process player statistics
    const seasonId = 23690 // Hardcode the season ID

    // Since we don't have access to the helper, let's create a simple function to extract stats
    const processPlayerStats = (players: any[], seasonId: number): PlayerSeasonStats[] => {
      return players
        .filter((player) => player && player.id)
        .map((player) => {
          const stats = player.seasons?.find(
            (season: any) => season.season_id === seasonId || season.id === seasonId,
          )?.statistics

          if (!stats) return null

          return {
            player_id: player.id,
            name: player.name || 'Unknown Player',
            position_id: player.position_id || 0,
            jersey_number: player.jersey_number || 0,
            image_path: player.image_path || '',
            appearances: stats.appearances || 0,
            minutes_played: stats.minutes_played || 0,
            position: player.position || 'Unknown',
            goals: stats.goals || 0,
            cards: {
              yellow: stats.yellow_cards || 0,
              red: stats.red_cards || 0,
            },
            clean_sheets: stats.clean_sheets || 0,
            assists: stats.assists || 0,
          }
        })
        .filter(Boolean) as PlayerSeasonStats[]
    }

    const playerStats = processPlayerStats(playersResult.docs, seasonId)

    // Now let's create the top_stats array
    const topStats: TopPlayersStat[] = []

    // Print a sample player for debugging
    if (playerStats.length > 0) {
      console.log('Sample player from database:', playerStats[0])
    }

    try {
      // Top goal scorers
      const playersWithGoals = playerStats
        .filter((p: PlayerSeasonStats) => typeof p.goals === 'number' && p.goals > 0)
        .sort((a: PlayerSeasonStats, b: PlayerSeasonStats) => (b.goals || 0) - (a.goals || 0))
        .slice(0, 3)
        .map((player: PlayerSeasonStats) => ({
          player_id: player.player_id,
          name: player.name,
          value: player.goals || 0,
        }))

      if (playersWithGoals.length > 0) {
        console.log(`Found ${playersWithGoals.length} players with goals:`)
        playersWithGoals.forEach((p: TopPlayerStatItem) =>
          console.log(`- ${p.name}: ${p.value} goals`),
        )

        topStats.push({
          category: 'goals' as TopStatCategory,
          players: playersWithGoals,
        })
      }

      // Top assists
      const playersWithAssists = playerStats
        .filter((p: PlayerSeasonStats) => typeof p.assists === 'number' && p.assists > 0)
        .sort((a: PlayerSeasonStats, b: PlayerSeasonStats) => (b.assists || 0) - (a.assists || 0))
        .slice(0, 3)
        .map((player: PlayerSeasonStats) => ({
          player_id: player.player_id,
          name: player.name,
          value: player.assists || 0,
        }))

      if (playersWithAssists.length > 0) {
        console.log(`Found ${playersWithAssists.length} players with assists:`)
        playersWithAssists.forEach((p: TopPlayerStatItem) =>
          console.log(`- ${p.name}: ${p.value} assists`),
        )

        topStats.push({
          category: 'assists' as TopStatCategory,
          players: playersWithAssists,
        })
      }

      // Most minutes played
      const playersWithMinutes = playerStats
        .filter((p: PlayerSeasonStats) => p.minutes_played > 0)
        .sort((a: PlayerSeasonStats, b: PlayerSeasonStats) => b.minutes_played - a.minutes_played)
        .slice(0, 3)
        .map((player: PlayerSeasonStats) => ({
          player_id: player.player_id,
          name: player.name,
          value: player.minutes_played,
        }))

      if (playersWithMinutes.length > 0) {
        console.log(`Found ${playersWithMinutes.length} players with minutes:`)
        playersWithMinutes.forEach((p: TopPlayerStatItem) =>
          console.log(`- ${p.name}: ${p.value} minutes`),
        )

        topStats.push({
          category: 'minutes_played' as TopStatCategory,
          players: playersWithMinutes,
        })
      }

      // Most cards
      const playersWithCards = playerStats
        .filter((p: PlayerSeasonStats) => p.cards && (p.cards.yellow || 0) + (p.cards.red || 0) > 0)
        .sort((a: PlayerSeasonStats, b: PlayerSeasonStats) => {
          const aTotal = (a.cards?.yellow || 0) + (a.cards?.red || 0)
          const bTotal = (b.cards?.yellow || 0) + (b.cards?.red || 0)
          return bTotal - aTotal
        })
        .slice(0, 3)
        .map((player: PlayerSeasonStats) => {
          const totalCards = (player.cards?.yellow || 0) + (player.cards?.red || 0)
          return {
            player_id: player.player_id,
            name: player.name,
            value: totalCards,
          }
        })

      if (playersWithCards.length > 0) {
        console.log(`Found ${playersWithCards.length} players with cards:`)
        playersWithCards.forEach((p: TopPlayerStatItem) => {
          console.log(`- ${p.name}: ${p.value} cards`)
        })

        topStats.push({
          category: 'cards' as TopStatCategory,
          players: playersWithCards,
        })
      }

      console.log(`Generated ${topStats.length} top_stats categories`)
    } catch (error) {
      console.error('Error generating top_stats:', error)
    }

    return NextResponse.json({
      success: true,
      top_stats: topStats,
      player_count: playerStats.length,
    })
  } catch (error) {
    console.error('Error in test endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
