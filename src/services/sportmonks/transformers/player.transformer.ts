import { SportmonksPlayer } from '../client/types/player'

export interface TransformedPlayer {
  id: number
  sport_id: number
  country_id: number
  nationality_id: number
  position_id: number
  detailed_position_id: number | null
  name: string
  common_name: string | null
  firstname: string | null
  lastname: string | null
  display_name: string | null
  image_path: string | null
  height: number | null
  weight: number | null
  date_of_birth: string | null
  gender: string | null
  teams: unknown | null
  statistics: unknown | null
  lineups: unknown | null
  transfers: unknown | null
  pendingtransfers: unknown | null
  trophies: unknown | null
  latest: unknown | null
  metadata: unknown | null
}

export function transformPlayer(player: SportmonksPlayer): TransformedPlayer {
  return {
    id: player.id,
    sport_id: player.sport_id,
    country_id: player.country_id,
    nationality_id: player.nationality_id,
    position_id: player.position_id,
    detailed_position_id: player.detailed_position_id,
    name: player.name,
    common_name: player.common_name,
    firstname: player.firstname,
    lastname: player.lastname,
    display_name: player.display_name,
    image_path: player.image_path,
    height: player.height,
    weight: player.weight,
    date_of_birth: player.date_of_birth,
    gender: player.gender,
    teams: player.teams || null,
    statistics: player.statistics || null,
    lineups: player.lineups || null,
    transfers: player.transfers || null,
    pendingtransfers: player.pendingtransfers || null,
    trophies: player.trophies || null,
    latest: player.latest || null,
    metadata: player.metadata || null,
  }
}
