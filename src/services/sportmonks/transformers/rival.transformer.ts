import { SportmonksRival } from '../client/types'

export type TransformedRival = {
  id: number
  team_id: number
  rival_team_id: number
  team: unknown | null
  rival: unknown | null
}

export async function transformRival(rival: SportmonksRival): Promise<TransformedRival> {
  // Handle both rival_team_id and rival_id from the API
  const rivalTeamId = (rival as any).rival_id || rival.rival_team_id
  
  const transformed = {
    id: rival.id,
    team_id: rival.team_id,
    rival_team_id: rivalTeamId,
    team: rival.team || null,
    rival: rival.rival || null,
  }
  
  return transformed
}

export async function validateRival(rival: SportmonksRival): Promise<void> {
  const requiredFields = ['id', 'team_id']
  const missingFields = requiredFields.filter((field) => !(field in rival))

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in rival data: ${missingFields.join(', ')}`)
  }

  // Check for either rival_id or rival_team_id
  const rivalTeamId = (rival as any).rival_id || rival.rival_team_id
  if (!rivalTeamId) {
    throw new Error('Missing rival_id or rival_team_id in rival data')
  }

  if (typeof rival.id !== 'number' || rival.id <= 0) {
    throw new Error('Invalid rival ID')
  }

  if (typeof rival.team_id !== 'number' || rival.team_id <= 0) {
    throw new Error('Invalid team ID')
  }

  if (typeof rivalTeamId !== 'number' || rivalTeamId <= 0) {
    throw new Error('Invalid rival team ID')
  }

  if (rival.team_id === rivalTeamId) {
    throw new Error('Team cannot be rival to itself')
  }
}