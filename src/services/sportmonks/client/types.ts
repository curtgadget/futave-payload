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
