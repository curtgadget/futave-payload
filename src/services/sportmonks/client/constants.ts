/**
 * Sportmonks API Constants
 */

/**
 * Team Statistic Type IDs
 */
export const TeamStatisticTypeIds = {
  CLEAN_SHEETS: 194,
  WINS: 214,
  DRAWS: 215,
  LOSSES: 216,
  GOALS_FOR: 52,
  GOALS_AGAINST: 88,
  RED_CARDS: 83,
  YELLOW_CARDS: 84,
} as const

// Type for team statistic type IDs
export type TeamStatisticTypeId = (typeof TeamStatisticTypeIds)[keyof typeof TeamStatisticTypeIds]

// Array of all team statistic type IDs for convenience
export const ALL_TEAM_STATISTIC_TYPE_IDS: TeamStatisticTypeId[] =
  Object.values(TeamStatisticTypeIds)
