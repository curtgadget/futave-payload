import type { 
  SportmonksMatch, 
  SportmonksTeam, 
  SportmonksPlayer,
  SportmonksCountry,
  SportmonksLeague,
  SportmonksCoach
} from '../../client/types/football'
import type { SportmonksMetadataType } from '../../client/types/core'

/**
 * Test helper utilities for creating mock Sportmonks API data
 */

// Base mock data factory functions
export const createMockCountry = (overrides?: Partial<SportmonksCountry>): SportmonksCountry => ({
  id: 1,
  continent_id: 1,
  name: 'Test Country',
  image_path: 'https://example.com/flag.png',
  ...overrides,
})

export const createMockLeague = (overrides?: Partial<SportmonksLeague>): SportmonksLeague => ({
  id: 1,
  country_id: 1,
  name: 'Test League',
  image_path: 'https://example.com/league.png',
  type: 'league',
  ...overrides,
})

export const createMockTeam = (overrides?: Partial<SportmonksTeam>): SportmonksTeam => ({
  id: 1,
  name: 'Test Team',
  image_path: 'https://example.com/logo.png',
  country_id: 1,
  coaches: null,
  players: null,
  latest: null,
  upcoming: null,
  seasons: null,
  activeseasons: null,
  statistics: null,
  trophies: null,
  socials: null,
  rankings: null,
  standings: null,
  ...overrides,
})

export const createMockPlayer = (overrides?: Partial<SportmonksPlayer>): SportmonksPlayer => ({
  id: 1,
  sport_id: 1,
  country_id: 1,
  nationality_id: 1,
  position_id: 1,
  detailed_position_id: 1,
  name: 'Test Player',
  common_name: 'Test',
  firstname: 'Test',
  lastname: 'Player',
  display_name: 'T. Player',
  image_path: 'https://example.com/player.png',
  height: 180,
  weight: 75,
  date_of_birth: '1990-01-01',
  gender: 'male',
  teams: null,
  statistics: null,
  lineups: null,
  transfers: null,
  pendingtransfers: null,
  trophies: null,
  latest: null,
  metadata: null,
  nationality: undefined,
  ...overrides,
})

export const createMockCoach = (overrides?: Partial<SportmonksCoach>): SportmonksCoach => ({
  id: 1,
  sport_id: 1,
  country_id: 1,
  nationality_id: 1,
  name: 'Test Coach',
  display_name: 'T. Coach',
  firstname: 'Test',
  lastname: 'Coach',
  date_of_birth: '1970-01-01',
  gender: 'male',
  image_path: 'https://example.com/coach.png',
  country: { id: 1, name: 'Test Country' },
  nationality: { id: 1, name: 'Test Country' },
  teams: [],
  statistics: null,
  ...overrides,
})

export const createMockMatch = (overrides?: Partial<SportmonksMatch>): SportmonksMatch => ({
  id: 1,
  sport_id: 1,
  league_id: 1,
  season_id: 1,
  stage_id: 1,
  group_id: null,
  aggregate_id: null,
  round_id: 1,
  state_id: 1,
  venue_id: 1,
  name: 'Test Match',
  starting_at: '2024-02-05T20:00:00.000000Z',
  result_info: 'Test Result',
  leg: 'Final',
  details: 'Match Details',
  length: 90,
  participants: null,
  scores: null,
  venue: null,
  state: null,
  league: null,
  season: null,
  stage: null,
  round: null,
  group: null,
  aggregate: null,
  statistics: null,
  events: null,
  periods: null,
  lineups: null,
  metadata: null,
  weatherreport: null,
  ...overrides,
})

export const createMockMetadataType = (overrides?: Partial<SportmonksMetadataType>): SportmonksMetadataType => ({
  id: 1,
  parent_id: null,
  name: 'Test Metadata Type',
  code: 'test_code',
  developer_name: 'test_metadata_type',
  model_type: 'Test Model',
  group: 'test_group',
  description: 'Test metadata type description',
  ...overrides,
})

// Helper functions for creating data with relationships
export const createMockPlayerWithNationality = (
  playerOverrides?: Partial<SportmonksPlayer>,
  nationalityOverrides?: Partial<SportmonksCountry>
): SportmonksPlayer => {
  const nationality = createMockCountry(nationalityOverrides)
  return createMockPlayer({
    nationality_id: nationality.id,
    nationality,
    ...playerOverrides,
  })
}

export const createMockTeamWithSeasons = (
  teamOverrides?: Partial<SportmonksTeam>,
  seasonCount: number = 2
): SportmonksTeam => {
  const seasons = Array.from({ length: seasonCount }, (_, index) => ({
    id: index + 1,
    name: `2023-${2024 + index}`,
    league_id: 1,
    starting_at: `202${3 + index}-08-01T00:00:00.000000Z`,
  }))

  return createMockTeam({
    seasons,
    ...teamOverrides,
  })
}

// Utility functions for testing edge cases
export const createMinimalMockData = {
  country: (): SportmonksCountry => ({
    id: 1,
    continent_id: 1,
    name: 'Minimal Country',
    image_path: 'minimal.png',
  }),
  
  league: (): SportmonksLeague => ({
    id: 1,
    country_id: 1,
    name: 'Minimal League',
    image_path: 'minimal.png',
    type: 'league',
  }),
  
  team: (): SportmonksTeam => ({
    id: 1,
    name: 'Minimal Team',
    image_path: 'minimal.png',
    country_id: 1,
    coaches: null,
    players: null,
    latest: null,
    upcoming: null,
    seasons: null,
    activeseasons: null,
    statistics: null,
    trophies: null,
    socials: null,
    rankings: null,
    standings: null,
  }),
  
  player: (): SportmonksPlayer => ({
    id: 1,
    sport_id: 1,
    detailed_position_id: 1,
    name: 'Minimal Player',
    common_name: null,
    firstname: null,
    lastname: null,
    display_name: null,
    image_path: null,
    height: null,
    weight: null,
    date_of_birth: null,
    gender: null,
    teams: null,
    statistics: null,
    lineups: null,
    transfers: null,
    pendingtransfers: null,
    trophies: null,
    latest: null,
    metadata: null,
    nationality: undefined,
  }),
}