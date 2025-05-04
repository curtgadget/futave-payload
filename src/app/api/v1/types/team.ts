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
  id: string
  name: string
  // Add other coach fields here
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

export type TeamOverviewResponse = TeamBase & {
  squad: TeamSquadResponse
  table: TeamTableResponse
  fixtures: TeamFixturesResponse
  results: TeamResultsResponse
  stats: TeamStatsResponse
}

export type PaginationMetadata = {
  totalDocs: number
  totalPages: number
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number | null
  prevPage: number | null
  nextPageUrl: string | null
  prevPageUrl: string | null
}

export type TeamFixturesResponse = {
  docs: TeamFixture[]
  pagination: PaginationMetadata
  nextMatch: TeamFixture | null
}

export type TeamResultsResponse = TeamFixture[]
export type TeamSquadResponse = {
  players: TeamSquadByPosition
  coaches: TeamCoach[]
}
export type TeamStatsResponse = TeamStatistics

export type TabDataFetcher = {
  getOverview: (teamId: string) => Promise<TeamOverviewResponse>
  getTable: (teamId: string) => Promise<TeamTableResponse>
  getFixtures: (teamId: string, page?: number, limit?: number) => Promise<TeamFixturesResponse>
  getResults: (teamId: string) => Promise<TeamResultsResponse>
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
      totalPages: number
    }
  }
}

// Data fetcher type for teams list
export type TeamListDataFetcher = {
  getTeams: (options: {
    page: number
    limit: number
    leagueId?: string
    countryId?: string
    search?: string
    season?: string
  }) => Promise<TeamsListResponse>
}
