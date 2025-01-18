export type SportmonksCountry = {
  id: number
  continent_id: number
  name: string
  official_name: string
  fifa_name?: string
  iso2?: string
  iso3?: string
  latitude?: string
  longitude?: string
  geonameid?: number
  border?: string[]
  image_path?: string
}

export type SportmonksLeague = {
  id: number
  name: string
  image_path: string
  country_id: number
  type: string
  stages?: unknown
  latest?: unknown
  upcoming?: unknown
  inplay?: unknown
  today?: unknown
  currentseason?: unknown
  seasons?: unknown
}

export type SportmonksTeam = {
  id: number
  name: string
  image_path: string
  country_id: number
  coaches?: unknown
  players?: unknown
  latest?: unknown
  upcoming?: unknown
  seasons?: unknown
  activeseasons?: unknown
  statistics?: unknown
  trophies?: unknown
  socials?: unknown
  rankings?: unknown
}

export type SportmonksPlayer = {
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

export type SportmonksMatch = {
  id: number
  sport_id: number
  league_id: number
  season_id: number
  stage_id: number
  group_id: number | null
  aggregate_id: number | null
  round_id: number | null
  state_id: number
  venue_id: number | null
  name: string | null
  starting_at: string | null
  result_info: string | null
  leg: string
  details: string | null
  length: number | null
  participants?: unknown
  scores?: unknown
  venue?: unknown
  state?: unknown
  league?: unknown
  season?: unknown
  stage?: unknown
  round?: unknown
  group?: unknown
  aggregate?: unknown
  statistics?: unknown
  events?: unknown
  periods?: unknown
  lineups?: unknown
  metadata?: unknown
  weatherreport?: unknown
}
