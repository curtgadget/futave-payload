export type TeamTab = 'overview' | 'table' | 'fixtures' | 'results' | 'squad' | 'stats'

export type TeamBase = {
  id: string
  name: string
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

export type TeamStatistics = {
  // Add statistics fields here
}

export type TeamFixture = {
  id: string
  date: string
  // Add other fixture fields here
}

export type TeamOverviewResponse = TeamBase & {
  squad: TeamSquadResponse
  table: TeamTableResponse
  fixtures: TeamFixturesResponse
  results: TeamResultsResponse
  stats: TeamStatsResponse
}

export type TeamFixturesResponse = TeamFixture[]
export type TeamResultsResponse = TeamFixture[]
export type TeamSquadResponse = {
  players: TeamSquadByPosition
  coaches: TeamCoach[]
}
export type TeamStatsResponse = TeamStatistics

export type TabDataFetcher = {
  getOverview: (teamId: string) => Promise<TeamOverviewResponse>
  getTable: (teamId: string) => Promise<TeamTableResponse>
  getFixtures: (teamId: string) => Promise<TeamFixturesResponse>
  getResults: (teamId: string) => Promise<TeamResultsResponse>
  getSquad: (teamId: string) => Promise<TeamSquadResponse>
  getStats: (teamId: string) => Promise<TeamStatsResponse>
}
