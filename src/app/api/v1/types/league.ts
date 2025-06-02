// Import types from team types since they're reusable
import type { MinimalTeamFixture, MinimalNextMatch, Pagination, PlayerSeasonStats, TopPlayersStat } from './team'

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

export type LeagueStandingsResponse = Record<string, StandingsData> // Map of seasonId -> standings data, same as TeamTableResponse

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

// Response type for league matches (similar to TeamFixturesResponse)
export type LeagueMatchesResponse = {
  docs: MinimalTeamFixture[]
  meta: {
    pagination: Pagination
  }
  nextMatch: MinimalNextMatch | null
}

// Enhanced league player stats for specific categories
export type LeaguePlayerStatCategory = {
  category: 'goals' | 'assists' | 'minutes' | 'goals_assists'
  label: string
  players: Array<{
    player_id: string
    name: string
    team_id?: string
    team_name?: string
    team_logo?: string
    position_id?: number
    position_name?: string
    jersey_number?: number | null
    image_path?: string | null
    value: number
    appearances?: number
    rank: number
  }>
}

// Enhanced team stats for league standings/performance
export type LeagueTeamStatCategory = {
  category: 'attack' | 'defense' | 'discipline' | 'performance'
  label: string
  teams: Array<{
    team_id: string
    team_name: string
    team_logo?: string
    value: number
    rank: number
    additional_stats?: Record<string, number>
  }>
}

// Enhanced response type for league stats with tabbed structure
export type LeagueStatsResponse = {
  id: string
  name: string
  season_id: number
  season_name?: string
  overview: {
    teams_count: number
    total_players: number
    total_goals: number
    total_assists: number
    total_yellow_cards: number
    total_red_cards: number
    total_appearances: number
    total_minutes_played: number
    average_goals_per_player: number
    average_assists_per_player: number
  }
  player_stats: {
    top_scorers: LeaguePlayerStatCategory
    top_assists: LeaguePlayerStatCategory
    most_minutes: LeaguePlayerStatCategory
    top_goals_assists: LeaguePlayerStatCategory
  }
  team_stats: {
    attack: LeagueTeamStatCategory
    defense: LeagueTeamStatCategory
    discipline: LeagueTeamStatCategory
    performance: LeagueTeamStatCategory
  }
  // Keep legacy fields for backward compatibility
  top_stats?: TopPlayersStat[]
  legacy_player_stats?: PlayerSeasonStats[]
}

// Data fetcher type for league operations
export type LeagueDataFetcher = {
  getOverview: (leagueId: string) => Promise<LeagueOverviewResponse>
  getStandings: (leagueId: string, seasonId?: string) => Promise<LeagueStandingsResponse>
  getTeams: (leagueId: string, page?: number, limit?: number) => Promise<LeagueTeamsResponse>
  getMatches: (leagueId: string, page?: number, limit?: number, seasonId?: string, type?: 'all' | 'past' | 'upcoming' | 'auto', includeNextMatch?: boolean) => Promise<LeagueMatchesResponse>
  getStats: (leagueId: string, seasonId?: string) => Promise<LeagueStatsResponse>
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
