export interface SportmonksConfig {
  apiKey: string
  baseUrl?: string
}

export interface FetchParams {
  include?: string
  filters?: Record<string, string | number>
  page?: number
}

export interface SportmonksResponse<T> {
  data: T[]
  pagination?: {
    count: number
    per_page: number
    current_page: number
    next_page?: number
    has_more: boolean
  }
}

export interface SportmonksLeague {
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

export interface SportmonksTeam {
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

export interface SportmonksMatch {
  id: number
  name: string
  league_id: number
  season_id: number
  stage_id?: number
  round_id?: number
  group_id?: number
  aggregate_id?: number
  venue_id?: number
  referee_id?: number
  localteam_id: number
  visitorteam_id: number
  participants?: unknown
  scores?: unknown
}
