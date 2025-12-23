/**
 * League Prestige Scores
 *
 * Defines prestige values (0-10) based on league tier to boost wave scores
 * for matches in more popular/prestigious competitions.
 */

export const LEAGUE_PRESTIGE_SCORES = {
  tier1: 10, // Top European leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League)
  tier2: 7, // Major European/International leagues (Eredivisie, Primeira Liga, Liga MX, Scottish Prem, Europa League)
  tier3: 4, // Other competitions (Championship, MLS, other continental)
  tier4: 0, // Lower/regional leagues
} as const

/**
 * Get prestige score for a league tier
 */
export function getLeaguePrestige(tier?: string | null): number {
  if (!tier) return LEAGUE_PRESTIGE_SCORES.tier4

  switch (tier) {
    case 'tier1':
      return LEAGUE_PRESTIGE_SCORES.tier1
    case 'tier2':
      return LEAGUE_PRESTIGE_SCORES.tier2
    case 'tier3':
      return LEAGUE_PRESTIGE_SCORES.tier3
    case 'tier4':
    default:
      return LEAGUE_PRESTIGE_SCORES.tier4
  }
}
