import { SportmonksLeague } from '../client/types'

export type TransformedLeague = {
  id: number
  name: string
  logo_path: string
  country_id: number
  league_type: string
  stages: unknown | null
  latest: unknown | null
  upcoming: unknown | null
  inplay: unknown | null
  today: unknown | null
  currentseason: unknown | null
  seasons: unknown | null
  standings: Record<number, unknown> | null
}

export function transformLeague(league: SportmonksLeague): TransformedLeague {
  return {
    id: league.id,
    name: league.name,
    logo_path: league.image_path,
    country_id: league.country_id,
    league_type: league.type,
    stages: league.stages || null,
    latest: league.latest || null,
    upcoming: league.upcoming || null,
    inplay: league.inplay || null,
    today: league.today || null,
    currentseason: league.currentseason || null,
    seasons: league.seasons || null,
    standings: (league as any).standings || null,
  }
}

export function validateLeague(league: SportmonksLeague): void {
  const requiredFields = ['id', 'name', 'image_path', 'country_id', 'type']
  const missingFields = requiredFields.filter((field) => !(field in league))

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in league data: ${missingFields.join(', ')}`)
  }

  if (typeof league.id !== 'number' || league.id <= 0) {
    throw new Error('Invalid league ID')
  }

  if (typeof league.name !== 'string' || league.name.trim() === '') {
    throw new Error('Invalid league name')
  }

  if (typeof league.image_path !== 'string') {
    throw new Error('Invalid league logo path')
  }

  if (typeof league.country_id !== 'number' || league.country_id <= 0) {
    throw new Error('Invalid country ID')
  }

  if (typeof league.type !== 'string' || league.type.trim() === '') {
    throw new Error('Invalid league type')
  }
}
