import type { CollectionConfig } from 'payload'

export enum MatchState {
  NOT_STARTED = 1,
  FIRST_HALF = 2,
  HALF_TIME = 3,
  REGULAR_TIME_FINISHED = 4,
  FULL_TIME = 5,
  EXTRA_TIME = 6,
  FINISHED_AFTER_ET = 7,
  FULL_TIME_PENALTIES = 8,
  PENALTY_SHOOTOUT = 9,
  POSTPONED = 10,
  SUSPENDED = 11,
  CANCELLED = 12,
  TO_BE_ANNOUNCED = 13,
  WALK_OVER = 14,
  ABANDONED = 15,
  DELAYED = 16,
  AWARDED = 17,
  INTERRUPTED = 18,
  AWAITING_UPDATES = 19,
  DELETED = 20,
  EXTRA_TIME_BREAK = 21,
  SECOND_HALF = 22,
  PENALTIES_BREAK = 25,
  PENDING = 26,
}

export const getMatchStateString = (stateId: MatchState): string => {
  switch (stateId) {
    case MatchState.NOT_STARTED:
      return 'NS'
    case MatchState.FIRST_HALF:
      return 'INPLAY_1ST_HALF'
    case MatchState.SECOND_HALF:
      return 'INPLAY_2ND_HALF'
    case MatchState.HALF_TIME:
      return 'HT'
    case MatchState.REGULAR_TIME_FINISHED:
      return 'BREAK'
    case MatchState.FULL_TIME:
      return 'FT'
    case MatchState.EXTRA_TIME:
      return 'INPLAY_ET'
    case MatchState.EXTRA_TIME_BREAK:
      return 'EXTRA_TIME_BREAK'
    case MatchState.FINISHED_AFTER_ET:
      return 'AET'
    case MatchState.PENALTIES_BREAK:
      return 'PEN_BREAK'
    case MatchState.PENALTY_SHOOTOUT:
      return 'INPLAY_PENALTIES'
    case MatchState.FULL_TIME_PENALTIES:
      return 'FT_PEN'
    case MatchState.POSTPONED:
      return 'POSTPONED'
    case MatchState.SUSPENDED:
      return 'SUSPENDED'
    case MatchState.CANCELLED:
      return 'CANCELLED'
    case MatchState.TO_BE_ANNOUNCED:
      return 'TBA'
    case MatchState.WALK_OVER:
      return 'WO'
    case MatchState.ABANDONED:
      return 'ABANDONED'
    case MatchState.DELAYED:
      return 'DELAYED'
    case MatchState.AWARDED:
      return 'AWARDED'
    case MatchState.INTERRUPTED:
      return 'INTERRUPTED'
    case MatchState.AWAITING_UPDATES:
      return 'AWAITING_UPDATES'
    case MatchState.DELETED:
      return 'DELETED'
    case MatchState.PENDING:
      return 'PENDING'
    default:
      throw new Error(`Unknown match state ID: ${stateId}`)
  }
}

export const Matches: CollectionConfig = {
  slug: 'matches',
  fields: [
    {
      name: 'id',
      type: 'number',
      required: true,
    },
    {
      name: 'sport_id',
      type: 'number',
      required: true,
    },
    {
      name: 'league_id',
      type: 'relationship',
      relationTo: 'leagues',
      required: true,
    },
    {
      name: 'season_id',
      type: 'number',
      required: true,
    },
    {
      name: 'stage_id',
      type: 'number',
      required: true,
    },
    {
      name: 'state_id',
      type: 'number',
      required: true,
    },
    {
      name: 'starting_at',
      type: 'date',
      required: true,
    },
    // JSON fields for includes
    {
      name: 'participants',
      type: 'json',
      required: false,
    },
    {
      name: 'scores',
      type: 'json',
      required: false,
    },
    {
      name: 'venue',
      type: 'json',
      required: false,
    },
    {
      name: 'state',
      type: 'json',
      required: false,
    },
    {
      name: 'league',
      type: 'json',
      required: false,
    },
    {
      name: 'season',
      type: 'json',
      required: false,
    },
    {
      name: 'stage',
      type: 'json',
      required: false,
    },
    {
      name: 'round',
      type: 'json',
      required: false,
    },
    {
      name: 'group',
      type: 'json',
      required: false,
    },
    {
      name: 'aggregate',
      type: 'json',
      required: false,
    },
    {
      name: 'statistics',
      type: 'json',
      required: false,
    },
    {
      name: 'events',
      type: 'json',
      required: false,
    },
    {
      name: 'periods',
      type: 'json',
      required: false,
    },
    {
      name: 'lineups',
      type: 'json',
      required: false,
    },
    {
      name: 'sidelined',
      type: 'json',
      required: false,
    },
    {
      name: 'coaches',
      type: 'json',
      required: false,
    },
    {
      name: 'metadata',
      type: 'json',
      required: false,
    },
    {
      name: 'weatherreport',
      type: 'json',
      required: false,
    },
    // Wave Detector fields
    {
      name: 'wave_score',
      type: 'group',
      fields: [
        {
          name: 'total',
          type: 'number',
          min: 0,
          max: 100,
          admin: {
            description: 'Total wave score (0-100)',
          },
        },
        {
          name: 'tier',
          type: 'select',
          options: [
            { label: 'S-Tier (80-100)', value: 'S' },
            { label: 'A-Tier (60-79)', value: 'A' },
            { label: 'B-Tier (40-59)', value: 'B' },
            { label: 'C-Tier (0-39)', value: 'C' },
          ],
          admin: {
            description: 'Wave score tier classification',
          },
        },
        {
          name: 'factors',
          type: 'group',
          fields: [
            {
              name: 'rivalry',
              type: 'number',
              min: 0,
              max: 30,
              admin: {
                description: 'Rivalry factor score (0-30)',
              },
            },
            {
              name: 'position',
              type: 'number',
              min: 0,
              max: 20,
              admin: {
                description: 'Position proximity score (0-20)',
              },
            },
            {
              name: 'zone',
              type: 'number',
              min: 0,
              max: 20,
              admin: {
                description: 'Zone importance score (0-20)',
              },
            },
            {
              name: 'form',
              type: 'number',
              min: 0,
              max: 15,
              admin: {
                description: 'Form differential score (0-15)',
              },
            },
            {
              name: 'h2h',
              type: 'number',
              min: 0,
              max: 10,
              admin: {
                description: 'Head-to-head drama score (0-10)',
              },
            },
            {
              name: 'timing',
              type: 'number',
              min: 0,
              max: 5,
              admin: {
                description: 'Timing bonus score (0-5)',
              },
            },
          ],
        },
        {
          name: 'calculated_at',
          type: 'date',
          admin: {
            description: 'When the wave score was calculated',
          },
        },
        {
          name: 'expires_at',
          type: 'date',
          admin: {
            description: 'When the wave score expires (typically match start time)',
          },
        },
      ],
    },
  ],
}
