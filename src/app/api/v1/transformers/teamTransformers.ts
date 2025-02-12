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

interface RawTeam {
  id: number
  name: string
  activeseasons?: any[] | null
  seasons?: any[] | null
  upcoming?: any[] | null
  latest?: any[] | null
  players?: any[] | null
  coaches?: any[] | null
  statistics?: any | null
}

export function transformTeamOverview(rawTeam: RawTeam): TeamOverviewResponse {
  if (!rawTeam?.id || !rawTeam?.name) {
    throw new Error('Invalid team data: missing required fields')
  }

  return {
    id: String(rawTeam.id),
    name: rawTeam.name,
  }
}

export function transformTeamTable(rawTeam: RawTeam): TeamTableResponse {
  const transformSeason = (season: any): TeamSeason => {
    if (!season?.id || !season?.name) {
      throw new Error('Invalid season data: missing required fields')
    }
    return {
      id: String(season.id),
      name: season.name,
    }
  }

  return {
    activeseasons: Array.isArray(rawTeam?.activeseasons)
      ? rawTeam.activeseasons.map(transformSeason)
      : [],
    seasons: Array.isArray(rawTeam?.seasons) ? rawTeam.seasons.map(transformSeason) : [],
  }
}

export function transformFixture(rawFixture: any): TeamFixture {
  if (!rawFixture?.id || !rawFixture?.date) {
    throw new Error('Invalid fixture data: missing required fields')
  }

  return {
    id: String(rawFixture.id),
    date: rawFixture.date,
  }
}

export function transformTeamFixtures(rawTeam: RawTeam): TeamFixturesResponse {
  return Array.isArray(rawTeam?.upcoming) ? rawTeam.upcoming.map(transformFixture) : []
}

export function transformTeamResults(rawTeam: RawTeam): TeamResultsResponse {
  return Array.isArray(rawTeam?.latest) ? rawTeam.latest.map(transformFixture) : []
}

export function transformPlayer(rawPlayer: any): TeamPlayer {
  if (!rawPlayer?.id) {
    throw new Error('Invalid player data: missing ID')
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
    'Unknown Player'

  // Create the base player object with required fields
  const player: TeamPlayer = {
    id: String(rawPlayer.id),
    name: resolvedName,
  }

  // Add optional fields only if they exist and are valid
  if (typeof rawPlayer.position_id === 'number') {
    player.position_id = rawPlayer.position_id
  }
  if (typeof rawPlayer.detailed_position_id === 'number') {
    player.detailed_position_id = rawPlayer.detailed_position_id
  }
  if (typeof rawPlayer.common_name === 'string') {
    player.common_name = rawPlayer.common_name
  }
  if (typeof rawPlayer.firstname === 'string') {
    player.firstname = rawPlayer.firstname
  }
  if (typeof rawPlayer.lastname === 'string') {
    player.lastname = rawPlayer.lastname
  }
  if (typeof rawPlayer.display_name === 'string') {
    player.display_name = rawPlayer.display_name
  }
  if (typeof rawPlayer.image_path === 'string') {
    player.image_path = rawPlayer.image_path
  }

  return player
}

export function transformCoach(rawCoach: any): TeamCoach {
  if (!rawCoach?.id || !rawCoach?.name) {
    throw new Error('Invalid coach data: missing required fields')
  }

  return {
    id: String(rawCoach.id),
    name: rawCoach.name,
  }
}

export function transformTeamSquad(rawTeam: RawTeam): TeamSquadResponse {
  return {
    players: Array.isArray(rawTeam?.players)
      ? rawTeam.players
          .map((p) => {
            try {
              return transformPlayer(p)
            } catch (error) {
              console.error('Error transforming player:', error)
              return null
            }
          })
          .filter((p): p is TeamPlayer => p !== null)
      : [],
    coaches: Array.isArray(rawTeam?.coaches)
      ? rawTeam.coaches
          .map((c) => {
            try {
              return transformCoach(c)
            } catch (error) {
              console.error('Error transforming coach:', error)
              return null
            }
          })
          .filter((c): c is TeamCoach => c !== null)
      : [],
  }
}

export function transformTeamStats(rawTeam: RawTeam): TeamStatsResponse {
  return rawTeam?.statistics || {}
}
