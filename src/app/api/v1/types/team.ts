import type { PayloadRequest } from 'payload'

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

export type TeamPlayer = {
  id: string
  name: string
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
  players: TeamPlayer[]
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
