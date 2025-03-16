// Constants for Sportmonks API detail type IDs

// Standing detail type IDs
export const STANDING_DETAIL_TYPES = {
  // Matches played
  OVERALL_MATCHES_PLAYED: 129, // Matches Played
  HOME_MATCHES_PLAYED: 130, // Home Matches Played
  AWAY_MATCHES_PLAYED: 131, // Away Matches Played

  // Results - Standard IDs
  OVERALL_WON: 85, // Overall Won
  HOME_WON: 86, // Home Won
  AWAY_WON: 87, // Away Won

  OVERALL_DRAW: 88, // Overall Draw
  HOME_DRAW: 89, // Home Draw
  AWAY_DRAW: 90, // Away Draw

  OVERALL_LOST: 91, // Overall Lost
  HOME_LOST: 92, // Home Lost
  AWAY_LOST: 93, // Away Lost

  // Results - Alternative IDs (sometimes used by Sportmonks)
  ALT_OVERALL_WON: 130, // Alternative Overall Won
  ALT_HOME_WON: 133, // Alternative Home Won
  ALT_AWAY_WON: 136, // Alternative Away Won

  ALT_OVERALL_DRAW: 131, // Alternative Overall Draw
  ALT_HOME_DRAW: 134, // Alternative Home Draw
  ALT_AWAY_DRAW: 137, // Alternative Away Draw

  ALT_OVERALL_LOST: 132, // Alternative Overall Lost
  ALT_HOME_LOST: 135, // Alternative Home Lost
  ALT_AWAY_LOST: 138, // Alternative Away Lost

  // Goals
  OVERALL_GOALS_FOR: 133, // Overall Goals Scored
  HOME_GOALS_FOR: 139, // Home Goals Scored
  AWAY_GOALS_FOR: 141, // Away Goals Scored

  OVERALL_GOALS_AGAINST: 134, // Overall Goals Conceded
  HOME_GOALS_AGAINST: 140, // Home Goals Conceded
  AWAY_GOALS_AGAINST: 142, // Away Goals Conceded

  // Clean sheets
  OVERALL_CLEAN_SHEETS: 94, // Overall Clean Sheets
  HOME_CLEAN_SHEETS: 95, // Home Clean Sheets
  AWAY_CLEAN_SHEETS: 96, // Away Clean Sheets

  // Failed to score
  OVERALL_FAILED_TO_SCORE: 97, // Overall Failed to Score
  HOME_FAILED_TO_SCORE: 98, // Home Failed to Score
  AWAY_FAILED_TO_SCORE: 99, // Away Failed to Score
}

// String patterns for identifying types by name
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

// Helper function to check if a standing detail type name matches any of the patterns
export function matchesDetailPattern(typeName: string, patterns: string[]): boolean {
  return patterns.some((pattern) => typeName.toLowerCase().includes(pattern.toLowerCase()))
}

/**
 * Mapping of Sportmonks rule type IDs to qualification status types
 * Based on confirmed values from the metadata database:
 * - 180: UEFA Champions League
 * - 181: UEFA Europa League
 * - 182: Relegation
 * - 183: Championship Round (top half after league split)
 * - 184: Relegation Round (bottom half after league split)
 */
export const RULE_TYPE_ID_MAP: Record<number, { type: string; name: string; color: string }> = {
  // Official UEFA competition qualifications
  180: {
    type: 'champions_league',
    name: 'Champions League',
    color: '#1E74D3', // UEFA Champions League blue
  },
  181: {
    type: 'europa_league',
    name: 'Europa League',
    color: '#FF5733', // UEFA Europa League orange
  },

  // Official relegation status
  182: {
    type: 'relegation',
    name: 'Relegation',
    color: '#FF0000', // Red
  },

  // League split rounds (used in Scottish Premiership and some other leagues)
  183: {
    type: 'championship_round',
    name: 'Championship Round',
    color: '#5C97DB', // Light blue
  },
  184: {
    type: 'relegation_round',
    name: 'Relegation Round',
    color: '#FFA500', // Orange
  },

  // Keep any speculative IDs that might still be useful
  187: {
    type: 'conference_league',
    name: 'Conference League',
    color: '#24B71E', // Green
  },
}

// League-specific qualification rules (for when API doesn't provide this info)
export interface QualificationRule {
  type: string
  name: string
  color: string
  positions: number[] // Array of positions this rule applies to
}

export interface LeagueQualificationRules {
  [leagueId: string]: QualificationRule[]
}

export const LEAGUE_QUALIFICATION_RULES: LeagueQualificationRules = {
  // Premier League (England)
  '8': [
    {
      type: 'champions_league',
      name: 'Champions League',
      color: '#1e74d3', // UEFA Champions League blue
      positions: [1, 2, 3, 4],
    },
    {
      type: 'europa_league',
      name: 'Europa League',
      color: '#f58c20', // UEFA Europa League orange
      positions: [5],
    },
    {
      type: 'conference_league',
      name: 'Conference League',
      color: '#15b050', // UEFA Conference League green
      positions: [6],
    },
    {
      type: 'relegation',
      name: 'Relegation',
      color: '#d32f2f', // Red for relegation
      positions: [18, 19, 20],
    },
  ],

  // Scottish Premiership (Scotland)
  '501': [
    {
      type: 'champions_league_qualifying',
      name: 'Champions League Qualifying',
      color: '#1e74d3', // UEFA Champions League blue
      positions: [1],
    },
    {
      type: 'europa_league_qualifying',
      name: 'Europa League Qualifying',
      color: '#f58c20', // UEFA Europa League orange
      positions: [2, 3],
    },
    {
      type: 'conference_league_qualifying',
      name: 'Conference League Qualifying',
      color: '#15b050', // UEFA Conference League green
      positions: [4],
    },
    {
      type: 'championship_round',
      name: 'Championship Round',
      color: '#5C97DB', // Light blue
      positions: [5, 6],
    },
    {
      type: 'relegation_round',
      name: 'Relegation Round',
      color: '#FFA500', // Orange
      positions: [7, 8, 9, 10],
    },
    {
      type: 'relegation_playoff',
      name: 'Relegation Playoff',
      color: '#ff9800', // Orange
      positions: [11],
    },
    {
      type: 'relegation',
      name: 'Relegation',
      color: '#d32f2f', // Red
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
      color: '#ff9800', // Orange for playoff
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
      color: '#5c97db', // Lighter blue
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
