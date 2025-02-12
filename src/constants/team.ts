import type { PositionGroup } from '@/app/api/v1/types/team'

export const POSITION_GROUP_MAP: Record<number, PositionGroup> = {
  24: 'goalkeepers', // Goalkeeper
  25: 'defenders', // Defender
  26: 'midfielders', // Midfielder
  27: 'forwards', // Forward/Striker
}

export function getPositionGroup(positionId: number | undefined): PositionGroup {
  if (!positionId) return 'midfielders' // Default to midfielders if no position
  return POSITION_GROUP_MAP[positionId] || 'midfielders'
}
