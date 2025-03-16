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

// Helper function to check if a name contains any of the patterns
export function matchesDetailPattern(name: string, patterns: string[]): boolean {
  const lowerName = name.toLowerCase()
  return patterns.some((pattern) => lowerName.includes(pattern))
}
