import { PlayerSeasonStats, TopPlayersStat, TopStatCategory } from '../types/team'

/**
 * Options for customizing the top player stats calculation
 */
export interface TopPlayerStatsOptions {
  /** Maximum number of players to include for each category (default: 3) */
  maxPlayersPerCategory?: number
  /** Enable detailed logging (default: false) */
  verbose?: boolean
}

/**
 * Calculate top player statistics across different categories
 * Returns an array of TopPlayersStat objects for different statistical categories
 *
 * @param playerStats Array of player season statistics
 * @param options Configuration options for customizing behavior
 * @returns Array of top stats by category
 */
export function calculateTopPlayerStats(
  playerStats: PlayerSeasonStats[],
  options: TopPlayerStatsOptions = {},
): TopPlayersStat[] {
  // Apply default options
  const maxPlayers = options.maxPlayersPerCategory || 3
  const verbose = options.verbose || process.env.NODE_ENV === 'development'

  if (!playerStats || playerStats.length === 0) {
    if (verbose) console.log('calculateTopPlayerStats: No player stats provided')
    return []
  }

  if (verbose) console.log(`calculateTopPlayerStats: Processing ${playerStats.length} players`)
  const topStats: TopPlayersStat[] = []

  try {
    // Always include minutes played regardless of zero values
    // This ensures we have at least one category
    const minutes = [...playerStats]
      .sort((a, b) => b.minutes_played - a.minutes_played)
      .slice(0, maxPlayers)
      .map((player) => ({
        player_id: player.player_id,
        name: player.name,
        value: player.minutes_played || 0,
      }))

    if (minutes.length > 0) {
      topStats.push({
        category: 'minutes_played' as TopStatCategory,
        players: minutes,
      })
      if (verbose)
        console.log(`calculateTopPlayerStats: Added ${minutes.length} players with most minutes`)
    }

    // Top goal scorers (only if we have players with goals)
    const playersWithGoals = playerStats.filter((p) => typeof p.goals === 'number' && p.goals > 0)
    if (playersWithGoals.length > 0) {
      const goals = [...playersWithGoals]
        .sort((a, b) => (b.goals || 0) - (a.goals || 0))
        .slice(0, maxPlayers)
        .map((player) => ({
          player_id: player.player_id,
          name: player.name,
          value: player.goals || 0,
        }))

      topStats.push({
        category: 'goals' as TopStatCategory,
        players: goals,
      })
      if (verbose) console.log(`calculateTopPlayerStats: Added ${goals.length} top goal scorers`)
    } else if (verbose) {
      console.log('calculateTopPlayerStats: No players with goals found')
    }

    // Top assists (only if we have players with assists)
    const playersWithAssists = playerStats.filter(
      (p) => typeof p.assists === 'number' && p.assists > 0,
    )
    if (playersWithAssists.length > 0) {
      const assists = [...playersWithAssists]
        .sort((a, b) => (b.assists || 0) - (a.assists || 0))
        .slice(0, maxPlayers)
        .map((player) => ({
          player_id: player.player_id,
          name: player.name,
          value: player.assists || 0,
        }))

      topStats.push({
        category: 'assists' as TopStatCategory,
        players: assists,
      })
      if (verbose) console.log(`calculateTopPlayerStats: Added ${assists.length} top assisters`)
    } else if (verbose) {
      console.log('calculateTopPlayerStats: No players with assists found')
    }

    // Most cards (yellow + red combined) - only if we have players with cards
    const playersWithCards = playerStats.filter(
      (p) => p.cards && (p.cards.yellow || 0) + (p.cards.red || 0) > 0,
    )

    if (playersWithCards.length > 0) {
      const cards = [...playersWithCards]
        .sort((a, b) => {
          // Calculate total cards for each player
          const aTotal = (a.cards?.yellow || 0) + (a.cards?.red || 0)
          const bTotal = (b.cards?.yellow || 0) + (b.cards?.red || 0)
          return bTotal - aTotal
        })
        .slice(0, maxPlayers)
        .map((player) => {
          const totalCards = (player.cards?.yellow || 0) + (player.cards?.red || 0)
          return {
            player_id: player.player_id,
            name: player.name,
            value: totalCards,
          }
        })

      topStats.push({
        category: 'cards' as TopStatCategory,
        players: cards,
      })
      if (verbose)
        console.log(`calculateTopPlayerStats: Added ${cards.length} players with most cards`)
    } else if (verbose) {
      console.log('calculateTopPlayerStats: No players with cards found')
    }

    // Goal contributions (goals + assists combined)
    const playersWithContributions = playerStats.filter(
      (p) =>
        (typeof p.goals === 'number' && p.goals > 0) ||
        (typeof p.assists === 'number' && p.assists > 0),
    )

    if (verbose) {
      console.log(
        `calculateTopPlayerStats: Found ${playersWithContributions.length} players with goal contributions`,
      )
    }

    if (playersWithContributions.length > 0) {
      const goalContributions = playersWithContributions
        .map((player) => {
          const goals = player.goals || 0
          const assists = player.assists || 0
          return {
            player_id: player.player_id,
            name: player.name,
            value: goals + assists,
          }
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, maxPlayers)

      topStats.push({
        category: 'goal_contributions' as TopStatCategory,
        players: goalContributions,
      })
      if (verbose)
        console.log(
          `calculateTopPlayerStats: Added ${goalContributions.length} players with goal contributions`,
        )
    } else if (verbose) {
      console.log('calculateTopPlayerStats: No players with goal contributions found')
    }

    // Best ratings - only if we have ratings data
    const playersWithRatings = playerStats.filter(
      (player) => player.rating !== undefined && player.appearances && player.appearances >= 3,
    )

    if (playersWithRatings.length > 0) {
      const bestRatings = [...playersWithRatings]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, maxPlayers)
        .map((player) => ({
          player_id: player.player_id,
          name: player.name,
          value: player.rating || 0,
        }))

      if (bestRatings.length > 0) {
        topStats.push({
          category: 'rating' as TopStatCategory,
          players: bestRatings,
        })
        if (verbose)
          console.log(
            `calculateTopPlayerStats: Added ${bestRatings.length} players with best ratings`,
          )
      }
    } else if (verbose) {
      console.log('calculateTopPlayerStats: No players with ratings found')
    }

    // Add some fallback players if we have very few categories
    // This ensures we always show something meaningful even with limited data
    if (topStats.length <= 1 && playerStats.length > 0) {
      if (verbose)
        console.log('calculateTopPlayerStats: Adding fallback player stats due to limited data')

      // Add top appearances category as a fallback if at least one player has appearances
      const playersWithAppearances = playerStats.filter((p) => p.appearances > 0)
      if (
        playersWithAppearances.length > 0 &&
        !topStats.some((s) => s.category === 'appearances')
      ) {
        const appearances = [...playersWithAppearances]
          .sort((a, b) => (b.appearances || 0) - (a.appearances || 0))
          .slice(0, maxPlayers)
          .map((player) => ({
            player_id: player.player_id,
            name: player.name,
            value: player.appearances || 0,
          }))

        topStats.push({
          category: 'appearances' as TopStatCategory,
          players: appearances,
        })
        if (verbose)
          console.log(
            `calculateTopPlayerStats: Added ${appearances.length} players with most appearances`,
          )
      }

      // If still no categories with data, add top squad players by jersey number as fallback
      if (topStats.length === 0) {
        const playersWithJerseys = playerStats.filter((p) => p.jersey_number)
        if (playersWithJerseys.length > 0) {
          const jerseys = [...playersWithJerseys]
            .sort((a, b) => {
              // Sort by position group first (goalkeepers, defenders, midfielders, forwards)
              const posA = a.position_id || 0
              const posB = b.position_id || 0
              if (posA !== posB) return posA - posB

              // Then by jersey number
              return (a.jersey_number || 99) - (b.jersey_number || 99)
            })
            .slice(0, maxPlayers)
            .map((player) => ({
              player_id: player.player_id,
              name: player.name,
              value: player.jersey_number || 0,
            }))

          topStats.push({
            category: 'squad_numbers' as TopStatCategory,
            players: jerseys,
          })
          if (verbose)
            console.log(
              `calculateTopPlayerStats: Added ${jerseys.length} squad players as fallback`,
            )
        }
      }
    }

    if (verbose) {
      console.log(
        `calculateTopPlayerStats: Calculated ${topStats.length} stat categories:`,
        topStats.map((stat) => stat.category).join(', '),
      )
    }
  } catch (error) {
    console.error('Error calculating top_stats:', error)
  }

  return topStats
}
