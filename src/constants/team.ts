import type { PositionGroup } from '@/app/api/v1/types/team'

/**
 * Player Position Constants
 */
export const POSITION_GROUP_MAP: Record<number, PositionGroup> = {
  24: 'goalkeepers', // Goalkeeper
  25: 'defenders', // Defender
  26: 'midfielders', // Midfielder
  27: 'forwards', // Forward/Striker
}

export function getPositionGroup(positionId: number | undefined): PositionGroup {
  if (!positionId) return 'midfielders' // Default to midfielders if no position
  return POSITION_GROUP_MAP[positionId] || 'midfielders'
}

// Detailed position mappings based on actual Sportmonks metadata-types
export const DETAILED_POSITION_MAP: Record<number, string> = {
  // Basic positions (position_id)
  24: 'Goalkeeper',
  25: 'Defender', 
  26: 'Midfielder',
  27: 'Attacker',
  
  // Detailed positions (detailed_position_id) - verified from metadata-types collection
  148: 'Centre Back',
  149: 'Defensive Midfield',
  150: 'Attacking Midfield',
  151: 'Centre Forward',
  152: 'Left Wing',
  153: 'Central Midfield',
  154: 'Right Back',
  155: 'Left Back',
  156: 'Right Wing',
  157: 'Left Midfield',
  158: 'Right Midfield',
  163: 'Secondary Striker',
  
  // Add more as we discover them in the metadata-types collection
} as const

// Function to get detailed position name
export function getDetailedPositionName(
  positionId: number | undefined | null,
  detailedPositionId: number | undefined | null
): string | undefined {
  // Try detailed position first
  if (detailedPositionId && DETAILED_POSITION_MAP[detailedPositionId]) {
    return DETAILED_POSITION_MAP[detailedPositionId]
  }
  
  // Fall back to basic position group name
  if (positionId && POSITION_GROUP_MAP[positionId]) {
    const group = POSITION_GROUP_MAP[positionId]
    switch (group) {
      case 'goalkeepers': return 'Goalkeeper'
      case 'defenders': return 'Defender'
      case 'midfielders': return 'Midfielder'
      case 'forwards': return 'Forward'
      default: return undefined
    }
  }
  
  return undefined
}

/**
 * Team Statistics Constants
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
  SHOTS_TOTAL: 41, // Total shots taken
  SHOTS_ON_TARGET: 113, // Shots on target
} as const

export type TeamStatisticTypeId = (typeof TeamStatisticTypeIds)[keyof typeof TeamStatisticTypeIds]

export const ALL_TEAM_STATISTIC_TYPE_IDS: TeamStatisticTypeId[] =
  Object.values(TeamStatisticTypeIds)

/**
 * Player Statistics Constants
 */
export const PlayerStatisticTypeIds = {
  GOALS: 52, // Same as GOALS_FOR in team stats
  YELLOW_CARDS: 84, // Same as team stats
  GOALS_AGAINST: 88, // Same as team stats
  MINUTES_PLAYED: 119,
  CLEAN_SHEETS: 194, // Same as team stats
  WINS: 214, // Same as team stats
  DRAWS: 215, // Same as team stats
  LOSSES: 216, // Same as team stats
  ASSISTS: 79,
  APPEARANCES: 322,
} as const

export type PlayerStatisticTypeId =
  (typeof PlayerStatisticTypeIds)[keyof typeof PlayerStatisticTypeIds]

export const ALL_PLAYER_STATISTIC_TYPE_IDS: PlayerStatisticTypeId[] =
  Object.values(PlayerStatisticTypeIds)

/**
 * Standing Detail Constants
 */
export const STANDING_DETAIL_TYPES = {
  // Matches played
  OVERALL_MATCHES_PLAYED: 129,
  HOME_MATCHES_PLAYED: 130,
  AWAY_MATCHES_PLAYED: 131,

  // Results - Standard IDs
  OVERALL_WON: 85,
  HOME_WON: 86,
  AWAY_WON: 87,

  OVERALL_DRAW: 88,
  HOME_DRAW: 89,
  AWAY_DRAW: 90,

  OVERALL_LOST: 91,
  HOME_LOST: 92,
  AWAY_LOST: 93,

  // Results - Alternative IDs
  ALT_OVERALL_WON: 130,
  ALT_HOME_WON: 133,
  ALT_AWAY_WON: 136,

  ALT_OVERALL_DRAW: 131,
  ALT_HOME_DRAW: 134,
  ALT_AWAY_DRAW: 137,

  ALT_OVERALL_LOST: 132,
  ALT_HOME_LOST: 135,
  ALT_AWAY_LOST: 138,

  // Goals
  OVERALL_GOALS_FOR: 133,
  HOME_GOALS_FOR: 139,
  AWAY_GOALS_FOR: 141,

  OVERALL_GOALS_AGAINST: 134,
  HOME_GOALS_AGAINST: 140,
  AWAY_GOALS_AGAINST: 142,

  // Clean sheets
  OVERALL_CLEAN_SHEETS: 94,
  HOME_CLEAN_SHEETS: 95,
  AWAY_CLEAN_SHEETS: 96,

  // Failed to score
  OVERALL_FAILED_TO_SCORE: 97,
  HOME_FAILED_TO_SCORE: 98,
  AWAY_FAILED_TO_SCORE: 99,
}

export const STANDING_DETAIL_NAME_PATTERNS = {
  MATCHES_PLAYED: ['matches played', 'games played', 'played', 'overall matched played'],
  WON: ['won', 'win', 'victory', 'victories', 'overall won'],
  DRAW: ['draw', 'drawn', 'tie', 'tied', 'overall draw'],
  LOST: ['lost', 'loss', 'defeats', 'defeat', 'overall lost'],
  GOALS_FOR: ['goals for', 'goals scored', 'scored', 'goal scored', 'overall goals scored'],
  GOALS_AGAINST: [
    'goals against',
    'goals conceded',
    'conceded',
    'goal conceded',
    'overall goals conceded',
  ],
  CLEAN_SHEETS: ['clean sheet', 'clean sheets', 'overall clean sheets'],
  FAILED_TO_SCORE: ['failed to score', 'scoreless', 'overall failed to score'],
}

export function matchesDetailPattern(typeName: string, patterns: string[]): boolean {
  return patterns.some((pattern) => typeName.toLowerCase().includes(pattern.toLowerCase()))
}

/**
 * Team Qualification Constants
 */
export const RULE_TYPE_ID_MAP: Record<number, { type: string; name: string; color: string }> = {
  // Official UEFA competition qualifications
  180: {
    type: 'champions_league',
    name: 'Champions League',
    color: '#1E74D3',
  },
  181: {
    type: 'europa_league',
    name: 'Europa League',
    color: '#FF5733',
  },
  182: {
    type: 'relegation',
    name: 'Relegation',
    color: '#FF0000',
  },
  183: {
    type: 'championship_round',
    name: 'Championship Round',
    color: '#5C97DB',
  },
  184: {
    type: 'relegation_round',
    name: 'Relegation Round',
    color: '#FFA500',
  },
  187: {
    type: 'conference_league',
    name: 'Conference League',
    color: '#24B71E',
  },
}

export type QualificationRule = {
  type: string
  name: string
  color: string
  positions: number[]
}

export type LeagueQualificationRules = {
  [leagueId: string]: QualificationRule[]
}

export const LEAGUE_QUALIFICATION_RULES: LeagueQualificationRules = {
  // Premier League (England)
  '8': [
    {
      type: 'champions_league',
      name: 'Champions League',
      color: '#1e74d3',
      positions: [1, 2, 3, 4],
    },
    {
      type: 'europa_league',
      name: 'Europa League',
      color: '#f58c20',
      positions: [5],
    },
    {
      type: 'conference_league',
      name: 'Conference League',
      color: '#15b050',
      positions: [6],
    },
    {
      type: 'relegation',
      name: 'Relegation',
      color: '#d32f2f',
      positions: [18, 19, 20],
    },
  ],
  // Scottish Premiership (Scotland)
  '501': [
    {
      type: 'champions_league_qualifying',
      name: 'Champions League Qualifying',
      color: '#1e74d3',
      positions: [1],
    },
    {
      type: 'europa_league_qualifying',
      name: 'Europa League Qualifying',
      color: '#f58c20',
      positions: [2, 3],
    },
    {
      type: 'conference_league_qualifying',
      name: 'Conference League Qualifying',
      color: '#15b050',
      positions: [4],
    },
    {
      type: 'championship_round',
      name: 'Championship Round',
      color: '#5C97DB',
      positions: [5, 6],
    },
    {
      type: 'relegation_round',
      name: 'Relegation Round',
      color: '#FFA500',
      positions: [7, 8, 9, 10],
    },
    {
      type: 'relegation_playoff',
      name: 'Relegation Playoff',
      color: '#ff9800',
      positions: [11],
    },
    {
      type: 'relegation',
      name: 'Relegation',
      color: '#d32f2f',
      positions: [12],
    },
  ],
  // La Liga (Spain)
  '564': [
    {
      type: 'champions_league',
      name: 'Champions League',
      color: '#1e74d3',
      positions: [1, 2, 3, 4],
    },
    {
      type: 'europa_league',
      name: 'Europa League',
      color: '#f58c20',
      positions: [5, 6],
    },
    {
      type: 'relegation',
      name: 'Relegation',
      color: '#d32f2f',
      positions: [18, 19, 20],
    },
  ],
  // Bundesliga (Germany)
  '82': [
    {
      type: 'champions_league',
      name: 'Champions League',
      color: '#1e74d3',
      positions: [1, 2, 3, 4],
    },
    {
      type: 'europa_league',
      name: 'Europa League',
      color: '#f58c20',
      positions: [5, 6],
    },
    {
      type: 'conference_league',
      name: 'Conference League',
      color: '#15b050',
      positions: [7],
    },
    {
      type: 'relegation_playoff',
      name: 'Relegation Playoff',
      color: '#ff9800',
      positions: [16],
    },
    {
      type: 'relegation',
      name: 'Relegation',
      color: '#d32f2f',
      positions: [17, 18],
    },
  ],
  // Serie A (Italy)
  '384': [
    {
      type: 'champions_league',
      name: 'Champions League',
      color: '#1e74d3',
      positions: [1, 2, 3, 4],
    },
    {
      type: 'europa_league',
      name: 'Europa League',
      color: '#f58c20',
      positions: [5, 6],
    },
    {
      type: 'conference_league',
      name: 'Conference League',
      color: '#15b050',
      positions: [7],
    },
    {
      type: 'relegation',
      name: 'Relegation',
      color: '#d32f2f',
      positions: [18, 19, 20],
    },
  ],
  // Ligue 1 (France)
  '301': [
    {
      type: 'champions_league',
      name: 'Champions League',
      color: '#1e74d3',
      positions: [1, 2, 3],
    },
    {
      type: 'champions_league_qualifying',
      name: 'Champions League Qualifying',
      color: '#5c97db',
      positions: [4],
    },
    {
      type: 'europa_league',
      name: 'Europa League',
      color: '#f58c20',
      positions: [5],
    },
    {
      type: 'conference_league',
      name: 'Conference League',
      color: '#15b050',
      positions: [6],
    },
    {
      type: 'relegation_playoff',
      name: 'Relegation Playoff',
      color: '#ff9800',
      positions: [16],
    },
    {
      type: 'relegation',
      name: 'Relegation',
      color: '#d32f2f',
      positions: [17, 18],
    },
  ],
}
