export type TeamTab = 'overview' | 'table' | 'fixtures' | 'results' | 'squad' | 'stats'

export type TeamBase = {
  id: string
  name: string
  season_map?: { id: string; name: string }[]
  // Add other base team fields here
}

export type TeamSeason = {
  id: string
  name: string
}

// New standings types
export type StandingTableRow = {
  position: number
  team_id: number // This is mapped from participant_id in the transformer
  team_name: string // May need to be derived from other fields
  team_logo_path?: string // Team logo image URL from participant.image_path
  points: number
  played: number
  won: number
  draw: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  form?: string
  current_streak?: string
  clean_sheets?: number
  failed_to_score?: number
  qualification_status?: {
    type: string // e.g., 'champions_league', 'europa_league', 'relegation', 'promotion', etc.
    name: string // Human-readable name e.g., "Champions League Qualification"
    color?: string // Optional color for UI display
  }
  // Add comment about the mapping from Sportmonks API
  // team_id is mapped from participant_id in the API
  // team_name might need to be derived from related data
}

export type StandingTable = {
  id: number
  name: string
  type: string
  stage_id: number | null
  stage_name: string | null
  group_id: number | null
  group_name: string | null
  standings: StandingTableRow[]
}

export type StandingsData = {
  id: number
  name: string
  type: string
  league_id: number
  season_id: number
  stage_id: number | null
  stage_name: string | null
  standings: StandingTable[]
}

export type TeamTableResponse = Record<string, StandingsData> // Map of seasonId -> standings data

export type PositionGroup = 'goalkeepers' | 'defenders' | 'midfielders' | 'forwards'

export type TeamSquadByPosition = {
  [key in PositionGroup]: TeamPlayer[]
}

export type TeamSquadBase = {
  players: TeamPlayer[]
  coaches: TeamCoach[]
}

export type TeamPlayer = {
  id: string
  name: string
  position_id?: number
  detailed_position_id?: number
  position_name?: string // User-friendly position name from metadata
  detailed_position_name?: string // User-friendly detailed position name from metadata
  common_name?: string
  firstname?: string
  lastname?: string
  display_name?: string
  image_path?: string
  nationality_id?: number
  nationality_name?: string
  nationality_image_path?: string
  nationality_fifa_name?: string
  captain?: boolean
  jersey_number?: number
  // Add other player fields here
}

export type TeamCoach = {
  id: number
  name: string
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  gender?: string
  image?: string
  country_id?: number
  nationality_id?: number
}

export type PlayerSeasonStats = {
  player_id: string
  name: string
  position?: string
  position_id?: number
  jersey_number?: number
  image_path?: string
  appearances: number
  minutes_played: number
  goals?: number
  assists?: number
  clean_sheets?: number
  shots?: {
    total: number
    on_target: number
  }
  passes?: {
    total: number
    accuracy: number
  }
  cards?: {
    yellow: number
    red: number
  }
  rating?: number
}

export type TeamSeasonStats = {
  // Team performance stats
  matches_played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  clean_sheets?: number
  failed_to_score?: number
  avg_goals_scored?: number
  avg_goals_conceded?: number

  // Additional team stats
  yellow_cards?: number
  red_cards?: number
  fouls?: number
  possession?: number

  // Match patterns
  home_record?: {
    wins: number
    draws: number
    losses: number
    goals_for: number
    goals_against: number
  }
  away_record?: {
    wins: number
    draws: number
    losses: number
    goals_for: number
    goals_against: number
  }
}

export type TopStatCategory =
  | 'goals'
  | 'assists'
  | 'minutes_played'
  | 'cards'
  | 'rating'
  | 'goal_contributions'
  | 'appearances'
  | 'squad_numbers'

export type TopPlayerStatItem = {
  player_id: string
  name: string
  value: number
}

export type TopPlayersStat = {
  category: TopStatCategory
  players: TopPlayerStatItem[]
}

export type TeamStatistics = {
  player_stats: PlayerSeasonStats[]
  team_stats: TeamSeasonStats
  season_id: number
  seasons: TeamSeason[] // Available seasons for dropdown selection
  top_stats: TopPlayersStat[] // Top performing players in different categories
}

export type TeamFixture = {
  id: string
  starting_at: string
  state: {
    id: number
    state: string
    name: string
    short_name: string
  }
  league: {
    id: number
    name: string
    short_code: string | null
    image_path: string | null
  }
  season: {
    id: number
    name: string
  }
  participants: Array<{
    id: number
    name: string
    short_code: string | null
    image_path: string | null
    meta: {
      location: 'home' | 'away'
      winner: boolean | null
      position: number | null
    }
  }>
  scores: Array<{
    id: number
    type_id: number
    participant_id: number
    score: {
      goals: number
      participant: 'home' | 'away'
    }
    description: string
  }>
  final_score: {
    home: number
    away: number
  }
}


export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  type: string
  // Standard pagination
  hasMorePages: boolean
  hasPreviousPages: boolean
  nextPage: string | null
  previousPage: string | null
  // Temporal navigation (UX-friendly)
  hasNewer: boolean
  hasOlder: boolean
  newerUrl: string | null
  olderUrl: string | null
}

// Minimal fixture type for UI (Fotmob-style)
export type MinimalTeamFixture = {
  id: string | number
  starting_at: string
  starting_at_timestamp: number
  name: string
  league: {
    id: number
    name: string
    short_code?: string | null
    image_path?: string | null
  } | null
  season: {
    id: number
    name: string
  } | null
  participants: Array<{
    id: number
    name: string
    short_code?: string | null
    image_path?: string | null
    meta?: {
      location?: string | null
    }
  }>
  final_score?: {
    home: number
    away: number
  } | null
  state?: {
    id: number
    name: string
    short_name?: string | null
  } | null
}

// Minimal next match type for UI card
export type MinimalNextMatch = {
  starting_at: string
  league: { id: number; name: string }
  home_team: { id: number; name: string; image_path?: string | null }
  away_team: { id: number; name: string; image_path?: string | null }
  home_position?: number | null
  away_position?: number | null
  home_goals_per_match?: number | null
  away_goals_per_match?: number | null
  home_goals_conceded_per_match?: number | null
  away_goals_conceded_per_match?: number | null
}

export type TeamFixturesResponse<T = TeamFixture, N = T> = {
  docs: T[]
  meta: {
    pagination: Pagination
  }
  nextMatch: N | null
}

export type TeamSquadResponse = {
  players: TeamSquadByPosition
  coaches: TeamCoach[]
}

export type TeamStatsResponse = TeamStatistics

export type TabDataFetcher = {
  getTable: (teamId: string) => Promise<TeamTableResponse>
  getFixtures: (
    teamId: string,
    options?: {
      page?: number
      limit?: number
      type?: 'all' | 'past' | 'upcoming'
      includeNextMatch?: boolean
    },
  ) => Promise<TeamFixturesResponse<MinimalTeamFixture, MinimalNextMatch>>
  getSquad: (teamId: string) => Promise<TeamSquadResponse>
  getStats: (
    teamId: string,
    seasonId?: string,
    includeAllPlayers?: boolean,
  ) => Promise<TeamStatsResponse>
}

// Response type for teams list
export type TeamsListResponse = {
  data: TeamBase[]
  meta: {
    pagination: {
      page: number
      limit: number
      totalItems: number
      pageCount: number
    }
  }
}

// Data fetcher type for teams list
export type TeamListDataFetcher = {
  getTeams: (options: {
    page: number
    limit: number
    countryId?: string
    search?: string
  }) => Promise<TeamsListResponse>
}

// New streamlined overview types
export type TeamFormMatch = {
  id: string
  result: 'W' | 'L' | 'D'
  final_score: {
    home: number
    away: number
  }
  opponent: {
    id: number
    name: string
    image_path?: string | null
  }
  home_away: 'home' | 'away'
  starting_at: string
}

export type TeamCurrentPosition = {
  position: number
  points: number
  played: number
  goal_difference: number
  form: string[] // Array of recent results: ['W', 'L', 'D', 'W', 'D']
  qualification_status?: {
    type: string
    name: string
    color?: string
  }
}

export type TopStatPlayer = {
  player_id: string
  name: string
  image_path?: string | null
  value: number
  position?: string
}

export type TeamOverviewStats = {
  top_rated: TopStatPlayer[]
  top_scorers: TopStatPlayer[]
  top_assists: TopStatPlayer[]
}

export type TeamOverviewCompact = {
  id: string
  name: string
  season_id: number
  season_name: string
  form: TeamFormMatch[] // Last 5 matches
  next_match: MinimalNextMatch | null
  current_position: TeamCurrentPosition | null
  stats: TeamOverviewStats
  recent_fixtures: MinimalTeamFixture[] // Last 3 completed matches
}
