import type {
  TeamBase,
  TeamSeason,
  TeamFixture,
  TeamPlayer,
  TeamCoach,
  TeamStatistics,
  TeamOverviewResponse,
  TeamTableResponse,
  TeamFixturesResponse,
  TeamResultsResponse,
  TeamSquadResponse,
  TeamStatsResponse,
} from '../types/team'

export function transformTeamOverview(rawTeam: any): TeamOverviewResponse {
  return {
    id: String(rawTeam.id),
    name: rawTeam.name,
    // Add additional transformations as needed
  }
}

export function transformTeamTable(rawTeam: any): TeamTableResponse {
  const transformSeason = (season: any): TeamSeason => ({
    id: String(season.id),
    name: season.name,
    // Add additional season transformations
  })

  return {
    activeseasons: Array.isArray(rawTeam?.activeseasons)
      ? rawTeam.activeseasons.map(transformSeason)
      : [],
    seasons: Array.isArray(rawTeam?.seasons) ? rawTeam.seasons.map(transformSeason) : [],
  }
}

export function transformFixture(rawFixture: any): TeamFixture {
  return {
    id: String(rawFixture.id),
    date: rawFixture.date,
    // Add additional fixture transformations
  }
}

export function transformTeamFixtures(rawTeam: any): TeamFixturesResponse {
  return Array.isArray(rawTeam?.upcoming) ? rawTeam.upcoming.map(transformFixture) : []
}

export function transformTeamResults(rawTeam: any): TeamResultsResponse {
  return Array.isArray(rawTeam?.latest) ? rawTeam.latest.map(transformFixture) : []
}

export function transformPlayer(rawPlayer: any): TeamPlayer {
  if (!rawPlayer) {
    return {
      id: '',
      name: '',
    }
  }

  // Resolve the name based on priority:
  // 1. display_name
  // 2. name
  // 3. firstname + lastname
  const resolvedName =
    rawPlayer.display_name ||
    rawPlayer.name ||
    (rawPlayer.firstname && rawPlayer.lastname
      ? `${rawPlayer.firstname} ${rawPlayer.lastname}`
      : '') ||
    ''

  // Create the base player object with required fields
  const player: TeamPlayer = {
    id: String(rawPlayer.id),
    name: resolvedName,
  }

  // Add optional fields only if they exist
  if (rawPlayer.position_id !== undefined) {
    player.position_id = rawPlayer.position_id
  }
  if (rawPlayer.detailed_position_id !== undefined) {
    player.detailed_position_id = rawPlayer.detailed_position_id
  }
  if (rawPlayer.common_name) {
    player.common_name = rawPlayer.common_name
  }
  if (rawPlayer.firstname) {
    player.firstname = rawPlayer.firstname
  }
  if (rawPlayer.lastname) {
    player.lastname = rawPlayer.lastname
  }
  if (rawPlayer.display_name) {
    player.display_name = rawPlayer.display_name
  }

  return player
}

export function transformCoach(rawCoach: any): TeamCoach {
  return {
    id: String(rawCoach.id),
    name: rawCoach.name,
    // Add additional coach transformations
  }
}

export function transformTeamSquad(rawTeam: any): TeamSquadResponse {
  return {
    players: Array.isArray(rawTeam?.players) ? rawTeam.players.map(transformPlayer) : [],
    coaches: Array.isArray(rawTeam?.coaches) ? rawTeam.coaches.map(transformCoach) : [],
  }
}

export function transformTeamStats(rawTeam: any): TeamStatsResponse {
  return rawTeam?.statistics || {}
  // Add statistics transformations when we have the structure
}
