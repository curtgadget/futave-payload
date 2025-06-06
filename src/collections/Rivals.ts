import type { CollectionConfig } from 'payload'

export const Rivals: CollectionConfig = {
  slug: 'rivals',
  fields: [
    {
      name: 'id',
      type: 'number',
      required: true,
    },
    {
      name: 'team_id',
      type: 'number',
      required: true,
    },
    {
      name: 'rival_team_id',
      type: 'number',
      required: true,
    },
    {
      name: 'team',
      type: 'json',
      required: false,
    },
    {
      name: 'rival',
      type: 'json',
      required: false,
    },
    {
      name: 'h2h_summary',
      type: 'group',
      fields: [
        {
          name: 'total_matches',
          type: 'number',
        },
        {
          name: 'last_5',
          type: 'group',
          fields: [
            { name: 'team_wins', type: 'number' },
            { name: 'rival_wins', type: 'number' },
            { name: 'draws', type: 'number' },
          ]
        },
        {
          name: 'overall',
          type: 'group', 
          fields: [
            { name: 'team_wins', type: 'number' },
            { name: 'rival_wins', type: 'number' },
            { name: 'draws', type: 'number' },
          ]
        },
        {
          name: 'last_meeting',
          type: 'group',
          fields: [
            { name: 'date', type: 'date' },
            { name: 'result', type: 'text' }, // "team_won", "rival_won", "draw"
            { name: 'score', type: 'text' }, // "2-1"
            { name: 'venue_id', type: 'number' },
          ]
        },
        {
          name: 'drama_score',
          type: 'number', // 0-10 based on competitiveness
        },
        {
          name: 'avg_goals_per_match',
          type: 'number',
        }
      ]
    },
    {
      name: 'h2h_updated_at',
      type: 'date',
    }
  ],
}