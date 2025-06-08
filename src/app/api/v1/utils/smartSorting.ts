/**
 * Smart Sorting Algorithm for Match Lists
 * Combines league priority with wave scores for optimal user experience
 */

export interface SmartSortConfig {
  mode: 'priority' | 'waves' | 'hybrid' | 'discovery'
  waveWeight: number // 0-1, how much wave scores influence sorting
  priorityWeight: number // 0-1, how much league priority influences sorting
  boostThreshold: number // Wave score threshold for boosting matches
}

export interface MatchForSorting {
  id: number
  league_priority: number
  wave_score?: {
    total: number
    tier: string
  }
  starting_at: string
  league_id: number
}

/**
 * Calculate smart sort score for a match
 */
export function calculateSmartSortScore(
  match: MatchForSorting, 
  config: SmartSortConfig
): number {
  const {
    mode,
    waveWeight = 0.3,
    priorityWeight = 0.7,
    boostThreshold = 60
  } = config

  const leaguePriority = match.league_priority || 20
  const waveScore = match.wave_score?.total || 0

  switch (mode) {
    case 'priority':
      // Pure league priority (current behavior)
      return leaguePriority

    case 'waves':
      // Pure wave score sorting
      return waveScore

    case 'hybrid':
      // Balanced: 70% league priority + 30% wave score
      const normalizedPriority = Math.min(leaguePriority / 300, 1) * 100
      const hybridScore = (normalizedPriority * priorityWeight) + (waveScore * waveWeight)
      
      // Boost high-wave matches from any league
      const waveBoost = waveScore >= boostThreshold ? 20 : 0
      
      return hybridScore + waveBoost

    case 'discovery':
      // Discovery mode: High wave scores override league priority
      if (waveScore >= boostThreshold) {
        return 1000 + waveScore // Always show exciting matches first
      }
      return leaguePriority + (waveScore * 0.1)

    default:
      return leaguePriority
  }
}

/**
 * Predefined sorting configurations for different UX contexts
 */
export const SORT_PRESETS: Record<string, SmartSortConfig> = {
  // Default: Slightly favor exciting matches while respecting league preferences
  default: {
    mode: 'hybrid',
    waveWeight: 0.3,
    priorityWeight: 0.7,
    boostThreshold: 60
  },

  // Featured: Strong league priority with wave discovery
  featured: {
    mode: 'hybrid',
    waveWeight: 0.2,
    priorityWeight: 0.8,
    boostThreshold: 70
  },

  // Discovery: Surface exciting matches users might miss
  discovery: {
    mode: 'discovery',
    waveWeight: 0.5,
    priorityWeight: 0.5,
    boostThreshold: 50
  },

  // Excitement: Pure wave score ranking
  excitement: {
    mode: 'waves',
    waveWeight: 1.0,
    priorityWeight: 0.0,
    boostThreshold: 0
  }
}

/**
 * Sort matches using smart algorithm
 */
export function sortMatchesSmart(
  matches: MatchForSorting[],
  config: SmartSortConfig
): MatchForSorting[] {
  return matches
    .map(match => ({
      ...match,
      smartScore: calculateSmartSortScore(match, config)
    }))
    .sort((a, b) => {
      // Primary: Smart score (descending)
      if (a.smartScore !== b.smartScore) {
        return b.smartScore - a.smartScore
      }
      
      // Secondary: Time (ascending - earlier matches first)
      return new Date(a.starting_at).getTime() - new Date(b.starting_at).getTime()
    })
}