export type TeamTab = 'overview' | 'table' | 'fixtures' | 'results' | 'squad' | 'stats'

export type TeamBase = {
  id: string
  name: string
  // Add other base team fields here
}

export type TeamSeason = {
  id: string
  name: string
  // Add other season fields here
}

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

export type TeamOverviewResponse = TeamBase
export type TeamTableResponse = {
  activeseasons: TeamSeason[]
  seasons: TeamSeason[]
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
