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
      name: 'state_id',
      type: 'number',
      required: true,
    },
    {
      name: 'venue_id',
      type: 'number',
      required: false,
    },
    {
      name: 'home_team_id',
      type: 'number',
      required: true,
    },
    {
      name: 'away_team_id',
      type: 'number',
      required: true,
    },
    {
      name: 'score',
      type: 'group',
      fields: [
        {
          name: 'home_score',
          type: 'number',
          required: true,
          defaultValue: 0,
        },
        {
          name: 'away_score',
          type: 'number',
          required: true,
          defaultValue: 0,
        },
      ],
    },
  ],
}
