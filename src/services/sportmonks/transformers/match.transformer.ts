import { SportmonksMatch } from '../client/types'

export type TransformedMatch = {
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
  participants: unknown | null
  scores: unknown | null
  venue: unknown | null
  state: unknown | null
  league: unknown | null
  season: unknown | null
  stage: unknown | null
  round: unknown | null
  group: unknown | null
  aggregate: unknown | null
  statistics: unknown | null
  events: unknown | null
  periods: unknown | null
  lineups: unknown | null
  sidelined: unknown | null
  coaches: unknown | null
  metadata: unknown | null
  weatherreport: unknown | null
}

export function transformMatch(match: SportmonksMatch): TransformedMatch {
  return {
    id: match.id,
    sport_id: match.sport_id,
    league_id: match.league_id,
    season_id: match.season_id,
    stage_id: match.stage_id,
    group_id: match.group_id,
    aggregate_id: match.aggregate_id,
    round_id: match.round_id,
    state_id: match.state_id,
    venue_id: match.venue_id,
    name: match.name,
    starting_at: match.starting_at,
    result_info: match.result_info,
    leg: match.leg,
    details: match.details,
    length: match.length,
    participants: match.participants || null,
    scores: match.scores || null,
    venue: match.venue || null,
    state: match.state || null,
    league: match.league || null,
    season: match.season || null,
    stage: match.stage || null,
    round: match.round || null,
    group: match.group || null,
    aggregate: match.aggregate || null,
    statistics: match.statistics || null,
    events: match.events || null,
    periods: match.periods || null,
    lineups: match.lineups || null,
    sidelined: match.sidelined || null,
    coaches: match.coaches || null,
    metadata: match.metadata || null,
    weatherreport: match.weatherreport || null,
  }
}
