export interface SportmonksPlayer {
  id: number
  sport_id: number
  country_id: number
  nationality_id: number
  position_id?: number
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
  teams?: unknown
  statistics?: unknown
  lineups?: unknown
  transfers?: unknown
  pendingtransfers?: unknown
  trophies?: unknown
  latest?: unknown
  metadata?: unknown
}
