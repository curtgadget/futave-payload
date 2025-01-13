import { SportmonksTeam } from '../client/types'

export interface TransformedTeam {
  id: number
  name: string
  logo_path: string
  country_id: number
  coaches: unknown | null
  players: unknown | null
  latest: unknown | null
  upcoming: unknown | null
  seasons: unknown | null
  activeseasons: unknown | null
  statistics: unknown | null
  trophies: unknown | null
  socials: unknown | null
  rankings: unknown | null
}

export function transformTeam(team: SportmonksTeam): TransformedTeam {
  return {
    id: team.id,
    name: team.name,
    logo_path: team.image_path,
    country_id: team.country_id,
    coaches: team.coaches || null,
    players: team.players || null,
    latest: team.latest || null,
    upcoming: team.upcoming || null,
    seasons: team.seasons || null,
    activeseasons: team.activeseasons || null,
    statistics: team.statistics || null,
    trophies: team.trophies || null,
    socials: team.socials || null,
    rankings: team.rankings || null,
  }
}

export function validateTeam(team: SportmonksTeam): void {
  const requiredFields = ['id', 'name', 'image_path', 'country_id']
  const missingFields = requiredFields.filter((field) => !(field in team))

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in team data: ${missingFields.join(', ')}`)
  }

  if (typeof team.id !== 'number' || team.id <= 0) {
    throw new Error('Invalid team ID')
  }

  if (typeof team.name !== 'string' || team.name.trim() === '') {
    throw new Error('Invalid team name')
  }

  if (typeof team.image_path !== 'string') {
    throw new Error('Invalid team logo path')
  }

  if (typeof team.country_id !== 'number' || team.country_id <= 0) {
    throw new Error('Invalid country ID')
  }
}
