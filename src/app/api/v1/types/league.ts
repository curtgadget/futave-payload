export type LeagueTab = 'overview' | 'standings' | 'teams' | 'seasons'

export type LeagueBase = {
  id: string
  name: string
  logo?: string
  country?: {
    id: string
    name: string
    flag?: string
  }
  current_season?: {
    id: string
    name: string
  }
}

export type LeagueSeason = {
  id: string
  name: string
  start_date?: string
  end_date?: string
  current?: boolean
  coverage?: {
    fixtures: boolean
    standings: boolean
    players: boolean
    top_scorers: boolean
    predictions: boolean
    odds: boolean
  }
}

export type LeagueTeam = {
  id: string
  name: string
  logo?: string
  venue_name?: string
  founded?: number
}

// Standing types (reusing from team.ts if available in the codebase)
export type StandingTableRow = {
  position: number
  team_id: number
  team_name: string
  team_logo_path?: string
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
    type: string
    name: string
    color?: string
  }
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

// Response types for each endpoint
export type LeagueOverviewResponse = LeagueBase & {
  seasons?: LeagueSeason[]
}

export type LeagueStandingsResponse = LeagueBase & {
  season_id: string
  standings: StandingsData
}

export type LeagueTeamsResponse = LeagueBase & {
  teams: LeagueTeam[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export type LeagueSeasonsResponse = LeagueBase & {
  seasons: LeagueSeason[]
}

// League list response
export type LeaguesListResponse = {
  data: LeagueBase[]
  meta: {
    pagination: {
      page: number
      limit: number
      totalItems: number
      totalPages: number
    }
  }
}

// Data fetcher type for league operations
export type LeagueDataFetcher = {
  getOverview: (leagueId: string) => Promise<LeagueOverviewResponse>
  getStandings: (leagueId: string, seasonId?: string) => Promise<LeagueStandingsResponse>
  getTeams: (leagueId: string, page?: number, limit?: number) => Promise<LeagueTeamsResponse>
  getSeasons: (leagueId: string) => Promise<LeagueSeasonsResponse>
}

// Data fetcher type for leagues list
export type LeagueListDataFetcher = {
  getLeagues: (options: {
    page: number
    limit: number
    countryId?: string
    search?: string
    season?: string
  }) => Promise<LeaguesListResponse>
}
